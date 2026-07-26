import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { CuentaBancaria } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "cuentas_bancarias", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM cuentas_bancarias WHERE id_cuenta_bancaria = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { nombre_cuenta, tipo, numero_cuenta, activo } = body;

    if (tipo && tipo !== "Banco" && tipo !== "Caja") {
      return NextResponse.json(
        { error: "tipo debe ser 'Banco' o 'Caja'" },
        { status: 400 }
      );
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (nombre_cuenta !== undefined) { sets.push(`nombre_cuenta = $${idx++}`); vals.push(nombre_cuenta); }
    if (tipo !== undefined) { sets.push(`tipo = $${idx++}`); vals.push(tipo); }
    if (numero_cuenta !== undefined) { sets.push(`numero_cuenta = $${idx++}`); vals.push(numero_cuenta); }
    if (activo !== undefined) { sets.push(`activo = $${idx++}`); vals.push(activo); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<CuentaBancaria>(
      `UPDATE cuentas_bancarias SET ${sets.join(", ")} WHERE id_cuenta_bancaria = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ mensaje: "Cuenta actualizada", cuenta: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar cuenta bancaria:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
