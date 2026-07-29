import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { verificarPeriodoAbierto } from "@/lib/periodos";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { notificarRol } from "@/lib/notificaciones";

interface PartidaRow {
  id_partida: number;
  id_presupuesto: number;
  id_categoria: number;
  monto_asignado: string;
  monto_ejecutado: string;
  nombre_categoria: string;
  tipo: string;
}

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "presupuestos", "leer");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const result = await query<PresupuestoRow>(
    `SELECT p.*, a.nombre_area, f.nombre_periodo,
            u_elab.nombre_completo AS elabora_nombre,
            u_aprob.nombre_completo AS aprueba_nombre
     FROM presupuestos p
     JOIN areas_departamentos a ON p.id_area = a.id_area
     JOIN periodos_fiscales f ON p.id_periodo = f.id_periodo
     JOIN usuarios u_elab ON p.id_usuario_elabora = u_elab.id_usuario
     LEFT JOIN usuarios u_aprob ON p.id_usuario_aprueba = u_aprob.id_usuario
     WHERE p.id_presupuesto = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const presupuesto = result.rows[0];

  if (session!.nombre_rol === "Contador" && presupuesto.id_usuario_elabora !== session!.id_usuario) {
    return NextResponse.json({ error: "No tiene acceso a este presupuesto" }, { status: 403 });
  }

  const partidas = await query<PartidaRow>(
    `SELECT pp.*, c.nombre_categoria, c.tipo
     FROM partidas_presupuestarias pp
     JOIN categorias c ON pp.id_categoria = c.id_categoria
     WHERE pp.id_presupuesto = $1`,
    [id]
  );

  return NextResponse.json({ presupuesto, partidas: partidas.rows });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "presupuestos", "modificar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<PresupuestoRow>(
    "SELECT * FROM presupuestos WHERE id_presupuesto = $1", [id]
  );
  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }

  const presupuesto = existing.rows[0];

  const esContador = session!.nombre_rol === "Contador";
  const esGerente = session!.nombre_rol === "Gerente Financiero";
  const esOwner = presupuesto.id_usuario_elabora === session!.id_usuario;

  const puedeEditar =
    (esContador && esOwner && (presupuesto.estado === "Borrador" || presupuesto.estado === "Rechazado" || presupuesto.estado === "Aprobado")) ||
    (esGerente && presupuesto.estado === "Aprobado");

  if (!puedeEditar) {
    return NextResponse.json(
      { error: "No tiene permiso para editar este presupuesto en su estado actual" },
      { status: 409 }
    );
  }

  const cerrado = await verificarPeriodoAbierto(presupuesto.id_periodo);
  if (cerrado) return cerrado;

  try {
    const body = await request.json();
    const { id_area, partidas, enviar } = body;

    if (!Array.isArray(partidas) || partidas.length === 0) {
      return NextResponse.json(
        { error: "partidas (array no vacío) es requerido" },
        { status: 400 }
      );
    }

    for (const p of partidas) {
      if (!p.id_categoria || p.monto_asignado === undefined) {
        return NextResponse.json(
          { error: "Cada partida debe tener id_categoria y monto_asignado" },
          { status: 400 }
        );
      }
    }

    const montoTotal = partidas.reduce(
      (sum: number, p: { monto_asignado: number }) => sum + Number(p.monto_asignado),
      0
    );

    const contadorReenvia = esContador && presupuesto.estado === "Aprobado";
    const gerenteEditaDirecto = esGerente && presupuesto.estado === "Aprobado";

    let nuevoEstado: string;
    if (gerenteEditaDirecto) {
      nuevoEstado = "Aprobado";
    } else if (contadorReenvia) {
      nuevoEstado = "Pendiente";
    } else {
      nuevoEstado = enviar ? "Pendiente" : "Borrador";
    }

    // Get current partida IDs to detect removals
    const currentRows = await query<{ id_partida: number }>(
      "SELECT id_partida FROM partidas_presupuestarias WHERE id_presupuesto = $1",
      [id]
    );
    const currentIds = new Set(currentRows.rows.map(r => r.id_partida));
    const requestIds = new Set(
      partidas.filter((p: { id_partida?: number }) => p.id_partida != null).map((p: { id_partida: number }) => p.id_partida)
    );
    const toDelete = [...currentIds].filter(cid => !requestIds.has(cid));

    // Prevent deletion of partidas referenced by facturas
    if (toDelete.length > 0) {
      const fkCheck = await query<{ id_partida: number }>(
        "SELECT DISTINCT id_partida FROM facturas WHERE id_partida = ANY($1::int[]) LIMIT 1",
        [toDelete]
      );
      if (fkCheck.rows.length > 0) {
        return NextResponse.json(
          { error: "No se puede eliminar una o más partidas porque tienen facturas asociadas. Ajuste el monto en lugar de eliminar." },
          { status: 409 }
        );
      }
    }

    await withTransaction(async (client) => {
      const sets = ["monto_total_propuesto = $1", "estado = $2"];
      const vals: unknown[] = [montoTotal, nuevoEstado];
      let idx = 3;

      if (contadorReenvia) {
        sets.push(`id_usuario_aprueba = NULL`);
      }
      if (presupuesto.estado !== "Aprobado" || contadorReenvia || gerenteEditaDirecto) {
        sets.push(`motivo_rechazo = $${idx++}`);
        vals.push(null);
      }
      if (id_area !== undefined) {
        sets.push(`id_area = $${idx++}`);
        vals.push(id_area);
      }

      vals.push(id);
      await client.query(
        `UPDATE presupuestos SET ${sets.join(", ")} WHERE id_presupuesto = $${idx}`,
        vals
      );

      // Delete only partidas that were removed by the user
      if (toDelete.length > 0) {
        await client.query(
          "DELETE FROM partidas_presupuestarias WHERE id_partida = ANY($1::int[])",
          [toDelete]
        );
      }

      // UPDATE existing partidas, INSERT new ones
      for (const p of partidas) {
        if (p.id_partida) {
          await client.query(
            "UPDATE partidas_presupuestarias SET monto_asignado = $1 WHERE id_partida = $2",
            [p.monto_asignado, p.id_partida]
          );
        } else {
          await client.query(
            "INSERT INTO partidas_presupuestarias (id_presupuesto, id_categoria, monto_asignado) VALUES ($1, $2, $3)",
            [id, p.id_categoria, p.monto_asignado]
          );
        }
      }
    });

    if (enviar || contadorReenvia) {
      await notificarRol(
        2,
        "presupuesto_pendiente",
        `El presupuesto #${id} fue enviado a aprobación por ${session!.nombre_rol}`
      );
    }

    let mensaje = "Cambios guardados";
    if (contadorReenvia) mensaje = "Propuesta reenviada a aprobación";
    else if (gerenteEditaDirecto) mensaje = "Cambios guardados (presupuesto aprobado)";
    else mensaje = enviar ? "Propuesta enviada a aprobación" : "Borrador guardado";

    return NextResponse.json({ mensaje });
  } catch (error) {
    const pgError = error as { code?: string };
    if (pgError?.code === "23503") {
      return NextResponse.json(
        { error: "No se puede eliminar una partida que tiene facturas asociadas" },
        { status: 409 }
      );
    }
    console.error("Error al actualizar presupuesto:", error);
    return NextResponse.json(
      { error: `Error interno del servidor: ${String(error)}` },
      { status: 500 }
    );
  }
}
