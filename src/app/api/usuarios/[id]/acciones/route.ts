import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import * as crypto from "crypto";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "usuarios", "desactivar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  await query("UPDATE usuarios SET activo = NOT activo WHERE id_usuario = $1", [id]);

  const updated = await query<{ activo: boolean }>(
    "SELECT activo FROM usuarios WHERE id_usuario = $1",
    [id]
  );

  return NextResponse.json({
    mensaje: updated.rows[0].activo ? "Usuario activado" : "Usuario desactivado",
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "usuarios", "modificar");
  if (denial) return denial;

  const { id } = await params;

  const existing = await query("SELECT 1 FROM usuarios WHERE id_usuario = $1", [id]);
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  try {
    const tempPassword = crypto.randomBytes(8).toString("hex").substring(0, 10);
    const passwordHash = await hashPassword(tempPassword);

    await query(
      "UPDATE usuarios SET password_hash = $1, debe_cambiar_password = TRUE WHERE id_usuario = $2",
      [passwordHash, id]
    );

    return NextResponse.json({
      mensaje: "Contraseña restablecida",
      tempPassword,
    });
  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
