import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbiertoPorFecha } from "@/lib/periodos";

interface FacturaRow {
  id_factura: number;
  estado: string;
  fecha_emision: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "facturacion", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query<FacturaRow>(
    "SELECT id_factura, estado, fecha_emision FROM facturas WHERE id_factura = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json(
      { error: "Factura no encontrada" },
      { status: 404 }
    );
  }

  const factura = existing.rows[0];

  if (factura.estado === "Anulada") {
    return NextResponse.json(
      { error: "La factura ya está anulada" },
      { status: 409 }
    );
  }

  if (factura.estado === "Pagada" || factura.estado === "Cobrada") {
    return NextResponse.json(
      { error: "No se puede anular una factura que ya fue pagada o cobrada" },
      { status: 409 }
    );
  }

  const cerrado = await verificarPeriodoAbiertoPorFecha(factura.fecha_emision);
  if (cerrado) return cerrado;

  try {
    const body = await request.json();
    const { accion, motivo_anulacion } = body;

    if (accion !== "anular") {
      return NextResponse.json(
        { error: "accion debe ser 'anular'" },
        { status: 400 }
      );
    }

    if (!motivo_anulacion || motivo_anulacion.trim() === "") {
      return NextResponse.json(
        { error: "El motivo de anulación es requerido" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE facturas
       SET estado = 'Anulada', motivo_anulacion = $1
       WHERE id_factura = $2`,
      [motivo_anulacion.trim(), id]
    );

    return NextResponse.json({ mensaje: "Factura anulada" });
  } catch (error) {
    console.error("Error al anular factura:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
