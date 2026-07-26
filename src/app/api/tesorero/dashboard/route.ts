import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session || session.nombre_rol !== "Tesorero") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [
    cuentasRes,
    saldoTotalRes,
    pagosMesRes,
    pagosPendientesRes,
    ultimosPagosRes,
    cobrosMesRes,
  ] = await Promise.all([
    query<{
      id_cuenta_bancaria: number;
      nombre_cuenta: string;
      tipo: string;
      numero_cuenta: string | null;
      saldo_actual: string;
    }>(
      `SELECT id_cuenta_bancaria, nombre_cuenta, tipo, numero_cuenta, saldo_actual::text
       FROM cuentas_bancarias WHERE activo = TRUE ORDER BY nombre_cuenta`
    ),
    query<{ total: string }>(
      `SELECT COALESCE(SUM(saldo_actual), 0)::text AS total
       FROM cuentas_bancarias WHERE activo = TRUE`
    ),
    query<{ cantidad: string; total: string }>(
      `SELECT COUNT(*)::text AS cantidad, COALESCE(SUM(pg.monto), 0)::text AS total
       FROM pagos pg WHERE pg.fecha_pago >= date_trunc('month', NOW())`
    ),
    query<{ cantidad: string; total: string }>(
      `SELECT COUNT(*)::text AS cantidad, COALESCE(SUM(monto), 0)::text AS total
       FROM solicitudes_pago WHERE estado = 'Aprobada'`
    ),
    query<{
      id_pago: number;
      monto: string;
      metodo: string;
      numero_operacion: string | null;
      fecha_pago: string;
      razon_social: string | null;
      numero_factura: string | null;
    }>(
      `SELECT pg.id_pago, pg.monto::text, pg.metodo, pg.numero_operacion,
              pg.fecha_pago::text, pr.razon_social, f.numero_factura
       FROM pagos pg
       JOIN solicitudes_pago sp ON pg.id_solicitud = sp.id_solicitud
       JOIN facturas f ON sp.id_factura = f.id_factura
       LEFT JOIN proveedores pr ON f.id_proveedor = pr.id_proveedor
       ORDER BY pg.fecha_pago DESC LIMIT 20`
    ),
    query<{ cantidad: string; total: string }>(
      `SELECT COUNT(*)::text AS cantidad, COALESCE(SUM(c.monto), 0)::text AS total
       FROM cobros c WHERE c.fecha_cobro >= date_trunc('month', NOW())`
    ),
  ]);

  return NextResponse.json({
    cuentas: cuentasRes.rows.map((r) => ({
      id_cuenta_bancaria: r.id_cuenta_bancaria,
      nombre_cuenta: r.nombre_cuenta,
      tipo: r.tipo,
      numero_cuenta: r.numero_cuenta,
      saldo_actual: Number(r.saldo_actual),
    })),
    saldo_total: Number(saldoTotalRes.rows[0].total),
    pagos_mes: {
      cantidad: Number(pagosMesRes.rows[0].cantidad),
      total: Number(pagosMesRes.rows[0].total),
    },
    pagos_pendientes: {
      cantidad: Number(pagosPendientesRes.rows[0].cantidad),
      total: Number(pagosPendientesRes.rows[0].total),
    },
    ultimos_pagos: ultimosPagosRes.rows.map((r) => ({
      id_pago: r.id_pago,
      monto: Number(r.monto),
      metodo: r.metodo,
      numero_operacion: r.numero_operacion,
      fecha_pago: r.fecha_pago,
      razon_social: r.razon_social,
      numero_factura: r.numero_factura,
    })),
    cobros_mes: {
      cantidad: Number(cobrosMesRes.rows[0].cantidad),
      total: Number(cobrosMesRes.rows[0].total),
    },
  });
}
