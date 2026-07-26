import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const result = await query<{ cantidad: string }>(
    `SELECT COUNT(*)::int AS cantidad
     FROM notificaciones
     WHERE id_usuario_destino = $1 AND leida = FALSE`,
    [session.id_usuario]
  );

  return NextResponse.json({ cantidad: Number(result.rows[0].cantidad) });
}
