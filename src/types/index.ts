export interface SessionPayload {
  id_usuario: number;
  id_rol: number;
  nombre_rol: string;
  debe_cambiar_password: boolean;
  exp: number;
}

export interface UsuarioRow {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  password_hash: string;
  id_rol: number;
  activo: boolean;
  debe_cambiar_password: boolean;
  ultimo_acceso?: string;
}

export interface RolRow {
  nombre_rol: string;
}
