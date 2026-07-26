import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { COOKIE_NAME, verifySession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const session = verifySession(token!);
  if (!session || session.nombre_rol !== "Administrador del Sistema") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [usuariosPorRol, usuariosActivos, loginsHoy, fallidos7d, accesosRecientes] =
    await Promise.all([
      query<{ nombre_rol: string; cantidad: string }>(
        `SELECT r.nombre_rol, COUNT(u.id_usuario)::text AS cantidad
         FROM roles r LEFT JOIN usuarios u ON r.id_rol = u.id_rol
         GROUP BY r.id_rol, r.nombre_rol ORDER BY r.id_rol`
      ),
      query<{ activo: boolean; cantidad: string }>(
        `SELECT activo, COUNT(*)::text AS cantidad FROM usuarios GROUP BY activo`
      ),
      query<{ cantidad: string }>(
        `SELECT COUNT(*)::text AS cantidad FROM historial_accesos
         WHERE fecha_hora::date = CURRENT_DATE AND resultado = 'Exitoso'`
      ),
      query<{ cantidad: string }>(
        `SELECT COUNT(*)::text AS cantidad FROM historial_accesos
         WHERE resultado = 'Fallido' AND fecha_hora > NOW() - INTERVAL '7 days'`
      ),
      query<{
        nombre_completo: string;
        correo: string;
        fecha_hora: string;
        ip_origen: string;
        resultado: string;
      }>(
        `SELECT u.nombre_completo, u.correo, h.fecha_hora::text, h.ip_origen, h.resultado
         FROM historial_accesos h JOIN usuarios u ON h.id_usuario = u.id_usuario
         ORDER BY h.fecha_hora DESC LIMIT 20`
      ),
    ]);

  return NextResponse.json({
    usuarios_por_rol: usuariosPorRol.rows,
    usuarios_activos: usuariosActivos.rows,
    logins_hoy: Number(loginsHoy.rows[0].cantidad),
    fallidos_7d: Number(fallidos7d.rows[0].cantidad),
    accesos_recientes: accesosRecientes.rows,
  });
}
