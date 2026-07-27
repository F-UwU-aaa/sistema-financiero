import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verifyPassword, signSession, createSessionCookie } from "@/lib/auth";
import type { SessionPayload, UsuarioRow, RolRow } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correo, password } = body;

    if (!correo || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const ipOrigen =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "desconocido";

    const result = await query<UsuarioRow>(
      "SELECT id_usuario, nombre_completo, correo, password_hash, id_rol, activo, debe_cambiar_password FROM usuarios WHERE correo = $1",
      [correo]
    );

    const usuario = result.rows[0];

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    if (!usuario.activo) {
      await query(
        "INSERT INTO historial_accesos (id_usuario, ip_origen, resultado) VALUES ($1, $2, 'Fallido')",
        [usuario.id_usuario, ipOrigen]
      );
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const passwordValida = await verifyPassword(password, usuario.password_hash);

    if (!passwordValida) {
      await query(
        "INSERT INTO historial_accesos (id_usuario, ip_origen, resultado) VALUES ($1, $2, 'Fallido')",
        [usuario.id_usuario, ipOrigen]
      );
      return NextResponse.json(
        { error: "Credenciales inválidas" },
        { status: 401 }
      );
    }

    const rolResult = await query<RolRow>("SELECT nombre_rol FROM roles WHERE id_rol = $1", [
      usuario.id_rol,
    ]);
    const nombre_rol = rolResult.rows[0]?.nombre_rol || "";

    const payload: SessionPayload = {
      id_usuario: usuario.id_usuario,
      id_rol: usuario.id_rol,
      nombre_rol,
      nombre_completo: usuario.nombre_completo,
      debe_cambiar_password: usuario.debe_cambiar_password,
      exp: Date.now() + 24 * 60 * 60 * 1000,
    };

    const token = signSession(payload);
    const cookieHeader = createSessionCookie(token);

    await query(
      "UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = $1",
      [usuario.id_usuario]
    );

    await query(
      "INSERT INTO historial_accesos (id_usuario, ip_origen, resultado) VALUES ($1, $2, 'Exitoso')",
      [usuario.id_usuario, ipOrigen]
    );

    const response = NextResponse.json({
      mensaje: "Login exitoso",
      nombre_rol,
      nombre_completo: usuario.nombre_completo,
      debe_cambiar_password: usuario.debe_cambiar_password,
    });

    response.headers.set("Set-Cookie", cookieHeader);
    return response;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
