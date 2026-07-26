import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbiertoPorFecha } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";

interface SolicitudRow {
  id_solicitud: number;
  id_factura: number;
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
      "SELECT id_solicitud, id_factura, estado FROM solicitudes_pago WHERE id_solicitud = $1",
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

    const fechaResult = await query<{ fecha_emision: string }>(
      "SELECT fecha_emision::text FROM facturas WHERE id_factura = $1",
      [solicitud.id_factura]
    );
    const cerrado = await verificarPeriodoAbiertoPorFecha(fechaResult.rows[0].fecha_emision);
    if (cerrado) return cerrado;

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

    const solicitante = await query<{ id_usuario_solicita: number }>(
      "SELECT id_usuario_solicita FROM solicitudes_pago WHERE id_solicitud = $1",
      [id]
    );
    if (solicitante.rows[0]) {
      await crearNotificacion({
        id_usuario_destino: solicitante.rows[0].id_usuario_solicita,
        tipo_evento: "solicitud_devuelta",
        mensaje: `Su solicitud de pago #${id} fue devuelta por ${session!.nombre_rol}. Observación: ${observacion.trim()}`,
      });
    }

    return NextResponse.json({ mensaje: "Solicitud devuelta al Contador" });
  } catch (error) {
    console.error("Error al devolver solicitud:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
