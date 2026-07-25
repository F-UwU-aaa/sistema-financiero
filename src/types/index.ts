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
  id_rol: number;
  nombre_rol: string;
}

export interface UsuarioConRol {
  id_usuario: number;
  nombre_completo: string;
  correo: string;
  id_rol: number;
  nombre_rol: string;
  activo: boolean;
  debe_cambiar_password: boolean;
  fecha_creacion: string;
  ultimo_acceso: string | null;
}

export interface HistorialAcceso {
  id_acceso: number;
  id_usuario: number;
  fecha_hora: string;
  ip_origen: string;
  resultado: string;
}

export interface Area {
  id_area: number;
  nombre_area: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  tipo: string;
}

export interface PeriodoFiscal {
  id_periodo: number;
  nombre_periodo: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
}

export interface ConfigItem {
  id_config: number;
  clave: string;
  valor: string;
  descripcion: string | null;
}
