import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { notificarRol } from "@/lib/notificaciones";

interface PeriodoRow {
  id_periodo: number;
  estado: string;
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "balances", "aprobar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_periodo, motivo } = body;

    if (!id_periodo) {
      return NextResponse.json({ error: "id_periodo es requerido" }, { status: 400 });
    }

    if (!motivo || motivo.trim() === "") {
      return NextResponse.json(
        { error: "El motivo de reapertura es requerido" },
        { status: 400 }
      );
    }

    const existing = await query<PeriodoRow>(
      "SELECT id_periodo, estado FROM periodos_fiscales WHERE id_periodo = $1",
      [id_periodo]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    }

    if (existing.rows[0].estado !== "Cerrado") {
      return NextResponse.json(
        { error: "Solo se pueden reabrir períodos cerrados" },
        { status: 409 }
      );
    }

    await query(
      `UPDATE periodos_fiscales
       SET estado = 'Abierto',
           motivo_reapertura = $1,
           id_usuario_autoriza_reapertura = $2,
           fecha_cierre = NULL,
           id_usuario_cierre = NULL,
           id_usuario_aprueba_cierre = NULL,
           balance_generado = FALSE,
           balance_aprobado = FALSE,
           fecha_balance = NULL,
           id_usuario_genera_balance = NULL,
           id_usuario_aprueba_balance = NULL,
           fecha_aprobacion_balance = NULL
       WHERE id_periodo = $3 AND estado = 'Cerrado'`,
      [motivo.trim(), session!.id_usuario, id_periodo]
    );

    await notificarRol(
      3,
      "periodo_reabierto",
      `El período #${id_periodo} fue reabierto por ${session!.nombre_rol}. Motivo: ${motivo.trim()}`
    );

    return NextResponse.json({ mensaje: "Período reabierto exitosamente" });
  } catch (error) {
    console.error("Error al reabrir período:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
