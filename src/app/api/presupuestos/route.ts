import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME } from "@/lib/auth";
import { verifySession } from "@/lib/auth";

interface PresupuestoRow {
  id_presupuesto: number;
  id_area: number;
  id_periodo: number;
  monto_total_propuesto: string;
  monto_total_aprobado: string | null;
  estado: string;
  motivo_rechazo: string | null;
  id_usuario_elabora: number;
  id_usuario_aprueba: number | null;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  nombre_area: string;
  nombre_periodo: string;
  elabora_nombre: string;
  aprueba_nombre: string | null;
}

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "presupuestos", "leer");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  const { searchParams } = request.nextUrl;
  const id_periodo = searchParams.get("id_periodo");
  const estado = searchParams.get("estado");
  const id_area = searchParams.get("id_area");

  let sql = `
    SELECT p.*, a.nombre_area, f.nombre_periodo,
           u_elab.nombre_completo AS elabora_nombre,
           u_aprob.nombre_completo AS aprueba_nombre
    FROM presupuestos p
    JOIN areas_departamentos a ON p.id_area = a.id_area
    JOIN periodos_fiscales f ON p.id_periodo = f.id_periodo
    JOIN usuarios u_elab ON p.id_usuario_elabora = u_elab.id_usuario
    LEFT JOIN usuarios u_aprob ON p.id_usuario_aprueba = u_aprob.id_usuario
    WHERE TRUE
  `;
  const params: unknown[] = [];
  let idx = 1;

  if (session!.nombre_rol === "Contador") {
    sql += ` AND p.id_usuario_elabora = $${idx++}`;
    params.push(session!.id_usuario);
  }

  if (id_periodo) {
    sql += ` AND p.id_periodo = $${idx++}`;
    params.push(id_periodo);
  }
  if (estado) {
    sql += ` AND p.estado = $${idx++}`;
    params.push(estado);
  }
  if (id_area) {
    sql += ` AND p.id_area = $${idx++}`;
    params.push(id_area);
  }

  sql += " ORDER BY p.fecha_creacion DESC";

  const result = await query<PresupuestoRow>(sql, params);
  return NextResponse.json({ presupuestos: result.rows });
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "presupuestos", "crear");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_area, id_periodo, partidas } = body;

    if (!id_area || !id_periodo || !Array.isArray(partidas) || partidas.length === 0) {
      return NextResponse.json(
        { error: "id_area, id_periodo y partidas (array no vacío) son requeridos" },
        { status: 400 }
      );
    }

    const areaCheck = await query("SELECT 1 FROM areas_departamentos WHERE id_area = $1 AND activo = TRUE", [id_area]);
    if (areaCheck.rows.length === 0) {
      return NextResponse.json({ error: "Área no encontrada o inactiva" }, { status: 404 });
    }

    const periodoCheck = await query<{ estado: string }>(
      "SELECT estado FROM periodos_fiscales WHERE id_periodo = $1", [id_periodo]
    );
    if (periodoCheck.rows.length === 0) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    }
    if (periodoCheck.rows[0].estado === "Cerrado") {
      return NextResponse.json({ error: "No se puede crear presupuesto en un período cerrado" }, { status: 409 });
    }

    const duplicado = await query(
      "SELECT 1 FROM presupuestos WHERE id_area = $1 AND id_periodo = $2",
      [id_area, id_periodo]
    );
    if (duplicado.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe una propuesta de presupuesto para esta área en este período" },
        { status: 409 }
      );
    }

    for (const p of partidas) {
      if (!p.id_categoria || p.monto_asignado === undefined) {
        return NextResponse.json(
          { error: "Cada partida debe tener id_categoria y monto_asignado" },
          { status: 400 }
        );
      }
      const catCheck = await query("SELECT 1 FROM categorias WHERE id_categoria = $1", [p.id_categoria]);
      if (catCheck.rows.length === 0) {
        return NextResponse.json({ error: `Categoría ${p.id_categoria} no encontrada` }, { status: 404 });
      }
    }

    const montoTotal = partidas.reduce(
      (sum: number, p: { monto_asignado: number }) => sum + Number(p.monto_asignado),
      0
    );

    const result = await withTransaction(async (client) => {
      const presResult = await client.query<{ id_presupuesto: number }>(
        `INSERT INTO presupuestos (id_area, id_periodo, monto_total_propuesto, estado, id_usuario_elabora)
         VALUES ($1, $2, $3, 'Borrador', $4)
         RETURNING id_presupuesto`,
        [id_area, id_periodo, montoTotal, session!.id_usuario]
      );

      const idPresupuesto = presResult.rows[0].id_presupuesto;

      for (const p of partidas) {
        await client.query(
          "INSERT INTO partidas_presupuestarias (id_presupuesto, id_categoria, monto_asignado) VALUES ($1, $2, $3)",
          [idPresupuesto, p.id_categoria, p.monto_asignado]
        );
      }

      return idPresupuesto;
    });

    return NextResponse.json(
      { mensaje: "Propuesta creada como borrador", id_presupuesto: result },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear presupuesto:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

import { withTransaction } from "@/lib/db";
