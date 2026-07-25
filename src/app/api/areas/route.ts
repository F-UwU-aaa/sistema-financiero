import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Area } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "leer");
  if (denial) return denial;

  const result = await query<Area>(
    "SELECT id_area, nombre_area, descripcion, activo FROM areas_departamentos ORDER BY nombre_area"
  );
  return NextResponse.json({ areas: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "crear");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { nombre_area, descripcion } = body;

    if (!nombre_area) {
      return NextResponse.json(
        { error: "nombre_area es requerido" },
        { status: 400 }
      );
    }

    const result = await query<Area>(
      "INSERT INTO areas_departamentos (nombre_area, descripcion) VALUES ($1, $2) RETURNING *",
      [nombre_area, descripcion || null]
    );

    return NextResponse.json({ mensaje: "Área creada", area: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error al crear área:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
