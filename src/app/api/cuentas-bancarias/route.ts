import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { CuentaBancaria } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "cuentas_bancarias", "leer");
  if (denial) return denial;

  const result = await query<CuentaBancaria>(
    "SELECT id_cuenta_bancaria, nombre_cuenta, tipo, numero_cuenta, saldo_actual::text, activo FROM cuentas_bancarias ORDER BY nombre_cuenta"
  );
  return NextResponse.json({ cuentas: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "cuentas_bancarias", "crear");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { nombre_cuenta, tipo, numero_cuenta, saldo_inicial } = body;

    if (!nombre_cuenta || !tipo) {
      return NextResponse.json(
        { error: "nombre_cuenta y tipo son requeridos" },
        { status: 400 }
      );
    }

    if (tipo !== "Banco" && tipo !== "Caja") {
      return NextResponse.json(
        { error: "tipo debe ser 'Banco' o 'Caja'" },
        { status: 400 }
      );
    }

    const result = await query<CuentaBancaria>(
      `INSERT INTO cuentas_bancarias (nombre_cuenta, tipo, numero_cuenta, saldo_actual)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nombre_cuenta, tipo, numero_cuenta || null, saldo_inicial || 0]
    );

    return NextResponse.json({ mensaje: "Cuenta creada", cuenta: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error al crear cuenta bancaria:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
