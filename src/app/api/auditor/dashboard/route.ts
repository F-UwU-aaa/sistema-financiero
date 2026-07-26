import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "auditoria", "leer");
  if (denial) return denial;

  const [totalRes, estadoRes, moduloRes, recientesRes] = await Promise.all([
    query<{ total: string }>(
      "SELECT COUNT(*)::text AS total FROM observaciones_auditoria"
    ),
    query<{ estado: string; cantidad: string }>(
      `SELECT estado, COUNT(*)::text AS cantidad
       FROM observaciones_auditoria GROUP BY estado`
    ),
    query<{ modulo: string; cantidad: string }>(
      `SELECT modulo_afectado AS modulo, COUNT(*)::text AS cantidad
       FROM observaciones_auditoria GROUP BY modulo_afectado ORDER BY cantidad DESC`
    ),
    query(
      `SELECT o.id_observacion, o.modulo_afectado, o.motivo, o.estado,
              o.fecha_registro::text, ua.nombre_completo AS nombre_auditor
       FROM observaciones_auditoria o
       JOIN usuarios ua ON o.id_usuario_auditor = ua.id_usuario
       ORDER BY o.fecha_registro DESC LIMIT 10`
    ),
  ]);

  return NextResponse.json({
    total: Number(totalRes.rows[0].total),
    por_estado: estadoRes.rows.map((r) => ({ estado: r.estado, cantidad: Number(r.cantidad) })),
    por_modulo: moduloRes.rows.map((r) => ({ modulo: r.modulo, cantidad: Number(r.cantidad) })),
    recientes: recientesRes.rows,
  });
}
