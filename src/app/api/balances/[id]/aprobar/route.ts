import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import { COOKIE_NAME, verifySession } from "@/lib/auth";
import { crearNotificacion } from "@/lib/notificaciones";

interface PeriodoRow {
  id_periodo: number;
  balance_generado: boolean;
  balance_aprobado: boolean;
  estado: string;
  id_usuario_genera_balance: number | null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denial = await verificarPermiso(request, "balances", "aprobar");
  if (denial) return denial;

  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  const { id } = await params;

  const existing = await query<PeriodoRow>(
    "SELECT id_periodo, balance_generado, balance_aprobado, estado, id_usuario_genera_balance FROM periodos_fiscales WHERE id_periodo = $1",
    [id]
  );

  if (existing.rows.length === 0) {
    return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });
  }

  const periodo = existing.rows[0];

  if (periodo.estado !== "Abierto") {
    return NextResponse.json(
      { error: "Solo se pueden aprobar balances de períodos abiertos" },
      { status: 409 }
    );
  }

  if (!periodo.balance_generado) {
    return NextResponse.json(
      { error: "El balance aún no ha sido generado por el Contador" },
      { status: 409 }
    );
  }

  try {
    const body = await request.json();
    const { accion } = body;

    if (accion !== "aprobar" && accion !== "rechazar") {
      return NextResponse.json(
        { error: "accion debe ser 'aprobar' o 'rechazar'" },
        { status: 400 }
      );
    }

    if (accion === "aprobar") {
      await query(
        `UPDATE periodos_fiscales
         SET balance_aprobado = TRUE,
             id_usuario_aprueba_balance = $1,
             fecha_aprobacion_balance = NOW()
         WHERE id_periodo = $2`,
        [session!.id_usuario, id]
      );
      if (periodo.id_usuario_genera_balance) {
        await crearNotificacion({
          id_usuario_destino: periodo.id_usuario_genera_balance,
          tipo_evento: "balance_aprobado",
          mensaje: `El balance del período #${id} fue aprobado por ${session!.nombre_rol}.`,
        });
      }
      return NextResponse.json({ mensaje: "Balance aprobado" });
    } else {
      await query(
        `UPDATE periodos_fiscales
         SET balance_generado = FALSE,
             fecha_balance = NULL,
             id_usuario_genera_balance = NULL,
             balance_aprobado = FALSE,
             id_usuario_aprueba_balance = NULL,
             fecha_aprobacion_balance = NULL
         WHERE id_periodo = $1`,
        [id]
      );
      if (periodo.id_usuario_genera_balance) {
        await crearNotificacion({
          id_usuario_destino: periodo.id_usuario_genera_balance,
          tipo_evento: "balance_rechazado",
          mensaje: `El balance del período #${id} fue rechazado por ${session!.nombre_rol}. Debe regenerarlo.`,
        });
      }
      return NextResponse.json({ mensaje: "Balance rechazado. El Contador debe regenerarlo." });
    }
  } catch (error) {
    console.error("Error al procesar balance:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
