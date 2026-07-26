import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Cliente } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM clientes WHERE id_cliente = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { razon_social, nit, contacto, datos_facturacion, monto_relacion } = body;

    if (nit) {
      const dup = await query("SELECT 1 FROM clientes WHERE nit = $1 AND id_cliente != $2", [nit, id]);
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: "Ya existe otro cliente con ese NIT" }, { status: 409 });
      }
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (razon_social !== undefined) { sets.push(`razon_social = $${idx++}`); vals.push(razon_social); }
    if (nit !== undefined) { sets.push(`nit = $${idx++}`); vals.push(nit); }
    if (contacto !== undefined) { sets.push(`contacto = $${idx++}`); vals.push(contacto); }
    if (datos_facturacion !== undefined) { sets.push(`datos_facturacion = $${idx++}`); vals.push(datos_facturacion); }
    if (monto_relacion !== undefined) { sets.push(`monto_relacion = $${idx++}`); vals.push(monto_relacion); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<Cliente>(
      `UPDATE clientes SET ${sets.join(", ")} WHERE id_cliente = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ mensaje: "Cliente actualizado", cliente: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar cliente:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
