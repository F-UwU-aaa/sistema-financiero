import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { PeriodoFiscal } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "configuracion", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM periodos_fiscales WHERE id_periodo = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { nombre_periodo, fecha_inicio, fecha_fin } = body;

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (nombre_periodo !== undefined) {
      sets.push(`nombre_periodo = $${idx++}`);
      vals.push(nombre_periodo);
    }
    if (fecha_inicio !== undefined) {
      sets.push(`fecha_inicio = $${idx++}`);
      vals.push(fecha_inicio);
    }
    if (fecha_fin !== undefined) {
      sets.push(`fecha_fin = $${idx++}`);
      vals.push(fecha_fin);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    const result = await query<PeriodoFiscal>(
      `UPDATE periodos_fiscales SET ${sets.join(", ")} WHERE id_periodo = $${idx}
       RETURNING id_periodo, nombre_periodo, fecha_inicio::text, fecha_fin::text, estado`,
      vals
    );

    return NextResponse.json({ mensaje: "Período actualizado", periodo: result.rows[0] });
  } catch (error) {
    console.error("Error al actualizar período:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
