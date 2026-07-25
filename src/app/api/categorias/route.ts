import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Categoria } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const tipo = searchParams.get("tipo");

  let sql = "SELECT id_categoria, nombre_categoria, tipo FROM categorias";
  const params: unknown[] = [];

  if (tipo) {
    sql += " WHERE tipo = $1";
    params.push(tipo);
  }

  sql += " ORDER BY nombre_categoria";

  const result = await query<Categoria>(sql, params);
  return NextResponse.json({ categorias: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "crear");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { nombre_categoria, tipo } = body;

    if (!nombre_categoria || !tipo) {
      return NextResponse.json(
        { error: "nombre_categoria y tipo son requeridos" },
        { status: 400 }
      );
    }

    if (tipo !== "Ingreso" && tipo !== "Egreso") {
      return NextResponse.json(
        { error: "tipo debe ser 'Ingreso' o 'Egreso'" },
        { status: 400 }
      );
    }

    const result = await query<Categoria>(
      "INSERT INTO categorias (nombre_categoria, tipo) VALUES ($1, $2) RETURNING *",
      [nombre_categoria, tipo]
    );

    return NextResponse.json({ mensaje: "Categoría creada", categoria: result.rows[0] }, { status: 201 });
  } catch (error) {
    console.error("Error al crear categoría:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
