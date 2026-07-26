import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import type { Notificacion } from "@/types";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const result = await query<Notificacion>(
    `SELECT id_notificacion, id_usuario_destino, tipo_evento, mensaje, leida, fecha_creacion::text
     FROM notificaciones
     WHERE id_usuario_destino = $1
     ORDER BY fecha_creacion DESC LIMIT 50`,
    [session.id_usuario]
  );

  return NextResponse.json({ notificaciones: result.rows });
}
