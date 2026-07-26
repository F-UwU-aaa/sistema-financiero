import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import type { ObservacionAuditoria } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "auditoria", "leer");
  if (denial) return denial;

  const { searchParams } = new URL(request.url);
  const modulo = searchParams.get("modulo");
  const estado = searchParams.get("estado");
  const tipo_transaccion = searchParams.get("tipo_transaccion");
  const fecha_inicio = searchParams.get("fecha_inicio");
  const fecha_fin = searchParams.get("fecha_fin");

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (modulo) { conditions.push(`o.modulo_afectado = $${idx++}`); params.push(modulo); }
  if (estado) { conditions.push(`o.estado = $${idx++}`); params.push(estado); }
  if (tipo_transaccion) { conditions.push(`o.tipo_transaccion = $${idx++}`); params.push(tipo_transaccion); }
  if (fecha_inicio) { conditions.push(`o.fecha_registro >= $${idx++}`); params.push(fecha_inicio); }
  if (fecha_fin) { conditions.push(`o.fecha_registro <= ($${idx++}::date + INTERVAL '1 day')`); params.push(fecha_fin); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await query<ObservacionAuditoria>(
    `SELECT o.id_observacion, o.modulo_afectado, o.referencia_id, o.tipo_transaccion,
            o.motivo, o.estado, o.id_usuario_auditor, o.respuesta_gerente,
            o.fecha_registro::text, o.fecha_cierre::text,
            ua.nombre_completo AS nombre_auditor,
            ug.nombre_completo AS nombre_gerente
     FROM observaciones_auditoria o
     JOIN usuarios ua ON o.id_usuario_auditor = ua.id_usuario
     LEFT JOIN usuarios ug ON o.id_usuario_aprueba = ug.id_usuario
     ${where}
     ORDER BY o.fecha_registro DESC`,
    params
  );

  return NextResponse.json({ observaciones: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "auditoria", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { modulo_afectado, referencia_id, tipo_transaccion, motivo } = body;

    if (!modulo_afectado || !motivo) {
      return NextResponse.json(
        { error: "modulo_afectado y motivo son requeridos" },
        { status: 400 }
      );
    }

    const result = await withTransaction(async (client) => {
      const ins = await client.query<ObservacionAuditoria>(
        `INSERT INTO observaciones_auditoria (modulo_afectado, referencia_id, tipo_transaccion, motivo, id_usuario_auditor)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [modulo_afectado, referencia_id || null, tipo_transaccion || null, motivo, session!.id_usuario]
      );
      const obs = ins.rows[0];

      const auditor = await client.query<{ nombre_completo: string }>(
        "SELECT nombre_completo FROM usuarios WHERE id_usuario = $1",
        [session!.id_usuario]
      );
      const nombreAuditor = auditor.rows[0]?.nombre_completo || "Auditor";

      const gerenteRows = await client.query<{ id_usuario: number }>(
        "SELECT id_usuario FROM usuarios WHERE id_rol = 2 AND activo = TRUE"
      );
      for (const g of gerenteRows.rows) {
        await client.query(
          `INSERT INTO notificaciones (id_usuario_destino, tipo_evento, mensaje)
           VALUES ($1, 'observacion_auditoria', $2)`,
          [g.id_usuario, `${nombreAuditor} registró una observación sobre ${modulo_afectado}: ${motivo.substring(0, 100)}`]
        );
      }

      if (modulo_afectado === "usuarios") {
        const adminRows = await client.query<{ id_usuario: number }>(
          "SELECT id_usuario FROM usuarios WHERE id_rol = 1 AND activo = TRUE"
        );
        for (const a of adminRows.rows) {
          await client.query(
            `INSERT INTO notificaciones (id_usuario_destino, tipo_evento, mensaje)
             VALUES ($1, 'observacion_auditoria', $2)`,
            [a.id_usuario, `[Acceso/Usuarios] ${nombreAuditor} registró una observación sobre usuarios: ${motivo.substring(0, 100)}`]
          );
        }
      }

      return obs;
    });

    return NextResponse.json(
      { mensaje: "Observación registrada", observacion: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear observación:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
