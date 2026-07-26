import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { notificarRol } from "@/lib/notificaciones";
import type { PeriodoFiscalCompleto, BalanceResultado } from "@/types";

interface PeriodoRow {
  id_periodo: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  fecha_cierre: string | null;
  id_usuario_cierre: number | null;
  id_usuario_aprueba_cierre: number | null;
  motivo_reapertura: string | null;
  balance_generado: boolean;
  fecha_balance: string | null;
  id_usuario_genera_balance: number | null;
  balance_aprobado: boolean;
  id_usuario_aprueba_balance: number | null;
  fecha_aprobacion_balance: string | null;
  id_usuario_autoriza_reapertura: number | null;
  nombre_usuario_cierre: string | null;
  nombre_usuario_aprueba_balance: string | null;
  nombre_usuario_autoriza_reapertura: string | null;
}

interface SumRow {
  total: string;
}

interface AreaRow {
  nombre_area: string;
  aprobado: string;
  propuesto: string;
  ejecutado: string;
}

interface CategoriaRow {
  nombre_categoria: string;
  tipo: string;
  asignado: string;
  ejecutado: string;
}

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "balances", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const id_periodo = searchParams.get("id_periodo");

  if (!id_periodo) {
    return NextResponse.json({ error: "id_periodo es requerido" }, { status: 400 });
  }

  const periodoResult = await query<PeriodoRow>(
    `SELECT p.*,
            uc.nombre_completo AS nombre_usuario_cierre,
            ua.nombre_completo AS nombre_usuario_aprueba_balance,
            ur.nombre_completo AS nombre_usuario_autoriza_reapertura
     FROM periodos_fiscales p
     LEFT JOIN usuarios uc ON p.id_usuario_cierre = uc.id_usuario
     LEFT JOIN usuarios ua ON p.id_usuario_aprueba_balance = ua.id_usuario
     LEFT JOIN usuarios ur ON p.id_usuario_autoriza_reapertura = ur.id_usuario
     WHERE p.id_periodo = $1`,
    [id_periodo]
  );

  if (periodoResult.rows.length === 0) {
    return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
  }

  const periodo = periodoResult.rows[0];
  const fechaFin = periodo.fecha_fin;

  const [ingresosRes, gastosRes, bancosRes, cobrarRes, pagarRes, areaRes, catRes, propRes, ejecRes] =
    await Promise.all([
      query<SumRow>(
        `SELECT COALESCE(SUM(c.monto), 0)::text AS total
         FROM cobros c
         JOIN facturas f ON c.id_factura = f.id_factura
         WHERE f.tipo = 'Venta' AND f.estado != 'Anulada'
           AND c.fecha_cobro < ($1::date + INTERVAL '1 day')`,
        [fechaFin]
      ),
      query<SumRow>(
        `SELECT COALESCE(SUM(pg.monto), 0)::text AS total
         FROM pagos pg
         JOIN solicitudes_pago sp ON pg.id_solicitud = sp.id_solicitud
         WHERE sp.estado = 'Ejecutada'
           AND pg.fecha_pago < ($1::date + INTERVAL '1 day')`,
        [fechaFin]
      ),
      query<SumRow>(
        `SELECT COALESCE(
          SUM(cb.saldo_actual
            + COALESCE((SELECT SUM(pg2.monto) FROM pagos pg2 WHERE pg2.id_cuenta_bancaria = cb.id_cuenta_bancaria AND pg2.fecha_pago >= ($1::date + INTERVAL '1 day')), 0)
            - COALESCE((SELECT SUM(c2.monto) FROM cobros c2 WHERE c2.id_cuenta_bancaria = cb.id_cuenta_bancaria AND c2.fecha_cobro >= ($1::date + INTERVAL '1 day')), 0)
          ), 0)::text AS total
         FROM cuentas_bancarias cb
         WHERE cb.activo = TRUE`,
        [fechaFin]
      ),
      query<SumRow>(
        `SELECT COALESCE(SUM(f.monto), 0)::text AS total
         FROM facturas f
         WHERE f.tipo = 'Venta'
           AND f.fecha_emision <= $1::date
           AND f.estado != 'Anulada'
           AND NOT EXISTS (
             SELECT 1 FROM cobros c WHERE c.id_factura = f.id_factura AND c.fecha_cobro < ($1::date + INTERVAL '1 day')
           )`,
        [fechaFin]
      ),
      query<SumRow>(
        `SELECT COALESCE(SUM(f.monto), 0)::text AS total
         FROM facturas f
         WHERE f.tipo = 'Compra'
           AND f.fecha_emision <= $1::date
           AND f.estado != 'Anulada'
           AND NOT EXISTS (
             SELECT 1 FROM solicitudes_pago sp
             JOIN pagos pg ON sp.id_solicitud = pg.id_solicitud
             WHERE sp.id_factura = f.id_factura
               AND sp.estado = 'Ejecutada'
               AND pg.fecha_pago < ($1::date + INTERVAL '1 day')
           )`,
        [fechaFin]
      ),
      query<AreaRow>(
        `SELECT a.nombre_area,
                COALESCE(SUM(p.monto_total_aprobado), 0)::text AS aprobado,
                COALESCE(SUM(p.monto_total_propuesto), 0)::text AS propuesto,
                COALESCE(SUM(pe.total_ejecutado), 0)::text AS ejecutado
         FROM presupuestos p
         JOIN areas_departamentos a ON p.id_area = a.id_area
         LEFT JOIN (
           SELECT pp2.id_presupuesto, SUM(pp2.monto_ejecutado) AS total_ejecutado
           FROM partidas_presupuestarias pp2
           GROUP BY pp2.id_presupuesto
         ) pe ON pe.id_presupuesto = p.id_presupuesto
         WHERE p.id_periodo = $1 AND p.estado = 'Aprobado'
         GROUP BY a.nombre_area`,
        [id_periodo]
      ),
      query<CategoriaRow>(
        `SELECT c.nombre_categoria, c.tipo,
                COALESCE(SUM(pp.monto_asignado), 0)::text AS asignado,
                COALESCE(SUM(pp.monto_ejecutado), 0)::text AS ejecutado
         FROM partidas_presupuestarias pp
         JOIN presupuestos p ON pp.id_presupuesto = p.id_presupuesto
         JOIN categorias c ON pp.id_categoria = c.id_categoria
         WHERE p.id_periodo = $1 AND p.estado = 'Aprobado'
         GROUP BY c.nombre_categoria, c.tipo`,
        [id_periodo]
      ),
      query<SumRow>(
        `SELECT COALESCE(SUM(p.monto_total_aprobado), 0)::text AS total
         FROM presupuestos p WHERE p.id_periodo = $1 AND p.estado = 'Aprobado'`,
        [id_periodo]
      ),
      query<SumRow>(
        `SELECT COALESCE(SUM(p.monto_total_propuesto), 0)::text AS total
         FROM presupuestos p WHERE p.id_periodo = $1 AND p.estado = 'Aprobado'`,
        [id_periodo]
      ),
      query<SumRow>(
        `SELECT COALESCE(SUM(pe.total_ejecutado), 0)::text AS total
         FROM (
           SELECT pp2.id_presupuesto, SUM(pp2.monto_ejecutado) AS total_ejecutado
           FROM partidas_presupuestarias pp2
           GROUP BY pp2.id_presupuesto
         ) pe
         JOIN presupuestos p ON pe.id_presupuesto = p.id_presupuesto
         WHERE p.id_periodo = $1 AND p.estado = 'Aprobado'`,
        [id_periodo]
      ),
    ]);

  const ingresos = Number(ingresosRes.rows[0].total);
  const gastos = Number(gastosRes.rows[0].total);
  const bancos = Number(bancosRes.rows[0].total);
  const cuentasPorCobrar = Number(cobrarRes.rows[0].total);
  const cuentasPorPagar = Number(pagarRes.rows[0].total);

  const resultado: BalanceResultado = {
    periodo,
    estado_resultados: {
      ingresos,
      gastos,
      resultado_neto: ingresos - gastos,
    },
    balance_general: {
      activo: {
        cuentas_bancarias: bancos,
        cuentas_por_cobrar: cuentasPorCobrar,
        total: bancos + cuentasPorCobrar,
      },
      pasivo: {
        cuentas_por_pagar: cuentasPorPagar,
        total: cuentasPorPagar,
      },
      patrimonio: bancos + cuentasPorCobrar - cuentasPorPagar,
    },
    ejecucion_presupuestaria: {
      total_aprobado: Number(propRes.rows[0].total),
      total_propuesto: Number(propRes.rows[0].total),
      total_ejecutado: Number(ejecRes.rows[0].total),
      por_area: areaRes.rows.map((r) => ({
        nombre_area: r.nombre_area,
        aprobado: Number(r.aprobado),
        propuesto: Number(r.propuesto),
        ejecutado: Number(r.ejecutado),
      })),
      por_categoria: catRes.rows.map((r) => ({
        nombre_categoria: r.nombre_categoria,
        tipo: r.tipo,
        asignado: Number(r.asignado),
        ejecutado: Number(r.ejecutado),
      })),
    },
  };

  return NextResponse.json(resultado);
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "balances", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_periodo } = body;

    if (!id_periodo) {
      return NextResponse.json({ error: "id_periodo es requerido" }, { status: 400 });
    }

    const existing = await query<{ estado: string }>(
      "SELECT estado FROM periodos_fiscales WHERE id_periodo = $1",
      [id_periodo]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    }

    if (existing.rows[0].estado !== "Abierto") {
      return NextResponse.json(
        { error: "Solo se pueden generar balances para períodos abiertos" },
        { status: 409 }
      );
    }

    await query(
      `UPDATE periodos_fiscales
       SET balance_generado = TRUE,
           fecha_balance = NOW(),
           id_usuario_genera_balance = $1,
           balance_aprobado = FALSE,
           id_usuario_aprueba_balance = NULL,
           fecha_aprobacion_balance = NULL
       WHERE id_periodo = $2`,
      [session!.id_usuario, id_periodo]
    );

    await notificarRol(
      2,
      "balance_pendiente",
      `Balance del período #${id_periodo} generado por ${session!.nombre_rol}. Pendiente de aprobación.`
    );

    return NextResponse.json({ mensaje: "Balance generado y marcado para aprobación" });
  } catch (error) {
    console.error("Error al marcar balance:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
