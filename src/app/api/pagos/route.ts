import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbiertoPorFecha } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import type { Pago } from "@/types";

interface SolicitudRow {
  id_solicitud: number;
  id_factura: number;
  monto: string;
  estado: string;
}

interface CuentaRow {
  id_cuenta_bancaria: number;
  saldo_actual: string;
  activo: boolean;
}

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "pagos", "leer");
  if (denial) return denial;

  const result = await query<Pago>(
    `SELECT pg.*,
            f.numero_factura,
            pr.razon_social AS razon_social_proveedor,
            cb.nombre_cuenta AS nombre_cuenta_bancaria
     FROM pagos pg
     JOIN solicitudes_pago sp ON pg.id_solicitud = sp.id_solicitud
     JOIN facturas f ON sp.id_factura = f.id_factura
     LEFT JOIN proveedores pr ON f.id_proveedor = pr.id_proveedor
     JOIN cuentas_bancarias cb ON pg.id_cuenta_bancaria = cb.id_cuenta_bancaria
     ORDER BY pg.fecha_pago DESC`
  );

  return NextResponse.json({ pagos: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "pagos", "ejecutar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_solicitud, id_cuenta_bancaria, metodo, numero_operacion } = body;

    if (!id_solicitud) {
      return NextResponse.json({ error: "id_solicitud es requerido" }, { status: 400 });
    }
    if (!id_cuenta_bancaria) {
      return NextResponse.json({ error: "id_cuenta_bancaria es requerido" }, { status: 400 });
    }
    if (!metodo || !["Transferencia", "Cheque", "Efectivo"].includes(metodo)) {
      return NextResponse.json(
        { error: "metodo debe ser 'Transferencia', 'Cheque' o 'Efectivo'" },
        { status: 400 }
      );
    }
    if (!numero_operacion || !numero_operacion.trim()) {
      return NextResponse.json({ error: "numero_operacion es requerido" }, { status: 400 });
    }

    const resultado = await withTransaction(async (client) => {
      const solResult = await client.query<SolicitudRow>(
        "SELECT id_solicitud, id_factura, monto, estado FROM solicitudes_pago WHERE id_solicitud = $1",
        [id_solicitud]
      );

      if (solResult.rows.length === 0) {
        throw new Error("Solicitud no encontrada");
      }

      const solicitud = solResult.rows[0];
      if (solicitud.estado !== "Aprobada") {
        throw new Error(`La solicitud está en estado '${solicitud.estado}', solo se pueden ejecutar las aprobadas`);
      }

      const fechaResult = await client.query<{ fecha_emision: string }>(
        "SELECT f.fecha_emision::text FROM facturas f WHERE f.id_factura = $1",
        [solicitud.id_factura]
      );
      const cerrado = await verificarPeriodoAbiertoPorFecha(fechaResult.rows[0].fecha_emision);
      if (cerrado) throw new Error("No se puede ejecutar el pago: el período está cerrado");

      const cuentaResult = await client.query<CuentaRow>(
        "SELECT id_cuenta_bancaria, saldo_actual, activo FROM cuentas_bancarias WHERE id_cuenta_bancaria = $1",
        [id_cuenta_bancaria]
      );

      if (cuentaResult.rows.length === 0) {
        throw new Error("Cuenta bancaria no encontrada");
      }

      const cuenta = cuentaResult.rows[0];
      if (!cuenta.activo) {
        throw new Error("La cuenta bancaria está inactiva");
      }

      const monto = Number(solicitud.monto);
      if (Number(cuenta.saldo_actual) < monto) {
        throw new Error(
          `Saldo insuficiente en la cuenta: disponible $${Number(cuenta.saldo_actual).toLocaleString()}, requerido $${monto.toLocaleString()}`
        );
      }

      const pagoResult = await client.query(
        `INSERT INTO pagos (id_solicitud, id_cuenta_bancaria, metodo, numero_operacion, monto, id_usuario_ejecuta)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id_solicitud, id_cuenta_bancaria, metodo, numero_operacion.trim(), monto, session!.id_usuario]
      );

      await client.query(
        "UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - $1 WHERE id_cuenta_bancaria = $2",
        [monto, id_cuenta_bancaria]
      );

      await client.query(
        "UPDATE solicitudes_pago SET estado = 'Ejecutada' WHERE id_solicitud = $1",
        [id_solicitud]
      );

      await client.query(
        "UPDATE facturas SET estado = 'Pagada' WHERE id_factura = $1",
        [solicitud.id_factura]
      );

      return pagoResult.rows[0];
    });

    return NextResponse.json(
      { mensaje: "Pago ejecutado exitosamente", pago: resultado },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const isBusinessError = message.startsWith("Saldo insuficiente") ||
      message === "Solicitud no encontrada" ||
      message.startsWith("La solicitud está en estado") ||
      message === "Cuenta bancaria no encontrada" ||
      message === "La cuenta bancaria está inactiva";
    console.error("Error al ejecutar pago:", error);
    return NextResponse.json(
      { error: message },
      { status: isBusinessError ? 409 : 500 }
    );
  }
}
