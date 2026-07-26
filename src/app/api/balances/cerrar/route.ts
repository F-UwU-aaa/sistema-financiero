import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

interface PeriodoRow {
  id_periodo: number;
  estado: string;
  balance_generado: boolean;
  balance_aprobado: boolean;
}

export async function POST(request: NextRequest) {
  const denial = await verificarPermiso(request, "balances", "modificar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);

  try {
    const body = await request.json();
    const { id_periodo } = body;

    if (!id_periodo) {
      return NextResponse.json({ error: "id_periodo es requerido" }, { status: 400 });
    }

    const existing = await query<PeriodoRow>(
      "SELECT id_periodo, estado, balance_generado, balance_aprobado FROM periodos_fiscales WHERE id_periodo = $1",
      [id_periodo]
    );

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
    }

    const periodo = existing.rows[0];

    if (periodo.estado !== "Abierto") {
      return NextResponse.json(
        { error: "Solo se pueden cerrar períodos abiertos" },
        { status: 409 }
      );
    }

    if (!periodo.balance_generado) {
      return NextResponse.json(
        { error: "No se puede cerrar: el balance aún no ha sido generado" },
        { status: 409 }
      );
    }

    if (!periodo.balance_aprobado) {
      return NextResponse.json(
        { error: "No se puede cerrar: el balance aún no ha sido aprobado por el Gerente Financiero" },
        { status: 409 }
      );
    }

    await query(
      `UPDATE periodos_fiscales
       SET estado = 'Cerrado',
           fecha_cierre = NOW(),
           id_usuario_cierre = $1,
           balance_generado = FALSE,
           balance_aprobado = FALSE,
           fecha_balance = NULL,
           id_usuario_genera_balance = NULL,
           id_usuario_aprueba_balance = NULL,
           fecha_aprobacion_balance = NULL
       WHERE id_periodo = $2 AND estado = 'Abierto'`,
      [session!.id_usuario, id_periodo]
    );

    return NextResponse.json({ mensaje: "Período cerrado exitosamente" });
  } catch (error) {
    console.error("Error al cerrar período:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
