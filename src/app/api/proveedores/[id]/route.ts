import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Proveedor } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query<Proveedor>("SELECT * FROM proveedores WHERE id_proveedor = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { razon_social, nit, contacto, condiciones_pago, datos_cuenta_pago, monto_contrato } = body;

    if (nit) {
      const dup = await query("SELECT 1 FROM proveedores WHERE nit = $1 AND id_proveedor != $2", [nit, id]);
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: "Ya existe otro proveedor con ese NIT" }, { status: 409 });
      }
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (razon_social !== undefined) { sets.push(`razon_social = $${idx++}`); vals.push(razon_social); }
    if (nit !== undefined) { sets.push(`nit = $${idx++}`); vals.push(nit); }
    if (contacto !== undefined) { sets.push(`contacto = $${idx++}`); vals.push(contacto); }
    if (condiciones_pago !== undefined) { sets.push(`condiciones_pago = $${idx++}`); vals.push(condiciones_pago); }
    if (datos_cuenta_pago !== undefined) { sets.push(`datos_cuenta_pago = $${idx++}`); vals.push(datos_cuenta_pago); }
    if (monto_contrato !== undefined) { sets.push(`monto_contrato = $${idx++}`); vals.push(monto_contrato); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<Proveedor>(
      `UPDATE proveedores SET ${sets.join(", ")} WHERE id_proveedor = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ mensaje: "Proveedor actualizado", proveedor: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
