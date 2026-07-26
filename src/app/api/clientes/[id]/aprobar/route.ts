import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "aprobar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<{ id_cliente: number; estado: string }>(
    "SELECT id_cliente, estado FROM clientes WHERE id_cliente = $1",
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
      return NextResponse.json({ mensaje: "Cliente aprobado" });
    } else {
      if (!motivo || motivo.trim() === "") {
        return NextResponse.json({ error: "El motivo de rechazo es requerido" }, { status: 400 });
      }
      await query(
        "UPDATE clientes SET estado = 'Rechazado', motivo_rechazo = $1 WHERE id_cliente = $2",
        [motivo, id]
      );
      return NextResponse.json({ mensaje: "Cliente rechazado" });
    }
  } catch (error) {
    console.error("Error al procesar aprobación de cliente:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
