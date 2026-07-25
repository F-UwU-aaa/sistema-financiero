import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Categoria } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "configuracion", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM categorias WHERE id_categoria = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { nombre_categoria, tipo } = body;

    if (tipo && tipo !== "Ingreso" && tipo !== "Egreso") {
      return NextResponse.json(
        { error: "tipo debe ser 'Ingreso' o 'Egreso'" },
        { status: 400 }
      );
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (nombre_categoria !== undefined) {
      sets.push(`nombre_categoria = $${idx++}`);
      vals.push(nombre_categoria);
    }
    if (tipo !== undefined) {
      sets.push(`tipo = $${idx++}`);
      vals.push(tipo);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<Categoria>(
      `UPDATE categorias SET ${sets.join(", ")} WHERE id_categoria = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ mensaje: "Categoría actualizada", categoria: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar categoría:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "configuracion", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM categorias WHERE id_categoria = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
  }

  const referenciada = await query(
    "SELECT 1 FROM partidas_presupuestarias WHERE id_categoria = $1 LIMIT 1",
    [id]
  );
  if (referenciada.rows.length > 0) {
    return NextResponse.json(
      { error: "No se puede eliminar: la categoría está referenciada en partidas presupuestarias" },
      { status: 409 }
    );
  }

  await query("DELETE FROM categorias WHERE id_categoria = $1", [id]);
  return NextResponse.json({ mensaje: "Categoría eliminada" });
}
