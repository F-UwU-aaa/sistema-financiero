import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { PeriodoFiscal } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "leer");
  if (denial) return denial;

  const result = await query<PeriodoFiscal>(
    `SELECT id_periodo, nombre_periodo, fecha_inicio::text, fecha_fin::text, estado
     FROM periodos_fiscales
     ORDER BY fecha_inicio DESC`
  );
  return NextResponse.json({ periodos: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "crear");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { nombre_periodo, fecha_inicio, fecha_fin } = body;

    if (!nombre_periodo || !fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: "nombre_periodo, fecha_inicio y fecha_fin son requeridos" },
        { status: 400 }
      );
    }

    if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
      return NextResponse.json(
        { error: "fecha_fin debe ser posterior a fecha_inicio" },
        { status: 400 }
      );
    }

    const solapamiento = await query(
      `SELECT 1 FROM periodos_fiscales
       WHERE fecha_inicio <= $2 AND fecha_fin >= $1
       LIMIT 1`,
      [fecha_inicio, fecha_fin]
    );
    if (solapamiento.rows.length > 0) {
      return NextResponse.json(
        { error: "El periodo se solapa con un periodo existente" },
        { status: 409 }
      );
    }

    const result = await query<PeriodoFiscal>(
      `INSERT INTO periodos_fiscales (nombre_periodo, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3)
       RETURNING id_periodo, nombre_periodo, fecha_inicio::text, fecha_fin::text, estado`,
      [nombre_periodo, fecha_inicio, fecha_fin]
    );

    return NextResponse.json(
      { mensaje: "Período creado", periodo: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear período:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
