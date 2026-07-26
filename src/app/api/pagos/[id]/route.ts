import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

interface SolicitudRow {
  id_solicitud: number;
  estado: string;
}

interface PagoExistente {
  id_pago: number;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "pagos", "ejecutar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  try {
    const body = await request.json();
    const { accion, observacion } = body;

    if (accion !== "devolver") {
      return NextResponse.json(
        { error: "accion debe ser 'devolver'" },
        { status: 400 }
      );
    }

    if (!observacion || observacion.trim() === "") {
      return NextResponse.json(
        { error: "La observación es requerida" },
        { status: 400 }
      );
    }

    const solicitudResult = await query<SolicitudRow>(
      "SELECT id_solicitud, estado FROM solicitudes_pago WHERE id_solicitud = $1",
      [id]
    );

    if (solicitudResult.rows.length === 0) {
      return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
    }

    const solicitud = solicitudResult.rows[0];

    if (solicitud.estado !== "Aprobada") {
      return NextResponse.json(
        { error: `La solicitud está en estado '${solicitud.estado}', solo se pueden devolver las aprobadas` },
        { status: 409 }
      );
    }

    const pagoExistente = await query<PagoExistente>(
      "SELECT id_pago FROM pagos WHERE id_solicitud = $1",
      [id]
    );

    if (pagoExistente.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un pago registrado para esta solicitud" },
        { status: 409 }
      );
    }

    await query(
      `UPDATE solicitudes_pago
       SET estado = 'Devuelta', motivo_rechazo = $1
       WHERE id_solicitud = $2`,
      [observacion.trim(), id]
    );

    return NextResponse.json({ mensaje: "Solicitud devuelta al Contador" });
  } catch (error) {
    console.error("Error al devolver solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
