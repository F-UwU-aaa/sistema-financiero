import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface PeriodoRow {
  id_periodo: number;
  estado: string;
}

export async function estaPeriodoAbierto(id_periodo: number): Promise<boolean> {
  const result = await query<PeriodoRow>(
    "SELECT id_periodo, estado FROM periodos_fiscales WHERE id_periodo = $1",
    [id_periodo]
  );
  if (result.rows.length === 0) return false;
  return result.rows[0].estado === "Abierto";
}

export async function obtenerPeriodoPorFecha(fecha: string): Promise<number | null> {
  const result = await query<PeriodoRow>(
    "SELECT id_periodo, estado FROM periodos_fiscales WHERE $1::date BETWEEN fecha_inicio AND fecha_fin",
    [fecha]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].id_periodo;
}

export async function verificarPeriodoAbierto(id_periodo: number): Promise<NextResponse | null> {
  const abierta = await estaPeriodoAbierto(id_periodo);
  if (!abierta) {
    return NextResponse.json(
      { error: "No se puede realizar esta operación: el período está cerrado" },
      { status: 409 }
    );
  }
  return null;
}

export async function verificarPeriodoAbiertoPorFecha(fecha: string): Promise<NextResponse | null> {
  const id_periodo = await obtenerPeriodoPorFecha(fecha);
  if (id_periodo === null) {
    return NextResponse.json(
      { error: "No hay período fiscal que cubra la fecha indicada" },
      { status: 400 }
    );
  }
  const abierta = await estaPeriodoAbierto(id_periodo);
  if (!abierta) {
    return NextResponse.json(
      { error: "No se puede realizar esta operación: el período está cerrado" },
      { status: 409 }
    );
  }
  return null;
}
