import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { Factura } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "facturacion", "leer");
  if (denial) return denial;

  const { searchParams } = request.nextUrl;
  const tipo = searchParams.get("tipo");
  const estado = searchParams.get("estado");
  const id_proveedor = searchParams.get("id_proveedor");
  const id_cliente = searchParams.get("id_cliente");

  let sql = `
    SELECT f.*,
           pr.razon_social AS nombre_proveedor,
           cl.razon_social AS nombre_cliente,
           ca.nombre_categoria AS categoria_partida
    FROM facturas f
    LEFT JOIN proveedores pr ON f.id_proveedor = pr.id_proveedor
    LEFT JOIN clientes cl ON f.id_cliente = cl.id_cliente
    LEFT JOIN partidas_presupuestarias pp ON f.id_partida = pp.id_partida
    LEFT JOIN categorias ca ON pp.id_categoria = ca.id_categoria
    WHERE TRUE
  `;
  const params: unknown[] = [];
  let idx = 1;

  if (tipo) {
    sql += ` AND f.tipo = $${idx++}`;
    params.push(tipo);
  }
  if (estado) {
    sql += ` AND f.estado = $${idx++}`;
    params.push(estado);
  }
  if (id_proveedor) {
    sql += ` AND f.id_proveedor = $${idx++}`;
    params.push(id_proveedor);
  }
  if (id_cliente) {
    sql += ` AND f.id_cliente = $${idx++}`;
    params.push(id_cliente);
  }

  sql += " ORDER BY f.fecha_registro DESC";

  const result = await query<Factura>(sql, params);
  return NextResponse.json({ facturas: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "facturacion", "crear");
  if (denial) return denial;

  const token = request.cookies.get("session")?.value;
  const { verifySession } = await import("@/lib/auth");
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const {
      tipo,
      numero_factura,
      monto,
      fecha_emision,
      fecha_vencimiento,
      id_proveedor,
      id_cliente,
      id_partida,
    } = body;

    if (!tipo || !["Compra", "Venta"].includes(tipo)) {
      return NextResponse.json(
        { error: "tipo debe ser 'Compra' o 'Venta'" },
        { status: 400 }
      );
    }

    if (!numero_factura || !numero_factura.trim()) {
      return NextResponse.json(
        { error: "numero_factura es requerido" },
        { status: 400 }
      );
    }

    if (!monto || Number(monto) <= 0) {
      return NextResponse.json(
        { error: "monto debe ser mayor a 0" },
        { status: 400 }
      );
    }

    if (!fecha_emision) {
      return NextResponse.json(
        { error: "fecha_emision es requerida" },
        { status: 400 }
      );
    }

    if (tipo === "Compra") {
      if (!id_proveedor) {
        return NextResponse.json(
          { error: "id_proveedor es requerido para facturas de Compra" },
          { status: 400 }
        );
      }
      const prov = await query(
        "SELECT id_proveedor, estado FROM proveedores WHERE id_proveedor = $1",
        [id_proveedor]
      );
      if (prov.rows.length === 0) {
        return NextResponse.json(
          { error: "Proveedor no encontrado" },
          { status: 400 }
        );
      }
      if (prov.rows[0].estado !== "Aprobado") {
        return NextResponse.json(
          { error: "El proveedor debe estar Aprobado" },
          { status: 400 }
        );
      }
    }

    if (tipo === "Venta") {
      if (!id_cliente) {
        return NextResponse.json(
          { error: "id_cliente es requerido para facturas de Venta" },
          { status: 400 }
        );
      }
      const cli = await query(
        "SELECT id_cliente, estado FROM clientes WHERE id_cliente = $1",
        [id_cliente]
      );
      if (cli.rows.length === 0) {
        return NextResponse.json(
          { error: "Cliente no encontrado" },
          { status: 400 }
        );
      }
      if (cli.rows[0].estado !== "Aprobado") {
        return NextResponse.json(
          { error: "El cliente debe estar Aprobado" },
          { status: 400 }
        );
      }
    }

    if (id_partida) {
      const part = await query(
        "SELECT id_partida FROM partidas_presupuestarias WHERE id_partida = $1",
        [id_partida]
      );
      if (part.rows.length === 0) {
        return NextResponse.json(
          { error: "Partida presupuestaria no encontrada" },
          { status: 400 }
        );
      }
    }

    const dup = await query(
      "SELECT 1 FROM facturas WHERE numero_factura = $1",
      [numero_factura.trim()]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe una factura con ese número" },
        { status: 409 }
      );
    }

    const result = await query<Factura>(
      `INSERT INTO facturas (tipo, id_proveedor, id_cliente, id_partida, numero_factura, monto, fecha_emision, fecha_vencimiento, estado, id_usuario_registra)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendiente', $9) RETURNING *`,
      [
        tipo,
        id_proveedor || null,
        id_cliente || null,
        id_partida || null,
        numero_factura.trim(),
        monto,
        fecha_emision,
        fecha_vencimiento || null,
        session!.id_usuario,
      ]
    );

    return NextResponse.json(
      { mensaje: "Factura registrada", factura: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear factura:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
