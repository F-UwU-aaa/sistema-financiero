import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import type { ObservacionAuditoria } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "auditoria", "leer");
  if (denial) return denial;

  const { id } = await params;

  const result = await query<ObservacionAuditoria>(
    `SELECT o.id_observacion, o.modulo_afectado, o.referencia_id, o.tipo_transaccion,
            o.motivo, o.estado, o.id_usuario_auditor, o.respuesta_gerente,
            o.fecha_registro::text, o.fecha_cierre::text,
            ua.nombre_completo AS nombre_auditor,
            ug.nombre_completo AS nombre_gerente
     FROM observaciones_auditoria o
     JOIN usuarios ua ON o.id_usuario_auditor = ua.id_usuario
     LEFT JOIN usuarios ug ON o.id_usuario_aprueba = ug.id_usuario
     WHERE o.id_observacion = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Observación no encontrada" }, { status: 404 });
  }

  return NextResponse.json({ observacion: result.rows[0] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "auditoria", "leer");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  try {
    const body = await request.json();
    const existing = await query<ObservacionAuditoria>(
      "SELECT * FROM observaciones_auditoria WHERE id_observacion = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Observación no encontrada" }, { status: 404 });
    }

    const obs = existing.rows[0];

    if (session!.nombre_rol === "Gerente Financiero") {
      if (!body.respuesta_gerente) {
        return NextResponse.json({ error: "respuesta_gerente es requerida" }, { status: 400 });
      }
      await query(
        `UPDATE observaciones_auditoria
         SET respuesta_gerente = $1, id_usuario_aprueba = $2,
             estado = 'En revisión'
         WHERE id_observacion = $3`,
        [body.respuesta_gerente, session!.id_usuario, id]
      );
    } else if (session!.nombre_rol === "Auditor") {
      if (!body.estado) {
        return NextResponse.json({ error: "estado es requerido" }, { status: 400 });
      }
      const validStates = ["En revisión", "Cerrada"];
      if (!validStates.includes(body.estado)) {
        return NextResponse.json({ error: `estado debe ser: ${validStates.join(", ")}` }, { status: 400 });
      }
      if (obs.estado === "Cerrada") {
        return NextResponse.json({ error: "No se puede modificar una observación cerrada" }, { status: 409 });
      }
      const fecha_cierre = body.estado === "Cerrada" ? "NOW()" : "NULL";
      await query(
        `UPDATE observaciones_auditoria
         SET estado = $1, fecha_cierre = ${fecha_cierre}
         WHERE id_observacion = $2`,
        [body.estado, id]
      );
    } else {
      return NextResponse.json({ error: "Sin permisos para modificar esta observación" }, { status: 403 });
    }

    return NextResponse.json({ mensaje: "Observación actualizada" });
  } catch (error) {
    console.error("Error al actualizar observación:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
