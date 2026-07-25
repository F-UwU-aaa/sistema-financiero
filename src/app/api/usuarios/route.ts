import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { hashPassword } from "@/lib/auth";
import type { UsuarioConRol, RolRow } from "@/types";
import * as crypto from "crypto";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "usuarios", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const rol = searchParams.get("rol");
  const activo = searchParams.get("activo");

  let sql = `
    SELECT u.id_usuario, u.nombre_completo, u.correo, u.id_rol, r.nombre_rol,
           u.activo, u.debe_cambiar_password, u.fecha_creacion::text, u.ultimo_acceso::text
    FROM usuarios u
    JOIN roles r ON u.id_rol = r.id_rol
    WHERE TRUE
  `;
  const params: unknown[] = [];
  let idx = 1;

  if (rol) {
    sql += ` AND r.nombre_rol = $${idx++}`;
    params.push(rol);
  }
  if (activo !== null && activo !== "") {
    sql += ` AND u.activo = $${idx++}`;
    params.push(activo === "true");
  }

  sql += " ORDER BY u.nombre_completo";

  const result = await query<UsuarioConRol>(sql, params);
  return NextResponse.json({ usuarios: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "usuarios", "crear");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { nombre_completo, correo, id_rol } = body;

    if (!nombre_completo || !correo || !id_rol) {
      return NextResponse.json(
        { error: "nombre_completo, correo e id_rol son requeridos" },
        { status: 400 }
      );
    }

    const existing = await query("SELECT 1 FROM usuarios WHERE correo = $1", [correo]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese correo" },
        { status: 409 }
      );
    }

    const rolResult = await query<RolRow>("SELECT id_rol FROM roles WHERE id_rol = $1", [id_rol]);
    if (rolResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Rol no válido" },
        { status: 400 }
      );
    }

    const tempPassword = crypto.randomBytes(8).toString("hex").substring(0, 10);
    const passwordHash = await hashPassword(tempPassword);

    const result = await query<{ id_usuario: number }>(
      `INSERT INTO usuarios (nombre_completo, correo, password_hash, id_rol, debe_cambiar_password)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id_usuario`,
      [nombre_completo, correo, passwordHash, id_rol]
    );

    return NextResponse.json(
      { mensaje: "Usuario creado", id_usuario: result.rows[0].id_usuario, tempPassword },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
