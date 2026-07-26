import { query } from "@/lib/db";
import type { PoolClient } from "pg";

interface NotifParams {
  id_usuario_destino: number;
  tipo_evento: string;
  mensaje: string;
}

export async function crearNotificacion(
  params: NotifParams,
  client?: PoolClient
): Promise<void> {
  const sql = `INSERT INTO notificaciones (id_usuario_destino, tipo_evento, mensaje)
               VALUES ($1, $2, $3)`;
  const vals = [params.id_usuario_destino, params.tipo_evento, params.mensaje];
  if (client) {
    await client.query(sql, vals);
  } else {
    await query(sql, vals);
  }
}

export async function notificarRol(
  id_rol: number,
  tipo_evento: string,
  mensaje: string,
  client?: PoolClient
): Promise<void> {
  const result = client
    ? await client.query<{ id_usuario: number }>(
        "SELECT id_usuario FROM usuarios WHERE id_rol = $1 AND activo = TRUE",
        [id_rol]
      )
    : await query<{ id_usuario: number }>(
        "SELECT id_usuario FROM usuarios WHERE id_rol = $1 AND activo = TRUE",
        [id_rol]
      );
  for (const u of result.rows) {
    await crearNotificacion(
      { id_usuario_destino: u.id_usuario, tipo_evento, mensaje },
      client
    );
  }
}
