import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

interface SolicitudRow {
  id_solicitud: number;
  id_factura: number;
  monto: string;
  estado: string;
  tipo_aprobacion: string;
}

interface PartidaRow {
  id_partida: number;
  monto_asignado: string;
  monto_ejecutado: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "pagos", "aprobar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<SolicitudRow>(
    "SELECT id_solicitud, id_factura, monto, estado, tipo_aprobacion FROM solicitudes_pago WHERE id_solicitud = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  }

  const solicitud = existing.rows[0];

  if (solicitud.estado !== "Pendiente") {
    return NextResponse.json(
      { error: `La solicitud está en estado '${solicitud.estado}', solo se pueden procesar las pendientes` },
      { status: 409 }
    );
  }

  if (solicitud.tipo_aprobacion !== "Manual") {
    return NextResponse.json(
      { error: "Solo se pueden aprobar manualmente las solicitudes con tipo_aprobacion='Manual'" },
      { status: 409 }
    );
  }

  try {
    const body = await request.json();
    const { accion, motivo } = body;

    if (accion !== "aprobar" && accion !== "rechazar") {
      return NextResponse.json(
        { error: "accion debe ser 'aprobar' o 'rechazar'" },
        { status: 400 }
      );
    }

    if (accion === "aprobar") {
      await withTransaction(async (client) => {
        const facturaResult = await client.query(
          "SELECT id_partida FROM facturas WHERE id_factura = $1",
          [solicitud.id_factura]
        );
        const idPartida = facturaResult.rows[0]?.id_partida;

        if (idPartida) {
          const partidaResult = await client.query<PartidaRow>(
            "SELECT id_partida, monto_asignado, monto_ejecutado FROM partidas_presupuestarias WHERE id_partida = $1",
            [idPartida]
          );

          if (partidaResult.rows.length > 0) {
            const partida = partidaResult.rows[0];
            const saldoDisponible = Number(partida.monto_asignado) - Number(partida.monto_ejecutado);
            if (saldoDisponible < Number(solicitud.monto)) {
              throw new Error(
                `Saldo insuficiente en la partida: disponible $${saldoDisponible.toLocaleString()}, solicitado $${Number(solicitud.monto).toLocaleString()}`
              );
            }

            await client.query(
              `UPDATE partidas_presupuestarias
               SET monto_ejecutado = monto_ejecutado + $1
               WHERE id_partida = $2`,
              [solicitud.monto, idPartida]
            );
          }
        }

        await client.query(
          `UPDATE solicitudes_pago
           SET estado = 'Aprobada',
               id_usuario_aprueba = $1,
               fecha_resolucion = NOW()
           WHERE id_solicitud = $2`,
          [session!.id_usuario, id]
        );
      });

      return NextResponse.json({ mensaje: "Solicitud aprobada" });
    } else {
      if (!motivo || motivo.trim() === "") {
        return NextResponse.json(
          { error: "El motivo de rechazo es requerido" },
          { status: 400 }
        );
      }

      await query(
        `UPDATE solicitudes_pago
         SET estado = 'Rechazada',
             motivo_rechazo = $1,
             id_usuario_aprueba = $2,
             fecha_resolucion = NOW()
         WHERE id_solicitud = $3`,
        [motivo.trim(), session!.id_usuario, id]
      );

      return NextResponse.json({ mensaje: "Solicitud rechazada" });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const isBusinessError = message.startsWith("Saldo insuficiente");
    console.error("Error al procesar solicitud:", error);
    return NextResponse.json(
      { error: message },
      { status: isBusinessError ? 409 : 500 }
    );
  }
}
