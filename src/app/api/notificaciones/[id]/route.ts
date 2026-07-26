import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  await query(
    `UPDATE notificaciones SET leida = TRUE
     WHERE id_notificacion = $1 AND id_usuario_destino = $2`,
    [id, session.id_usuario]
  );

  return NextResponse.json({ mensaje: "Marcada como leída" });
}
