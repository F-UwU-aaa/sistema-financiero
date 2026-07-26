import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import type { Cliente } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const estado = searchParams.get("estado");

  let sql = "SELECT * FROM clientes WHERE TRUE";
  const params: unknown[] = [];
  let idx = 1;

  if (estado) {
    sql += ` AND estado = $${idx++}`;
    params.push(estado);
  }

  sql += " ORDER BY razon_social";

  const result = await query<Cliente>(sql, params);
  return NextResponse.json({ clientes: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "proveedores_clientes", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { razon_social, nit, contacto, datos_facturacion, monto_relacion } = body;

    if (!razon_social) {
      return NextResponse.json({ error: "razon_social es requerido" }, { status: 400 });
    }

    if (nit) {
      const dup = await query("SELECT 1 FROM clientes WHERE nit = $1", [nit]);
      if (dup.rows.length > 0) {
        return NextResponse.json({ error: "Ya existe un cliente con ese NIT" }, { status: 409 });
      }
    }

    const umbralResult = await query(
      "SELECT valor FROM configuracion_sistema WHERE clave = 'umbral_aprobacion_proveedores'"
    );
    const umbral = Number(umbralResult.rows[0]?.valor || 50000);

    const monto = monto_relacion ? Number(monto_relacion) : 0;
    const estado = monto >= umbral ? "Pendiente" : "Aprobado";

    const result = await query<Cliente>(
      `INSERT INTO clientes (razon_social, nit, contacto, datos_facturacion, monto_relacion, estado, id_usuario_registra)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [razon_social, nit || null, contacto || null, datos_facturacion || null, monto_relacion || null, estado, session!.id_usuario]
    );

    return NextResponse.json(
      { mensaje: estado === "Pendiente" ? "Cliente creado, pendiente de aprobación" : "Cliente creado y aprobado automáticamente", cliente: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear cliente:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
