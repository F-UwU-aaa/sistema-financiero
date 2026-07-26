import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { CuentaContable } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "cuentas_contables", "leer");
  if (denial) return denial;

  const result = await query<CuentaContable>(
    "SELECT id_cuenta, codigo_cuenta, nombre_cuenta, tipo_cuenta, id_cuenta_padre, activo FROM cuentas_contables ORDER BY codigo_cuenta"
  );
  return NextResponse.json({ cuentas: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "cuentas_contables", "crear");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { codigo_cuenta, nombre_cuenta, tipo_cuenta, id_cuenta_padre } = body;

    if (!codigo_cuenta || !nombre_cuenta || !tipo_cuenta) {
      return NextResponse.json(
        { error: "codigo_cuenta, nombre_cuenta y tipo_cuenta son requeridos" },
        { status: 400 }
      );
    }

    const tiposValidos = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Gasto"];
    if (!tiposValidos.includes(tipo_cuenta)) {
      return NextResponse.json(
        { error: `tipo_cuenta debe ser uno de: ${tiposValidos.join(", ")}` },
        { status: 400 }
      );
    }

    const dup = await query("SELECT 1 FROM cuentas_contables WHERE codigo_cuenta = $1", [codigo_cuenta]);
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe una cuenta con ese código" }, { status: 409 });
    }

    if (id_cuenta_padre) {
      const padre = await query("SELECT 1 FROM cuentas_contables WHERE id_cuenta = $1", [id_cuenta_padre]);
      if (padre.rows.length === 0) {
        return NextResponse.json({ error: "Cuenta padre no encontrada" }, { status: 404 });
      }
    }

    const result = await query<CuentaContable>(
      `INSERT INTO cuentas_contables (codigo_cuenta, nombre_cuenta, tipo_cuenta, id_cuenta_padre)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [codigo_cuenta, nombre_cuenta, tipo_cuenta, id_cuenta_padre || null]
    );

    return NextResponse.json({ mensaje: "Cuenta creada", cuenta: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error al crear cuenta contable:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
