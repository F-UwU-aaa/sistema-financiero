import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbiertoPorFecha } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { notificarRol } from "@/lib/notificaciones";
import type { SolicitudPago } from "@/types";

interface FacturaRow {
  id_factura: number;
  tipo: string;
  id_partida: number | null;
  monto: string;
  estado: string;
}

interface PartidaRow {
  id_partida: number;
  monto_asignado: string;
  monto_ejecutado: string;
}

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "pagos", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const estado = searchParams.get("estado");
  const tipo_aprobacion = searchParams.get("tipo_aprobacion");

  let sql = `
    SELECT sp.*,
           f.numero_factura,
           pr.razon_social AS razon_social_proveedor
    FROM solicitudes_pago sp
    JOIN facturas f ON sp.id_factura = f.id_factura
    LEFT JOIN proveedores pr ON f.id_proveedor = pr.id_proveedor
    WHERE TRUE
  `;
  const params: unknown[] = [];
  let idx = 1;

  if (estado) {
    sql += ` AND sp.estado = $${idx++}`;
    params.push(estado);
  }
  if (tipo_aprobacion) {
    sql += ` AND sp.tipo_aprobacion = $${idx++}`;
    params.push(tipo_aprobacion);
  }

  sql += " ORDER BY sp.fecha_solicitud DESC";

  const result = await query<SolicitudPago>(sql, params);
  return NextResponse.json({ solicitudes: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "pagos", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_factura } = body;

    if (!id_factura) {
      return NextResponse.json(
        { error: "id_factura es requerido" },
        { status: 400 }
      );
    }

    const resultado = await withTransaction(async (client) => {
      const facturaResult = await client.query<FacturaRow>(
        "SELECT id_factura, tipo, id_partida, monto, estado FROM facturas WHERE id_factura = $1",
        [id_factura]
      );

      if (facturaResult.rows.length === 0) {
        throw new Error("Factura no encontrada");
      }

      const factura = facturaResult.rows[0];

      if (factura.tipo !== "Compra") {
        throw new Error("Solo se pueden generar solicitudes de pago para facturas de Compra");
      }

      if (factura.estado !== "Pendiente") {
        throw new Error(`La factura está en estado '${factura.estado}', no se puede generar solicitud`);
      }

      const cerrado = await verificarPeriodoAbiertoPorFecha(
        (await client.query<{ fecha_emision: string }>(
          "SELECT fecha_emision::text FROM facturas WHERE id_factura = $1", [id_factura]
        )).rows[0].fecha_emision
      );
      if (cerrado) throw new Error("No se puede generar solicitud: el período está cerrado");

      if (!factura.id_partida) {
        throw new Error("La factura no tiene una partida presupuestaria asociada");
      }

      const partidaResult = await client.query<PartidaRow>(
        "SELECT id_partida, monto_asignado, monto_ejecutado FROM partidas_presupuestarias WHERE id_partida = $1",
        [factura.id_partida]
      );

      if (partidaResult.rows.length === 0) {
        throw new Error("Partida presupuestaria no encontrada");
      }

      const partida = partidaResult.rows[0];
      const saldoDisponible =
        Number(partida.monto_asignado) - Number(partida.monto_ejecutado);
      const montoFactura = Number(factura.monto);

      if (saldoDisponible < montoFactura) {
        throw new Error(
          `Saldo insuficiente en la partida: disponible $${saldoDisponible.toLocaleString()}, solicitado $${montoFactura.toLocaleString()}`
        );
      }

      const configResult = await client.query(
        "SELECT valor FROM configuracion_sistema WHERE clave = 'limite_aprobacion_automatica_pagos'"
      );
      const umbral = Number(configResult.rows[0]?.valor || 2000);

      let estado: string;
      let tipo_aprobacion: string;

      if (montoFactura <= umbral) {
        estado = "Aprobada";
        tipo_aprobacion = "Automatica";
      } else {
        estado = "Pendiente";
        tipo_aprobacion = "Manual";
      }

      const solicitudResult = await client.query(
        `INSERT INTO solicitudes_pago (id_factura, monto, estado, tipo_aprobacion, id_usuario_solicita)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id_factura, montoFactura, estado, tipo_aprobacion, session!.id_usuario]
      );

      await client.query(
        "UPDATE facturas SET estado = 'Solicitada' WHERE id_factura = $1",
        [id_factura]
      );

      if (tipo_aprobacion === "Automatica") {
        await client.query(
          `UPDATE partidas_presupuestarias
           SET monto_ejecutado = monto_ejecutado + $1
           WHERE id_partida = $2`,
          [montoFactura, factura.id_partida]
        );
      }

      const nombreSolicitante = (
        await client.query<{ nombre_completo: string }>(
          "SELECT nombre_completo FROM usuarios WHERE id_usuario = $1",
          [session!.id_usuario]
        )
      ).rows[0]?.nombre_completo || "Desconocido";

      if (tipo_aprobacion === "Automatica") {
        await notificarRol(
          4,
          "solicitud_pago_auto",
          `Solicitud de pago #${solicitudResult.rows[0].id_solicitud} auto-aprobada por $${montoFactura.toLocaleString()}. Factura #${factura.id_factura} lista para ejecución.`
        );
      } else {
        await notificarRol(
          2,
          "solicitud_pago_pendiente",
          `Solicitud de pago #${solicitudResult.rows[0].id_solicitud} por $${montoFactura.toLocaleString()} creada por ${nombreSolicitante}. Requiere aprobación.`
        );
      }

      return {
        solicitud: solicitudResult.rows[0],
        saldo_disponible: saldoDisponible,
        tipo_aprobacion,
      };
    });

    const mensaje =
      resultado.tipo_aprobacion === "Automatica"
        ? "Solicitud creada y aprobada automáticamente. Lista para Tesorería."
        : "Solicitud creada. Pendiente de aprobación del Gerente Financiero.";

    return NextResponse.json(
      {
        mensaje,
        solicitud: resultado.solicitud,
        saldo_disponible: resultado.saldo_disponible,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error interno del servidor";
    const isBusinessError = message.startsWith("Saldo insuficiente") ||
      message === "Factura no encontrada" ||
      message === "Solo se pueden generar solicitudes de pago para facturas de Compra" ||
      message.startsWith("La factura está en estado") ||
      message === "La factura no tiene una partida presupuestaria asociada" ||
      message === "Partida presupuestaria no encontrada";

    console.error("Error al crear solicitud de pago:", error);
    return NextResponse.json(
      { error: message },
      { status: isBusinessError ? 409 : 500 }
    );
  }
}
