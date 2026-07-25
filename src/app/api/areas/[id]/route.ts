import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Area } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "configuracion", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM areas_departamentos WHERE id_area = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { nombre_area, descripcion, activo } = body;

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (nombre_area !== undefined) {
      sets.push(`nombre_area = $${idx++}`);
      vals.push(nombre_area);
    }
    if (descripcion !== undefined) {
      sets.push(`descripcion = $${idx++}`);
      vals.push(descripcion);
    }
    if (activo !== undefined) {
      sets.push(`activo = $${idx++}`);
      vals.push(activo);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<Area>(
      `UPDATE areas_departamentos SET ${sets.join(", ")} WHERE id_area = $${idx} RETURNING *`,
      vals
    );

    return NextResponse.json({ mensaje: "Área actualizada", area: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar área:", error);
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

  const existing = await query("SELECT 1 FROM areas_departamentos WHERE id_area = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Área no encontrada" }, { status: 404 });
  }

  await query("UPDATE areas_departamentos SET activo = FALSE WHERE id_area = $1", [id]);
  return NextResponse.json({ mensaje: "Área desactivada" });
}
