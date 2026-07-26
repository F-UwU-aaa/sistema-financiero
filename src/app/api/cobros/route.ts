import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbiertoPorFecha } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import type { Cobro } from "@/types";

interface FacturaRow {
  id_factura: number;
  tipo: string;
  monto: string;
  estado: string;
}

interface CuentaRow {
  id_cuenta_bancaria: number;
  saldo_actual: string;
  activo: boolean;
}

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "cobros", "leer");
  if (denial) return denial;

  const result = await query<Cobro>(
    `SELECT c.*,
            f.numero_factura,
            cl.razon_social AS nombre_cliente,
            cb.nombre_cuenta AS nombre_cuenta_bancaria
     FROM cobros c
     JOIN facturas f ON c.id_factura = f.id_factura
     LEFT JOIN clientes cl ON f.id_cliente = cl.id_cliente
     JOIN cuentas_bancarias cb ON c.id_cuenta_bancaria = cb.id_cuenta_bancaria
     ORDER BY c.fecha_cobro DESC`
  );

  return NextResponse.json({ cobros: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "cobros", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_factura, id_cuenta_bancaria, monto } = body;

    if (!id_factura) {
      return NextResponse.json({ error: "id_factura es requerido" }, { status: 400 });
    }
    if (!id_cuenta_bancaria) {
      return NextResponse.json({ error: "id_cuenta_bancaria es requerido" }, { status: 400 });
    }
    if (!monto || Number(monto) <= 0) {
      return NextResponse.json({ error: "monto debe ser mayor a 0" }, { status: 400 });
    }

    const resultado = await withTransaction(async (client) => {
      const facturaResult = await client.query<FacturaRow>(
        "SELECT id_factura, tipo, monto, estado FROM facturas WHERE id_factura = $1",
        [id_factura]
      );

      if (facturaResult.rows.length === 0) {
        throw new Error("Factura no encontrada");
      }

      const factura = facturaResult.rows[0];
      if (factura.tipo !== "Venta") {
        throw new Error("Solo se pueden registrar cobros contra facturas de Venta");
      }
      if (factura.estado !== "Pendiente") {
        throw new Error(`La factura está en estado '${factura.estado}', solo se pueden cobrar las pendientes`);
      }

      const cerrado = await verificarPeriodoAbiertoPorFecha(
        (await client.query<{ fecha_emision: string }>(
          "SELECT fecha_emision::text FROM facturas WHERE id_factura = $1", [id_factura]
        )).rows[0].fecha_emision
      );
      if (cerrado) throw new Error("No se puede registrar cobro: el período está cerrado");

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

      const montoNum = Number(monto);

      const cobroResult = await client.query(
        `INSERT INTO cobros (id_factura, id_cuenta_bancaria, monto, id_usuario_ejecuta)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [id_factura, id_cuenta_bancaria, montoNum, session!.id_usuario]
      );

      await client.query(
        "UPDATE cuentas_bancarias SET saldo_actual = saldo_actual + $1 WHERE id_cuenta_bancaria = $2",
        [montoNum, id_cuenta_bancaria]
      );

      await client.query(
        "UPDATE facturas SET estado = 'Cobrada' WHERE id_factura = $1",
        [id_factura]
      );

      return cobroResult.rows[0];
    });

    return NextResponse.json(
      { mensaje: "Cobro registrado exitosamente", cobro: resultado },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const isBusinessError = message.startsWith("Solo se pueden") ||
      message === "Factura no encontrada" ||
      message.startsWith("La factura está en estado") ||
      message === "Cuenta bancaria no encontrada" ||
      message === "La cuenta bancaria está inactiva";
    console.error("Error al registrar cobro:", error);
    return NextResponse.json(
      { error: message },
      { status: isBusinessError ? 409 : 500 }
    );
  }
}
