import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "auditoria", "leer");
  if (denial) return denial;

  try {
    const items: { concepto: string; valor: number; detalle: string }[] = [];

    // 1. Segregation: same user who solicits cannot approve
    const segViolations = await query<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM solicitudes_pago s
      JOIN usuarios u ON s.id_usuario_solicita = u.id_usuario
      WHERE s.id_usuario_aprueba = s.id_usuario_solicita
    `);
    const segCount = parseInt(segViolations.rows[0].count);
    items.push({
      concepto: "Segregación de funciones (solicitudes)",
      valor: segCount === 0 ? 1 : 0,
      detalle: segCount === 0
        ? "Ningún usuario aprueba su propia solicitud"
        : `${segCount} solicitud(es) aprobada(s) por el mismo solicitante`,
    });

    // 2. Segregation: same user who closes period cannot approve the closing
    const balViolations = await query<{ count: string }>(`
      SELECT COUNT(*)::text as count FROM periodos_fiscales
      WHERE id_usuario_cierre = id_usuario_aprueba_cierre
        AND id_usuario_cierre IS NOT NULL
    `);
    const balCount = parseInt(balViolations.rows[0].count);
    items.push({
      concepto: "Segregación de funciones (balances)",
      valor: balCount === 0 ? 1 : 0,
      detalle: balCount === 0
        ? "Ningún balance fue cerrado por quien lo creó"
        : `${balCount} balance(s) cerrado(s) por el creador`,
    });

    // 3. Auto vs manual approvals (configurable limit compliance)
    const configRes = await query<{ valor: string }>(
      `SELECT valor FROM configuracion_sistema WHERE clave = 'limite_aprobacion_automatica_pagos'`
    );
    const limite = parseFloat(configRes.rows[0]?.valor || "2000");
    const [autoApproved, manualApproved] = await Promise.all([
      query<{ count: string }>(`
        SELECT COUNT(*)::text as count FROM solicitudes_pago
        WHERE estado = 'Aprobada' AND monto <= $1
      `, [limite]),
      query<{ count: string }>(`
        SELECT COUNT(*)::text as count FROM solicitudes_pago
        WHERE estado = 'Aprobada' AND monto > $1
      `, [limite]),
    ]);
    items.push({
      concepto: "Aprobaciones bajo el límite automático",
      valor: 1,
      detalle: `${autoApproved.rows[0].count} solicitud(es) ≤ $${limite.toLocaleString()} aprobadas`,
    });
    items.push({
      concepto: "Aprobaciones manuales (requerido)",
      valor: parseInt(manualApproved.rows[0].count) > 0 ? 1 : 0,
      detalle: `${manualApproved.rows[0].count} solicitud(es) > $${limite.toLocaleString()} — verificadas por Gerente`,
    });

    // 4. Provider approval compliance
    const provPending = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM proveedores WHERE estado = 'Pendiente'`
    );
    const provCount = parseInt(provPending.rows[0].count);
    items.push({
      concepto: "Proveedores pendientes de aprobación",
      valor: provCount === 0 ? 1 : 0,
      detalle: provCount === 0
        ? "Todos los proveedores han sido revisados"
        : `${provCount} proveedor(es) pendiente(s) de aprobación`,
    });

    // 5. Client approval compliance
    const cliPending = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM clientes WHERE estado = 'Pendiente'`
    );
    const cliCount = parseInt(cliPending.rows[0].count);
    items.push({
      concepto: "Clientes pendientes de aprobación",
      valor: cliCount === 0 ? 1 : 0,
      detalle: cliCount === 0
        ? "Todos los clientes han sido revisados"
        : `${cliCount} cliente(s) pendiente(s) de aprobación`,
    });

    // 6. Open periods count
    const openPeriodos = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM periodos_fiscales WHERE estado = 'Abierto'`
    );
    const obCount = parseInt(openPeriodos.rows[0].count);
    items.push({
      concepto: "Períodos abiertos",
      valor: 1,
      detalle: `${obCount} período(s) abiertos`,
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Error al evaluar cumplimiento" }, { status: 500 });
  }
}
