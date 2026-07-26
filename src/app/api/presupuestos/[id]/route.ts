import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbierto } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

interface PartidaRow {
  id_partida: number;
  id_presupuesto: number;
  id_categoria: number;
  monto_asignado: string;
  monto_ejecutado: string;
  nombre_categoria: string;
  tipo: string;
}

interface PresupuestoRow {
  id_presupuesto: number;
  id_area: number;
  id_periodo: number;
  monto_total_propuesto: string;
  monto_total_aprobado: string | null;
  estado: string;
  motivo_rechazo: string | null;
  id_usuario_elabora: number;
  id_usuario_aprueba: number | null;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  nombre_area: string;
  nombre_periodo: string;
  elabora_nombre: string;
  aprueba_nombre: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "presupuestos", "leer");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const result = await query<PresupuestoRow>(
    `SELECT p.*, a.nombre_area, f.nombre_periodo,
            u_elab.nombre_completo AS elabora_nombre,
            u_aprob.nombre_completo AS aprueba_nombre
     FROM presupuestos p
     JOIN areas_departamentos a ON p.id_area = a.id_area
     JOIN periodos_fiscales f ON p.id_periodo = f.id_periodo
     JOIN usuarios u_elab ON p.id_usuario_elabora = u_elab.id_usuario
     LEFT JOIN usuarios u_aprob ON p.id_usuario_aprueba = u_aprob.id_usuario
     WHERE p.id_presupuesto = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const presupuesto = result.rows[0];

  if (session!.nombre_rol === "Contador" && presupuesto.id_usuario_elabora !== session!.id_usuario) {
    return NextResponse.json({ error: "No tiene acceso a este presupuesto" }, { status: 403 });
  }

  const partidas = await query<PartidaRow>(
    `SELECT pp.*, c.nombre_categoria, c.tipo
     FROM partidas_presupuestarias pp
     JOIN categorias c ON pp.id_categoria = c.id_categoria
     WHERE pp.id_presupuesto = $1`,
    [id]
  );

  return NextResponse.json({ presupuesto, partidas: partidas.rows });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "presupuestos", "modificar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<PresupuestoRow>(
    "SELECT * FROM presupuestos WHERE id_presupuesto = $1", [id]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const presupuesto = existing.rows[0];

  if (presupuesto.id_usuario_elabora !== session!.id_usuario) {
    return NextResponse.json({ error: "Solo puede editar sus propias propuestas" }, { status: 403 });
  }

  if (presupuesto.estado !== "Borrador" && presupuesto.estado !== "Rechazado") {
    return NextResponse.json(
      { error: "Solo se pueden editar presupuestos en borrador o rechazados" },
      { status: 409 }
    );
  }

  const cerrado = await verificarPeriodoAbierto(presupuesto.id_periodo);
  if (cerrado) return cerrado;

  try {
    const body = await request.json();
    const { id_area, partidas, enviar } = body;

    if (!Array.isArray(partidas) || partidas.length === 0) {
      return NextResponse.json(
        { error: "partidas (array no vacío) es requerido" },
        { status: 400 }
      );
    }

    for (const p of partidas) {
      if (!p.id_categoria || p.monto_asignado === undefined) {
        return NextResponse.json(
          { error: "Cada partida debe tener id_categoria y monto_asignado" },
          { status: 400 }
        );
      }
    }

    const montoTotal = partidas.reduce(
      (sum: number, p: { monto_asignado: number }) => sum + Number(p.monto_asignado),
      0
    );

    const nuevoEstado = enviar ? "Pendiente" : "Borrador";

    await withTransaction(async (client) => {
      const sets = ["monto_total_propuesto = $1", "estado = $2", "motivo_rechazo = NULL"];
      const vals: unknown[] = [montoTotal, nuevoEstado];
      let idx = 3;

      if (id_area !== undefined) {
        sets.push(`id_area = $${idx++}`);
        vals.push(id_area);
      }

      vals.push(id);
      await client.query(
        `UPDATE presupuestos SET ${sets.join(", ")} WHERE id_presupuesto = $${idx}`,
        vals
      );

      await client.query("DELETE FROM partidas_presupuestarias WHERE id_presupuesto = $1", [id]);

      for (const p of partidas) {
        await client.query(
          "INSERT INTO partidas_presupuestarias (id_presupuesto, id_categoria, monto_asignado) VALUES ($1, $2, $3)",
          [id, p.id_categoria, p.monto_asignado]
        );
      }
    });

    return NextResponse.json({ mensaje: enviar ? "Propuesta enviada a aprobación" : "Borrador guardado" });
  } catch (error) {
    console.error("Error al actualizar presupuesto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
