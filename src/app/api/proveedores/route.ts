import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { notificarRol } from "@/lib/notificaciones";
import type { Proveedor } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const estado = searchParams.get("estado");

  let sql = "SELECT * FROM proveedores WHERE TRUE";
  const params: unknown[] = [];
  let idx = 1;

  if (estado) {
    sql += ` AND estado = $${idx++}`;
    params.push(estado);
  }

  sql += " ORDER BY razon_social";

  const result = await query<Proveedor>(sql, params);
  return NextResponse.json({ proveedores: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { razon_social, nit, contacto, condiciones_pago, datos_cuenta_pago, monto_contrato } = body;

    if (!razon_social || !nit) {
      return NextResponse.json(
        { error: "razon_social y nit son requeridos" },
        { status: 400 }
      );
    }

    const dup = await query("SELECT 1 FROM proveedores WHERE nit = $1", [nit]);
    if (dup.rows.length > 0) {
      return NextResponse.json({ error: "Ya existe un proveedor con ese NIT" }, { status: 409 });
    }

    const umbralResult = await query(
      "SELECT valor FROM configuracion_sistema WHERE clave = 'umbral_aprobacion_proveedores'"
    );
    const umbral = Number(umbralResult.rows[0]?.valor || 50000);

    const monto = monto_contrato ? Number(monto_contrato) : 0;
    const estado = monto >= umbral ? "Pendiente" : "Aprobado";

    const result = await query<Proveedor>(
      `INSERT INTO proveedores (razon_social, nit, contacto, condiciones_pago, datos_cuenta_pago, monto_contrato, estado, id_usuario_registra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [razon_social, nit, contacto || null, condiciones_pago || null, datos_cuenta_pago || null, monto_contrato || null, estado, session!.id_usuario]
    );

    if (estado === "Pendiente") {
      await notificarRol(
        2,
        "proveedor_pendiente",
        `Nuevo proveedor "${razon_social}" registrado, pendiente de aprobación.`
      );
    }

    return NextResponse.json(
      { mensaje: estado === "Pendiente" ? "Proveedor creado, pendiente de aprobación" : "Proveedor creado y aprobado automáticamente", proveedor: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
