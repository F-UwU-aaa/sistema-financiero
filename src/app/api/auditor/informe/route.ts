import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";

interface InformeRow {
  modulo: string;
  tipo_transaccion: string | null;
  descripcion: string;
  monto: string | null;
  estado: string;
  fecha: string;
  nombre_registra: string;
  nombre_aprueba: string | null;
  nombre_ejecuta: string | null;
}

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "auditoria", "leer");
  if (denial) return denial;

  const { searchParams } = new URL(request.url);
  const periodo = searchParams.get("periodo");
  const usuario = searchParams.get("usuario");
  const modulo = searchParams.get("modulo");
  const tipo_transaccion = searchParams.get("tipo_transaccion");

  const UNION_ALL = `
    SELECT modulo, tipo_transaccion, descripcion, monto, estado, fecha,
           nombre_registra, nombre_aprueba, nombre_ejecuta FROM (
      SELECT 'Presupuestos'::text AS modulo,
             NULL::text AS tipo_transaccion,
             ('Presupuesto ' || a.nombre_area)::text AS descripcion,
             p.monto_total_aprobado::text AS monto,
             p.estado::text AS estado,
             p.fecha_creacion::text AS fecha,
             ue.nombre_completo AS nombre_registra,
             ua.nombre_completo AS nombre_aprueba,
             NULL::text AS nombre_ejecuta
      FROM presupuestos p
      JOIN areas_departamentos a ON p.id_area = a.id_area
      JOIN usuarios ue ON p.id_usuario_elabora = ue.id_usuario
      LEFT JOIN usuarios ua ON p.id_usuario_aprueba = ua.id_usuario

      UNION ALL

      SELECT 'Facturación'::text, f.tipo::text,
             ('Factura ' || f.numero_factura)::text,
             f.monto::text, f.estado::text, f.fecha_emision::text,
             ur.nombre_completo, NULL, NULL
      FROM facturas f
      JOIN usuarios ur ON f.id_usuario_registra = ur.id_usuario

      UNION ALL

      SELECT 'Solicitudes de Pago'::text, NULL::text,
             ('Solicitud #' || sp.id_solicitud)::text,
             sp.monto::text, sp.estado::text, sp.fecha_solicitud::text,
             us.nombre_completo, up.nombre_completo, NULL
      FROM solicitudes_pago sp
      JOIN usuarios us ON sp.id_usuario_solicita = us.id_usuario
      LEFT JOIN usuarios up ON sp.id_usuario_aprueba = up.id_usuario

      UNION ALL

      SELECT 'Pagos'::text, pg.metodo::text,
             ('Pago ' || COALESCE(pg.numero_operacion, pg.id_pago::text))::text,
             pg.monto::text, 'Ejecutada'::text, pg.fecha_pago::text,
             ue.nombre_completo, NULL, ue2.nombre_completo
      FROM pagos pg
      JOIN usuarios ue ON pg.id_usuario_ejecuta = ue.id_usuario
      JOIN usuarios ue2 ON pg.id_usuario_ejecuta = ue2.id_usuario

      UNION ALL

      SELECT 'Cobros'::text, NULL::text,
             ('Cobro #' || c.id_cobro)::text,
             c.monto::text, 'Cobrado'::text, c.fecha_cobro::text,
             ue.nombre_completo, NULL, ue2.nombre_completo
      FROM cobros c
      JOIN usuarios ue ON c.id_usuario_ejecuta = ue.id_usuario
      JOIN usuarios ue2 ON c.id_usuario_ejecuta = ue2.id_usuario
    ) sub
  `;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (modulo) { conditions.push(`modulo = $${idx++}`); params.push(modulo); }
  if (tipo_transaccion) { conditions.push(`tipo_transaccion = $${idx++}`); params.push(tipo_transaccion); }
  if (usuario) {
    conditions.push(`nombre_registra = (SELECT nombre_completo FROM usuarios WHERE id_usuario = $${idx})`);
    params.push(usuario);
    idx++;
  }
  if (periodo) {
    conditions.push(`fecha >= (SELECT fecha_inicio::text FROM periodos_fiscales WHERE id_periodo = $${idx})`);
    conditions.push(`fecha <= (SELECT (fecha_fin::date + INTERVAL '1 day')::text FROM periodos_fiscales WHERE id_periodo = $${idx})`);
    params.push(periodo);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `SELECT * FROM (${UNION_ALL}) sub ${where} ORDER BY fecha DESC LIMIT 200`;

  const result = await query<InformeRow>(sql, params);
  return NextResponse.json({ informe: result.rows });
}
