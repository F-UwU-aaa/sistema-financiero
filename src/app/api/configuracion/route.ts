import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { verificarPermiso } from "@/lib/rbac";
import type { ConfigItem } from "@/types";

export async function GET(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "leer");
  if (denial) return denial;

  const result = await query<ConfigItem>(
    "SELECT id_config, clave, valor, descripcion FROM configuracion_sistema ORDER BY clave"
  );
  return NextResponse.json({ configuracion: result.rows });
}

export async function PUT(request: NextRequest) {
  const denial = await verificarPermiso(request, "configuracion", "modificar");
  if (denial) return denial;

  try {
    const body = await request.json();
    const { clave, valor } = body;

    if (!clave || valor === undefined) {
      return NextResponse.json(
        { error: "clave y valor son requeridos" },
        { status: 400 }
      );
    }

    // Nota: las claves duracion_sesion_minutos y dias_expiracion_password
    // son configurables aquí pero NO están conectadas al endpoint de login
    // (src/app/api/auth/login/route.ts), que sigue usando exp hardcodeado
    // a 24h. Cuando se implemente la conexión, login/route.ts debe leer
    // estas claves desde configuracion_sistema en vez de usar valores fijos.

    await query(
      `INSERT INTO configuracion_sistema (clave, valor)
       VALUES ($1, $2)
       ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
      [clave, valor]
    );

    return NextResponse.json({ mensaje: "Configuración actualizada" });
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
