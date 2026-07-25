import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import {
  verifySession,
  hashPassword,
  signSession,
  createSessionCookie,
  COOKIE_NAME,
} from "@/lib/auth";
import type { SessionPayload } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map((c) => {
        const [key, ...val] = c.trim().split("=");
        return [key, val.join("=")];
      })
    );
    const token = cookies[COOKIE_NAME];

    if (!token) {
      return NextResponse.json({ error: "No hay sesión activa" }, { status: 401 });
    }

    const session = verifySession(token);
    if (!session) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }

    const body = await request.json();
    const { password } = body;

    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres" },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(password);

    await query(
      "UPDATE usuarios SET password_hash = $1, debe_cambiar_password = FALSE WHERE id_usuario = $2",
      [newHash, session.id_usuario]
    );

    const newPayload: SessionPayload = {
      ...session,
      debe_cambiar_password: false,
    };
    const newToken = signSession(newPayload);
    const cookieHeaderNew = createSessionCookie(newToken);

    const response = NextResponse.json({ mensaje: "Contraseña actualizada" });
    response.headers.set("Set-Cookie", cookieHeaderNew);
    return response;
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
