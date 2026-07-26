import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "aprobar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<{ id_proveedor: number; estado: string; id_usuario_registra: number }>(
    "SELECT id_proveedor, estado, id_usuario_registra FROM proveedores WHERE id_proveedor = $1",
    [id]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
  }
  if (existing.rows[0].estado !== "Pendiente") {
    return NextResponse.json({ error: "Solo se pueden aprobar proveedores pendientes" }, { status: 409 });
  }

  try {
    const body = await request.json();
    const { accion, motivo } = body;

    if (accion !== "aprobar" && accion !== "rechazar") {
      return NextResponse.json({ error: "accion debe ser 'aprobar' o 'rechazar'" }, { status: 400 });
    }

    if (accion === "aprobar") {
      await query(
        `UPDATE proveedores SET estado = 'Aprobado', id_usuario_aprueba = $1 WHERE id_proveedor = $2`,
        [session!.id_usuario, id]
      );
      await crearNotificacion({
        id_usuario_destino: existing.rows[0].id_usuario_registra,
        tipo_evento: "proveedor_aprobado",
        mensaje: `El proveedor #${id} fue aprobado por ${session!.nombre_rol}.`,
      });
      return NextResponse.json({ mensaje: "Proveedor aprobado" });
    } else {
      if (!motivo || motivo.trim() === "") {
        return NextResponse.json({ error: "El motivo de rechazo es requerido" }, { status: 400 });
      }
      await query(
        `UPDATE proveedores SET estado = 'Rechazado', motivo_rechazo = $1, id_usuario_aprueba = $2 WHERE id_proveedor = $3`,
        [motivo, session!.id_usuario, id]
      );
      await crearNotificacion({
        id_usuario_destino: existing.rows[0].id_usuario_registra,
        tipo_evento: "proveedor_rechazado",
        mensaje: `El proveedor #${id} fue rechazado por ${session!.nombre_rol}. Motivo: ${motivo}`,
      });
      return NextResponse.json({ mensaje: "Proveedor rechazado" });
    }
  } catch (error) {
    console.error("Error al procesar aprobación de proveedor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
