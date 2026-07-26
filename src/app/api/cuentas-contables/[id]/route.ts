import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { CuentaContable } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "cuentas_contables", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM cuentas_contables WHERE id_cuenta = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { codigo_cuenta, nombre_cuenta, tipo_cuenta, id_cuenta_padre, activo } = body;

    if (tipo_cuenta) {
      const tiposValidos = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Gasto"];
      if (!tiposValidos.includes(tipo_cuenta)) {
        return NextResponse.json(
          { error: `tipo_cuenta debe ser uno de: ${tiposValidos.join(", ")}` },
          { status: 400 }
        );
      }
    }

    if (codigo_cuenta) {
      const dup = await query(
        "SELECT 1 FROM cuentas_contables WHERE codigo_cuenta = $1 AND id_cuenta != $2",
        [codigo_cuenta, id]
      );
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: "Ya existe otra cuenta con ese código" }, { status: 409 });
      }
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (codigo_cuenta !== undefined) { sets.push(`codigo_cuenta = $${idx++}`); vals.push(codigo_cuenta); }
    if (nombre_cuenta !== undefined) { sets.push(`nombre_cuenta = $${idx++}`); vals.push(nombre_cuenta); }
    if (tipo_cuenta !== undefined) { sets.push(`tipo_cuenta = $${idx++}`); vals.push(tipo_cuenta); }
    if (id_cuenta_padre !== undefined) { sets.push(`id_cuenta_padre = $${idx++}`); vals.push(id_cuenta_padre || null); }
    if (activo !== undefined) { sets.push(`activo = $${idx++}`); vals.push(activo); }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<CuentaContable>(
      `UPDATE cuentas_contables SET ${sets.join(", ")} WHERE id_cuenta = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ mensaje: "Cuenta actualizada", cuenta: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar cuenta contable:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
