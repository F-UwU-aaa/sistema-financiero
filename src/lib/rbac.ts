import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

export type Modulo =
  | "usuarios"
  | "configuracion"
  | "presupuestos"
  | "cuentas_contables"
  | "cuentas_bancarias"
  | "pagos"
  | "cobros"
  | "balances"
  | "facturacion"
  | "proveedores_clientes"
  | "auditoria";

export type Accion = "crear" | "leer" | "modificar" | "aprobar" | "ejecutar" | "desactivar";

export type Rol = "Administrador del Sistema" | "Gerente Financiero" | "Contador" | "Tesorero" | "Auditor";

/**
 * Matriz de permisos por módulo y rol.
 *
 * Fuente: sección 6 de docs/roles-permisos-sistema-financiero.md.
 *
 * Mapeo de acciones especiales de la matriz original al enum Accion:
 * - "cierra" (Balances, Contador) → se mapea a "modificar". Cuando se
 *   implemente el cierre de periodo, la ruta debe verificar
 *   tienePermiso(rol, "balances", "modificar").
 * - "autoriza reapertura" (Balances, Gerente Financiero) → se mapea a
 *   "aprobar". Cuando se implemente la reapertura de periodo, la ruta
 *   debe verificar tienePermiso(rol, "balances", "aprobar").
 * - "Ap altas grandes" (Proveedores/Clientes, Gerente Financiero) → se
 *   mapea a "aprobar". El umbral es configurable, pero la verificación
 *   de permisos usa la misma acción "aprobar".
 * - "L (datos bancarios)" (Proveedores/Clientes, Tesorero) → se mapea
 *   a "leer". El Tesorero solo consulta datos bancarios de
 *   proveedores, no puede crear/editar el registro.
 *
 * Fail-closed: cualquier combinación no listada retorna false.
 */
const MATRIZ_PERMISOS: Record<Modulo, Record<Rol, Accion[]>> = {
  usuarios: {
    "Administrador del Sistema": ["crear", "leer", "modificar", "desactivar"],
    "Gerente Financiero": [],
    "Contador": [],
    "Tesorero": [],
    "Auditor": ["leer"],
  },
  configuracion: {
    "Administrador del Sistema": ["crear", "leer", "modificar"],
    "Gerente Financiero": ["leer"],
    "Contador": ["leer"],
    "Tesorero": ["leer"],
    "Auditor": ["leer"],
  },
  presupuestos: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer", "aprobar"],
    "Contador": ["crear", "leer", "modificar"],
    "Tesorero": [],
    "Auditor": ["leer"],
  },
  cuentas_contables: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer"],
    "Contador": ["crear", "leer", "modificar"],
    "Tesorero": [],
    "Auditor": ["leer"],
  },
  cuentas_bancarias: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer"],
    "Contador": ["leer"],
    "Tesorero": ["crear", "leer", "modificar"],
    "Auditor": ["leer"],
  },
  pagos: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer", "aprobar"],
    "Contador": ["crear", "leer"],
    "Tesorero": ["leer", "ejecutar"],
    "Auditor": ["leer"],
  },
  cobros: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer"],
    "Contador": ["leer"],
    "Tesorero": ["crear", "leer"],
    "Auditor": ["leer"],
  },
  balances: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer", "aprobar"],
    "Contador": ["crear", "leer", "modificar"],
    "Tesorero": ["leer"],
    "Auditor": ["leer"],
  },
  facturacion: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer"],
    "Contador": ["crear", "leer", "modificar"],
    "Tesorero": ["leer"],
    "Auditor": ["leer"],
  },
  proveedores_clientes: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer", "aprobar"],
    "Contador": ["crear", "leer", "modificar"],
    "Tesorero": ["leer"],
    "Auditor": ["leer"],
  },
  auditoria: {
    "Administrador del Sistema": [],
    "Gerente Financiero": ["leer"],
    "Contador": [],
    "Tesorero": [],
    "Auditor": ["crear", "leer"],
  },
};

export function tienePermiso(rol: string, modulo: string, accion: string): boolean {
  const permisosModulo = MATRIZ_PERMISOS[modulo as Modulo];
  if (!permisosModulo) return false;

  const permisosRol = permisosModulo[rol as Rol];
  if (!permisosRol) return false;

  return permisosRol.includes(accion as Accion);
}

export async function verificarPermiso(
  request: NextRequest,
  modulo: string,
  accion: string
): Promise<NextResponse | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: "No hay sesión activa" },
      { status: 401 }
    );
  }

  const session = verifySession(token);

  if (!session) {
    return NextResponse.json(
      { error: "Sesión inválida" },
      { status: 401 }
    );
  }

  if (!tienePermiso(session.nombre_rol, modulo, accion)) {
    return NextResponse.json(
      { error: "No tiene permiso para realizar esta acción" },
      { status: 403 }
    );
  }

  return null;
}

export async function getRolActual(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const session = verifySession(token);
    if (!session) return null;

    return session.nombre_rol;
  } catch {
    return null;
  }
}

export async function getUsuarioActual(): Promise<{ nombre_rol: string; nombre_completo: string } | null> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const session = verifySession(token);
    if (!session) return null;

    return {
      nombre_rol: session.nombre_rol,
      nombre_completo: session.nombre_completo,
    };
  } catch {
    return null;
  }
}

export const MODULOS: Record<Modulo, string> = {
  usuarios: "Usuarios y Roles",
  configuracion: "Configuración del sistema",
  presupuestos: "Presupuestos",
  cuentas_contables: "Cuentas contables",
  cuentas_bancarias: "Cuentas bancarias / Caja",
  pagos: "Pagos",
  cobros: "Cobros",
  balances: "Balances y cierre de periodo",
  facturacion: "Facturación / Comprobantes",
  proveedores_clientes: "Proveedores / Clientes",
  auditoria: "Auditoría",
};
