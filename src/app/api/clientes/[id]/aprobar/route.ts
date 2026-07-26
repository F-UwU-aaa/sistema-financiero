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

  const existing = await query<{ id_cliente: number; estado: string; id_usuario_registra: number }>(
    "SELECT id_cliente, estado, id_usuario_registra FROM clientes WHERE id_cliente = $1",
    [id]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
  }
  if (existing.rows[0].estado !== "Pendiente") {
    return NextResponse.json({ error: "Solo se pueden aprobar clientes pendientes" }, { status: 409 });
  }

  try {
    const body = await request.json();
    const { accion, motivo } = body;

    if (accion !== "aprobar" && accion !== "rechazar") {
      return NextResponse.json({ error: "accion debe ser 'aprobar' o 'rechazar'" }, { status: 400 });
    }

    if (accion === "aprobar") {
      await query(
        "UPDATE clientes SET estado = 'Aprobado' WHERE id_cliente = $1",
        [id]
      );
      await crearNotificacion({
        id_usuario_destino: existing.rows[0].id_usuario_registra,
        tipo_evento: "cliente_aprobado",
        mensaje: `El cliente #${id} fue aprobado por ${session!.nombre_rol}.`,
      });
      return NextResponse.json({ mensaje: "Cliente aprobado" });
    } else {
      if (!motivo || motivo.trim() === "") {
        return NextResponse.json({ error: "El motivo de rechazo es requerido" }, { status: 400 });
      }
      await query(
        "UPDATE clientes SET estado = 'Rechazado', motivo_rechazo = $1 WHERE id_cliente = $2",
        [motivo, id]
      );
      await crearNotificacion({
        id_usuario_destino: existing.rows[0].id_usuario_registra,
        tipo_evento: "cliente_rechazado",
        mensaje: `El cliente #${id} fue rechazado por ${session!.nombre_rol}. Motivo: ${motivo}`,
      });
      return NextResponse.json({ mensaje: "Cliente rechazado" });
    }
  } catch (error) {
    console.error("Error al procesar aprobación de cliente:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
