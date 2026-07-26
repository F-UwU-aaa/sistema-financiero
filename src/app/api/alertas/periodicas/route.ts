import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { crearNotificacion, notificarRol } from "@/lib/notificaciones";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const alertas: { tipo: string; detalles: string }[] = [];

  // 1. Facturas de Compra próximas a vencer (7 días)
  const facturasVencer = await query<{
    id_factura: number;
    numero_factura: string;
    fecha_vencimiento: string;
    razon_social: string | null;
  }>(
    `SELECT f.id_factura, f.numero_factura, f.fecha_vencimiento::text,
            pr.razon_social
     FROM facturas f
     LEFT JOIN proveedores pr ON f.id_proveedor = pr.id_proveedor
     WHERE f.tipo = 'Compra'
       AND f.estado NOT IN ('Pagada', 'Anulada')
       AND f.fecha_vencimiento BETWEEN NOW() AND NOW() + INTERVAL '7 days'
     ORDER BY f.fecha_vencimiento ASC`
  );

  for (const f of facturasVencer.rows) {
    const existente = await query<{ cantidad: string }>(
      `SELECT COUNT(*)::int AS cantidad
       FROM notificaciones
       WHERE id_usuario_destino = $1
         AND tipo_evento = 'factura_proxima_vencer'
         AND mensaje LIKE '%' || $2 || '%'
         AND fecha_creacion > NOW() - INTERVAL '24 hours'`,
      [session.id_usuario, f.numero_factura]
    );
    if (Number(existente.rows[0].cantidad) === 0) {
      await crearNotificacion({
        id_usuario_destino: session.id_usuario,
        tipo_evento: "factura_proxima_vencer",
        mensaje: `La factura de compra #${f.numero_factura}${f.razon_social ? ` (${f.razon_social})` : ""} vence el ${f.fecha_vencimiento}.`,
      });
    }
    alertas.push({
      tipo: "factura_proxima_vencer",
      detalles: `Factura #${f.numero_factura} vence el ${f.fecha_vencimiento}`,
    });
  }

  // 2. Saldo bajo mínimo en cuentas bancarias (< $1,000)
  const cuentasBajas = await query<{
    id_cuenta_bancaria: number;
    nombre_cuenta: string;
    saldo_actual: string;
  }>(
    `SELECT id_cuenta_bancaria, nombre_cuenta, saldo_actual::text
     FROM cuentas_bancarias
     WHERE activo = TRUE AND saldo_actual < 1000`
  );

  for (const c of cuentasBajas.rows) {
    const existente = await query<{ cantidad: string }>(
      `SELECT COUNT(*)::int AS cantidad
       FROM notificaciones
       WHERE id_usuario_destino = $1
         AND tipo_evento = 'saldo_bajo_minimo'
         AND mensaje LIKE '%' || $2 || '%'
         AND fecha_creacion > NOW() - INTERVAL '24 hours'`,
      [session.id_usuario, c.nombre_cuenta]
    );
    if (Number(existente.rows[0].cantidad) === 0) {
      await notificarRol(
        4,
        "saldo_bajo_minimo",
        `La cuenta "${c.nombre_cuenta}" tiene saldo bajo: $${Number(c.saldo_actual).toLocaleString()}.`
      );
    }
    alertas.push({
      tipo: "saldo_bajo_minimo",
      detalles: `Cuenta "${c.nombre_cuenta}" saldo: $${Number(c.saldo_actual).toLocaleString()}`,
    });
  }

  // 3. Saldo insuficiente para pagar solicitudes aprobadas pendientes
  const saldoTotal = await query<{ total: string }>(
    `SELECT COALESCE(SUM(saldo_actual), 0)::text AS total
     FROM cuentas_bancarias WHERE activo = TRUE`
  );
  const solicitudesPendientes = await query<{ total: string }>(
    `SELECT COALESCE(SUM(monto), 0)::text AS total
     FROM solicitudes_pago WHERE estado = 'Aprobada'`
  );

  const saldoNum = Number(saldoTotal.rows[0].total);
  const pendienteNum = Number(solicitudesPendientes.rows[0].total);

  if (pendienteNum > 0 && saldoNum < pendienteNum) {
    const existente = await query<{ cantidad: string }>(
      `SELECT COUNT(*)::int AS cantidad
       FROM notificaciones
       WHERE id_usuario_destino = $1
         AND tipo_evento = 'saldo_insuficiente_pago'
         AND fecha_creacion > NOW() - INTERVAL '24 hours'`,
      [session.id_usuario]
    );
    if (Number(existente.rows[0].cantidad) === 0) {
      await notificarRol(
        4,
        "saldo_insuficiente_pago",
        `Saldo bancario total ($${saldoNum.toLocaleString()}) insuficiente para cubrir solicitudes aprobadas pendientes ($${pendienteNum.toLocaleString()}).`
      );
    }
    alertas.push({
      tipo: "saldo_insuficiente_pago",
      detalles: `Saldo: $${saldoNum.toLocaleString()}, Pendiente: $${pendienteNum.toLocaleString()}`,
    });
  }

  return NextResponse.json({ alertas });
}
