export interface SessionPayload {
  id_usuario: number;
  id_rol: number;
  nombre_rol: string;
  nombre_completo: string;
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
  fecha_cierre?: string | null;
  balance_generado?: boolean;
  balance_aprobado?: boolean;
  motivo_reapertura?: string | null;
  fecha_aprobacion_balance?: string | null;
  id_usuario_autoriza_reapertura?: number | null;
}

export interface ConfigItem {
  id_config: number;
  clave: string;
  valor: string;
  descripcion: string | null;
}

export interface CuentaContable {
  id_cuenta: number;
  codigo_cuenta: string;
  nombre_cuenta: string;
  tipo_cuenta: string;
  id_cuenta_padre: number | null;
  activo: boolean;
}

export interface CuentaBancaria {
  id_cuenta_bancaria: number;
  nombre_cuenta: string;
  tipo: string;
  numero_cuenta: string | null;
  saldo_actual: string;
  activo: boolean;
}

export interface Proveedor {
  id_proveedor: number;
  razon_social: string;
  nit: string;
  contacto: string | null;
  condiciones_pago: string | null;
  datos_cuenta_pago: string | null;
  monto_contrato: string | null;
  estado: string;
  motivo_rechazo: string | null;
  id_usuario_registra: number;
  id_usuario_aprueba: number | null;
  fecha_creacion?: string;
}

export interface Cliente {
  id_cliente: number;
  razon_social: string;
  nit: string | null;
  contacto: string | null;
  datos_facturacion: string | null;
  monto_relacion: string | null;
  estado: string;
  motivo_rechazo: string | null;
  id_usuario_registra: number;
}

export interface Factura {
  id_factura: number;
  tipo: "Compra" | "Venta";
  id_proveedor: number | null;
  id_cliente: number | null;
  id_partida: number | null;
  numero_factura: string;
  monto: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  estado: string;
  motivo_anulacion: string | null;
  id_usuario_registra: number;
  fecha_registro: string;
  nombre_proveedor?: string;
  nombre_cliente?: string;
  categoria_partida?: string;
}

export interface SolicitudPago {
  id_solicitud: number;
  id_factura: number;
  monto: string;
  estado: string;
  tipo_aprobacion: string;
  motivo_rechazo: string | null;
  id_usuario_solicita: number;
  id_usuario_aprueba: number | null;
  fecha_solicitud: string;
  fecha_resolucion: string | null;
  numero_factura?: string;
  razon_social_proveedor?: string;
}

export interface PartidaPresupuestaria {
  id_partida: number;
  id_presupuesto: number;
  id_categoria: number;
  monto_asignado: string;
  monto_ejecutado: string;
  nombre_categoria?: string;
}

export interface Presupuesto {
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
  nombre_area?: string;
  nombre_periodo?: string;
}

export interface Pago {
  id_pago: number;
  id_solicitud: number;
  id_cuenta_bancaria: number;
  metodo: string;
  numero_operacion: string | null;
  monto: string;
  fecha_pago: string;
  id_usuario_ejecuta: number;
  observacion_rechazo: string | null;
  numero_factura?: string;
  razon_social_proveedor?: string;
  nombre_cuenta_bancaria?: string;
}

export interface Cobro {
  id_cobro: number;
  id_factura: number;
  id_cuenta_bancaria: number;
  monto: string;
  fecha_cobro: string;
  id_usuario_ejecuta: number;
  numero_factura?: string;
  nombre_cliente?: string;
  nombre_cuenta_bancaria?: string;
}

export interface PeriodoFiscalCompleto extends PeriodoFiscal {
  fecha_cierre: string | null;
  id_usuario_cierre: number | null;
  id_usuario_aprueba_cierre: number | null;
  motivo_reapertura: string | null;
  balance_generado: boolean;
  fecha_balance: string | null;
  id_usuario_genera_balance: number | null;
  balance_aprobado: boolean;
  id_usuario_aprueba_balance: number | null;
  fecha_aprobacion_balance: string | null;
  id_usuario_autoriza_reapertura: number | null;
  nombre_usuario_cierre: string | null;
  nombre_usuario_aprueba_balance: string | null;
  nombre_usuario_autoriza_reapertura: string | null;
}

export interface EstadoResultados {
  ingresos: number;
  gastos: number;
  resultado_neto: number;
}

export interface BalanceGeneral {
  activo: {
    cuentas_bancarias: number;
    cuentas_por_cobrar: number;
    total: number;
  };
  pasivo: {
    cuentas_por_pagar: number;
    total: number;
  };
  patrimonio: number;
}

export interface EjecucionArea {
  nombre_area: string;
  aprobado: number;
  propuesto: number;
  ejecutado: number;
}

export interface EjecucionCategoria {
  nombre_categoria: string;
  tipo: string;
  asignado: number;
  ejecutado: number;
}

export interface EjecucionPresupuestaria {
  total_aprobado: number;
  total_propuesto: number;
  total_ejecutado: number;
  por_area: EjecucionArea[];
  por_categoria: EjecucionCategoria[];
}

export interface BalanceResultado {
  periodo: PeriodoFiscalCompleto;
  estado_resultados: EstadoResultados;
  balance_general: BalanceGeneral;
  ejecucion_presupuestaria: EjecucionPresupuestaria;
}

export interface ObservacionAuditoria {
  id_observacion: number;
  modulo_afectado: string;
  referencia_id: number | null;
  tipo_transaccion: string | null;
  motivo: string;
  estado: string;
  id_usuario_auditor: number;
  respuesta_gerente: string | null;
  fecha_registro: string;
  fecha_cierre: string | null;
  nombre_auditor?: string;
  nombre_gerente?: string;
}

export interface Notificacion {
  id_notificacion: number;
  id_usuario_destino: number;
  tipo_evento: string;
  mensaje: string;
  leida: boolean;
  fecha_creacion: string;
}
