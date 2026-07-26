import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbierto } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";

interface PresupuestoRow {
  id_presupuesto: number;
  id_usuario_elabora: number;
  id_periodo: number;
  estado: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "presupuestos", "aprobar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<PresupuestoRow>(
    "SELECT id_presupuesto, id_usuario_elabora, id_periodo, estado FROM presupuestos WHERE id_presupuesto = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const presupuesto = existing.rows[0];

  if (presupuesto.estado !== "Pendiente") {
    return NextResponse.json(
      { error: "Solo se pueden aprobar o rechazar presupuestos pendientes" },
      { status: 409 }
    );
  }

  const cerrado = await verificarPeriodoAbierto(presupuesto.id_periodo);
  if (cerrado) return cerrado;

  if (presupuesto.id_usuario_elabora === session!.id_usuario) {
    return NextResponse.json(
      { error: "El aprobador no puede ser quien elaboró la propuesta" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { accion, motivo, monto_total_aprobado, partidas } = body;

    if (accion !== "aprobar" && accion !== "rechazar") {
      return NextResponse.json(
        { error: "accion debe ser 'aprobar' o 'rechazar'" },
        { status: 400 }
      );
    }

    if (accion === "aprobar") {
      if (monto_total_aprobado === undefined || monto_total_aprobado === null) {
        return NextResponse.json(
          { error: "monto_total_aprobado es requerido al aprobar" },
          { status: 400 }
        );
      }

      await withTransaction(async (client) => {
        await client.query(
          `UPDATE presupuestos
           SET estado = 'Aprobado',
               monto_total_aprobado = $1,
               id_usuario_aprueba = $2,
               fecha_resolucion = NOW()
           WHERE id_presupuesto = $3`,
          [monto_total_aprobado, session!.id_usuario, id]
        );

        if (Array.isArray(partidas)) {
          for (const p of partidas) {
            if (p.id_partida && p.monto_asignado !== undefined) {
              await client.query(
                "UPDATE partidas_presupuestarias SET monto_asignado = $1 WHERE id_partida = $2 AND id_presupuesto = $3",
                [p.monto_asignado, p.id_partida, id]
              );
            }
          }
        }

        await crearNotificacion(
          {
            id_usuario_destino: presupuesto.id_usuario_elabora,
            tipo_evento: "presupuesto_aprobado",
            mensaje: `Su presupuesto #${id} fue aprobado por ${session!.nombre_rol}`,
          },
          client
        );
      });

      return NextResponse.json({ mensaje: "Presupuesto aprobado" });
    } else {
      if (!motivo || motivo.trim() === "") {
        return NextResponse.json(
          { error: "El motivo de rechazo es requerido" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE presupuestos
         SET estado = 'Rechazado',
             motivo_rechazo = $1,
             id_usuario_aprueba = $2,
             fecha_resolucion = NOW()
         WHERE id_presupuesto = $3`,
        [motivo, session!.id_usuario, id]
      );

      await crearNotificacion({
        id_usuario_destino: presupuesto.id_usuario_elabora,
        tipo_evento: "presupuesto_rechazado",
        mensaje: `Su presupuesto #${id} fue rechazado por ${session!.nombre_rol}. Motivo: ${motivo}`,
      });

      return NextResponse.json({ mensaje: "Presupuesto rechazado" });
    }
  } catch (error) {
    console.error("Error al procesar aprobación:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
