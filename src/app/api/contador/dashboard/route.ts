import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

async function obtenerPeriodoActivo(): Promise<number | null> {
  const periodo = await query<{ id_periodo: number }>(
    `SELECT id_periodo FROM periodos_fiscales
     WHERE estado = 'Abierto' AND CURRENT_DATE BETWEEN fecha_inicio AND fecha_fin
     ORDER BY fecha_fin DESC LIMIT 1`
  );
  if (periodo.rows.length > 0) return periodo.rows[0].id_periodo;

  const fallback = await query<{ id_periodo: number }>(
    `SELECT id_periodo FROM periodos_fiscales
     WHERE estado = 'Abierto' ORDER BY fecha_fin DESC LIMIT 1`
  );
  if (fallback.rows.length > 0) return fallback.rows[0].id_periodo;

  const anyOne = await query<{ id_periodo: number }>(
    `SELECT id_periodo FROM periodos_fiscales ORDER BY fecha_fin DESC LIMIT 1`
  );
  return anyOne.rows[0]?.id_periodo ?? null;
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session || session.nombre_rol !== "Contador") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const idPeriodo = await obtenerPeriodoActivo();

  const [
    cuentasPagarRes,
    cuentasCobrarRes,
    ejecucionCatRes,
    flujoCajaRes,
    solicitudesEstadoRes,
    facturasEstadoRes,
    pagosMesRes,
    cobrosMesRes,
  ] = await Promise.all([
    query<{ total: string }>(
      `SELECT COALESCE(SUM(f.monto), 0)::text AS total FROM facturas f
       WHERE f.tipo = 'Compra' AND f.estado NOT IN ('Pagada', 'Anulada')`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(f.monto), 0)::text AS total FROM facturas f
       WHERE f.tipo = 'Venta' AND f.estado NOT IN ('Cobrada', 'Anulada')`
    ),
    query<{
      nombre_categoria: string;
      tipo: string;
      asignado: string;
      ejecutado: string;
    }>(
      `SELECT c.nombre_categoria, c.tipo,
              COALESCE(SUM(pp.monto_asignado), 0)::text AS asignado,
              COALESCE(SUM(pp.monto_ejecutado), 0)::text AS ejecutado
       FROM partidas_presupuestarias pp
       JOIN presupuestos p ON pp.id_presupuesto = p.id_presupuesto
       JOIN categorias c ON pp.id_categoria = c.id_categoria
       WHERE p.estado = 'Aprobado'
       GROUP BY c.nombre_categoria, c.tipo`
    ),
    query<{
      nombre_cuenta: string;
      saldo: string;
      pagos_mes: string;
      cobros_mes: string;
    }>(
      `SELECT cb.nombre_cuenta, cb.saldo_actual::text AS saldo,
              COALESCE((SELECT SUM(pg.monto) FROM pagos pg
                JOIN solicitudes_pago sp ON pg.id_solicitud = sp.id_solicitud
                WHERE pg.id_cuenta_bancaria = cb.id_cuenta_bancaria
                  AND pg.fecha_pago >= date_trunc('month', NOW())), 0)::text AS pagos_mes,
              COALESCE((SELECT SUM(c2.monto) FROM cobros c2
                WHERE c2.id_cuenta_bancaria = cb.id_cuenta_bancaria
                  AND c2.fecha_cobro >= date_trunc('month', NOW())), 0)::text AS cobros_mes
       FROM cuentas_bancarias cb WHERE cb.activo = TRUE ORDER BY cb.nombre_cuenta`
    ),
    query<{ estado: string; cantidad: string; total: string }>(
      `SELECT estado, COUNT(*)::text AS cantidad, COALESCE(SUM(monto), 0)::text AS total
       FROM solicitudes_pago GROUP BY estado`
    ),
    query<{ tipo: string; estado: string; cantidad: string; total: string }>(
      `SELECT tipo, estado, COUNT(*)::text AS cantidad, COALESCE(SUM(monto), 0)::text AS total
       FROM facturas GROUP BY tipo, estado`
    ),
    query<{ cantidad: string; total: string }>(
      `SELECT COUNT(*)::text AS cantidad, COALESCE(SUM(monto), 0)::text AS total
       FROM pagos WHERE fecha_pago >= date_trunc('month', NOW())`
    ),
    query<{ cantidad: string; total: string }>(
      `SELECT COUNT(*)::text AS cantidad, COALESCE(SUM(monto), 0)::text AS total
       FROM cobros WHERE fecha_cobro >= date_trunc('month', NOW())`
    ),
  ]);

  return NextResponse.json({
    id_periodo: idPeriodo,
    cuentas_por_pagar: Number(cuentasPagarRes.rows[0].total),
    cuentas_por_cobrar: Number(cuentasCobrarRes.rows[0].total),
    ejecucion_presupuestaria: ejecucionCatRes.rows.map((r) => ({
      nombre_categoria: r.nombre_categoria,
      tipo: r.tipo,
      asignado: Number(r.asignado),
      ejecutado: Number(r.ejecutado),
    })),
    flujo_caja: flujoCajaRes.rows.map((r) => ({
      nombre_cuenta: r.nombre_cuenta,
      saldo: Number(r.saldo),
      pagos_mes: Number(r.pagos_mes),
      cobros_mes: Number(r.cobros_mes),
    })),
    solicitudes_por_estado: solicitudesEstadoRes.rows.map((r) => ({
      estado: r.estado,
      cantidad: Number(r.cantidad),
      total: Number(r.total),
    })),
    facturas_por_estado: facturasEstadoRes.rows.map((r) => ({
      tipo: r.tipo,
      estado: r.estado,
      cantidad: Number(r.cantidad),
      total: Number(r.total),
    })),
    pagos_mes: {
      cantidad: Number(pagosMesRes.rows[0].cantidad),
      total: Number(pagosMesRes.rows[0].total),
    },
    cobros_mes: {
      cantidad: Number(cobrosMesRes.rows[0].cantidad),
      total: Number(cobrosMesRes.rows[0].total),
    },
  });
}
