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
  if (!session || session.nombre_rol !== "Gerente Financiero") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const idPeriodo = await obtenerPeriodoActivo();

  const [
    ingresosRes,
    gastosRes,
    cuentasBancariasRes,
    cuentasCobrarRes,
    cuentasPagarRes,
    ejecucionAreaRes,
    solicitudesPendRes,
    proveedoresPendRes,
    clientesPendRes,
    facturasVencerRes,
    saldoCajaRes,
  ] = await Promise.all([
    query<{ total: string }>(
      `SELECT COALESCE(SUM(c.monto), 0)::text AS total FROM cobros c
       JOIN facturas f ON c.id_factura = f.id_factura
       WHERE f.tipo = 'Venta' AND f.estado != 'Anulada'`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(pg.monto), 0)::text AS total FROM pagos pg
       JOIN solicitudes_pago sp ON pg.id_solicitud = sp.id_solicitud
       WHERE sp.estado = 'Ejecutada'`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(saldo_actual), 0)::text AS total
       FROM cuentas_bancarias WHERE activo = TRUE`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(f.monto), 0)::text AS total FROM facturas f
       WHERE f.tipo = 'Venta' AND f.estado NOT IN ('Cobrada', 'Anulada')`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(f.monto), 0)::text AS total FROM facturas f
       WHERE f.tipo = 'Compra' AND f.estado NOT IN ('Pagada', 'Anulada')`
    ),
    query<{
      nombre_area: string;
      aprobado: string;
      propuesto: string;
      ejecutado: string;
    }>(
      `SELECT a.nombre_area,
              COALESCE(SUM(p.monto_total_aprobado), 0)::text AS aprobado,
              COALESCE(SUM(p.monto_total_propuesto), 0)::text AS propuesto,
              COALESCE(SUM(pe.total_ejecutado), 0)::text AS ejecutado
       FROM presupuestos p
       JOIN areas_departamentos a ON p.id_area = a.id_area
       LEFT JOIN (
         SELECT pp.id_presupuesto, SUM(pp.monto_ejecutado) AS total_ejecutado
         FROM partidas_presupuestarias pp GROUP BY pp.id_presupuesto
       ) pe ON pe.id_presupuesto = p.id_presupuesto
       WHERE p.estado = 'Aprobado'
       GROUP BY a.nombre_area`
    ),
    query<{ cantidad: string; total: string }>(
      `SELECT COUNT(*)::text AS cantidad, COALESCE(SUM(monto), 0)::text AS total
       FROM solicitudes_pago WHERE estado = 'Pendiente'`
    ),
    query<{ cantidad: string }>(
      `SELECT COUNT(*)::text AS cantidad FROM proveedores WHERE estado = 'Pendiente'`
    ),
    query<{ cantidad: string }>(
      `SELECT COUNT(*)::text AS cantidad FROM clientes WHERE estado = 'Pendiente'`
    ),
    query<{ cantidad: string }>(
      `SELECT COUNT(*)::text AS cantidad FROM facturas
       WHERE tipo = 'Compra' AND estado NOT IN ('Pagada', 'Anulada')
         AND fecha_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '7 days'`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(saldo_actual), 0)::text AS total
       FROM cuentas_bancarias WHERE activo = TRUE`
    ),
  ]);

  const ingresos = Number(ingresosRes.rows[0].total);
  const gastos = Number(gastosRes.rows[0].total);

  return NextResponse.json({
    id_periodo: idPeriodo,
    estado_resultados: {
      ingresos,
      gastos,
      resultado_neto: ingresos - gastos,
    },
    balance_general: {
      activo: {
        cuentas_bancarias: Number(cuentasBancariasRes.rows[0].total),
        cuentas_por_cobrar: Number(cuentasCobrarRes.rows[0].total),
        total:
          Number(cuentasBancariasRes.rows[0].total) +
          Number(cuentasCobrarRes.rows[0].total),
      },
      pasivo: {
        cuentas_por_pagar: Number(cuentasPagarRes.rows[0].total),
        total: Number(cuentasPagarRes.rows[0].total),
      },
      patrimonio:
        Number(cuentasBancariasRes.rows[0].total) +
        Number(cuentasCobrarRes.rows[0].total) -
        Number(cuentasPagarRes.rows[0].total),
    },
    ejecucion_presupuestaria: ejecucionAreaRes.rows.map((r) => ({
      nombre_area: r.nombre_area,
      aprobado: Number(r.aprobado),
      propuesto: Number(r.propuesto),
      ejecutado: Number(r.ejecutado),
    })),
    kpis: {
      solicitudes_pendientes: Number(solicitudesPendRes.rows[0].cantidad),
      monto_pendiente: Number(solicitudesPendRes.rows[0].total),
      proveedores_pendientes: Number(proveedoresPendRes.rows[0].cantidad),
      clientes_pendientes: Number(clientesPendRes.rows[0].cantidad),
      facturas_por_vencer: Number(facturasVencerRes.rows[0].cantidad),
      flujo_caja: Number(saldoCajaRes.rows[0].total),
    },
  });
}
