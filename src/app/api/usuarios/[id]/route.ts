import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { UsuarioConRol, HistorialAcceso } from "@/types";

const TABLAS_CON_FK_USUARIO = [
  { tabla: "historial_accesos", columna: "id_usuario" },
  { tabla: "presupuestos", columna: "id_usuario_elabora" },
  { tabla: "presupuestos", columna: "id_usuario_aprueba" },
  { tabla: "solicitudes_pago", columna: "id_usuario_solicita" },
  { tabla: "solicitudes_pago", columna: "id_usuario_aprueba" },
  { tabla: "pagos", columna: "id_usuario_ejecuta" },
  { tabla: "cobros", columna: "id_usuario_ejecuta" },
  { tabla: "asientos_contables", columna: "id_usuario_registra" },
  { tabla: "facturas", columna: "id_usuario_registra" },
  { tabla: "observaciones_auditoria", columna: "id_usuario_auditor" },
  { tabla: "proveedores", columna: "id_usuario_registra" },
  { tabla: "proveedores", columna: "id_usuario_aprueba" },
  { tabla: "clientes", columna: "id_usuario_registra" },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "usuarios", "leer");
  if (denial) return denial;

  const { id } = await params;
  const result = await query<UsuarioConRol>(
    `SELECT u.id_usuario, u.nombre_completo, u.correo, u.id_rol, r.nombre_rol,
            u.activo, u.debe_cambiar_password, u.fecha_creacion::text, u.ultimo_acceso::text
     FROM usuarios u
     JOIN roles r ON u.id_rol = r.id_rol
     WHERE u.id_usuario = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const historial = await query<HistorialAcceso>(
    `SELECT id_acceso, id_usuario, fecha_hora::text, ip_origen, resultado
     FROM historial_accesos
     WHERE id_usuario = $1
     ORDER BY fecha_hora DESC
     LIMIT 50`,
    [id]
  );

  return NextResponse.json({
    usuario: result.rows[0],
    historial_accesos: historial.rows,
  });
}

export async function PUT(
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
    const body = await request.json();
    const { nombre_completo, correo, id_rol } = body;

    if (correo) {
      const dup = await query(
        "SELECT 1 FROM usuarios WHERE correo = $1 AND id_usuario != $2",
        [correo, id]
      );
      if (dup.rows.length > 0) {
        return NextResponse.json(
          { error: "Ya existe otro usuario con ese correo" },
          { status: 409 }
        );
      }
    }

    if (id_rol) {
      const rolCheck = await query("SELECT 1 FROM roles WHERE id_rol = $1", [id_rol]);
      if (rolCheck.rows.length === 0) {
        return NextResponse.json({ error: "Rol no válido" }, { status: 400 });
      }
    }

    const sets: string[] = [];
    const vals: unknown[] = [];
    let idx = 1;

    if (nombre_completo !== undefined) {
      sets.push(`nombre_completo = $${idx++}`);
      vals.push(nombre_completo);
    }
    if (correo !== undefined) {
      sets.push(`correo = $${idx++}`);
      vals.push(correo);
    }
    if (id_rol !== undefined) {
      sets.push(`id_rol = $${idx++}`);
      vals.push(id_rol);
    }

    if (sets.length === 0) {
      return NextResponse.json({ error: "No hay campos para actualizar" }, { status: 400 });
    }

    vals.push(id);
    await query(
      `UPDATE usuarios SET ${sets.join(", ")} WHERE id_usuario = $${idx}`,
      vals
    );

    return NextResponse.json({ mensaje: "Usuario actualizado" });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

  let tieneActividad = false;
  for (const { tabla, columna } of TABLAS_CON_FK_USUARIO) {
    const result = await query(
      `SELECT 1 FROM ${tabla} WHERE ${columna} = $1 LIMIT 1`,
      [id]
    );
    if (result.rows.length > 0) {
      tieneActividad = true;
      break;
    }
  }

  if (tieneActividad) {
    return NextResponse.json(
      {
        error: "Este usuario tiene actividad registrada. Use desactivar en su lugar.",
        tieneActividad: true,
      },
      { status: 409 }
    );
  }

  await query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);
  return NextResponse.json({ mensaje: "Usuario eliminado" });
}
