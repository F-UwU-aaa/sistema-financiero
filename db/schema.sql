-- 1. ROLES (catálogo fijo — exactamente 5 filas)
CREATE TABLE roles (
    id_rol       SERIAL PRIMARY KEY,
    nombre_rol   VARCHAR(50) NOT NULL UNIQUE,
    descripcion  TEXT
);

-- 2. USUARIOS
CREATE TABLE usuarios (
    id_usuario              SERIAL PRIMARY KEY,
    nombre_completo         VARCHAR(150) NOT NULL,
    correo                  VARCHAR(150) NOT NULL UNIQUE,
    password_hash           VARCHAR(255) NOT NULL,
    id_rol                  INTEGER NOT NULL REFERENCES roles(id_rol),
    activo                  BOOLEAN NOT NULL DEFAULT TRUE,
    debe_cambiar_password   BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion          TIMESTAMP NOT NULL DEFAULT NOW(),
    ultimo_acceso           TIMESTAMP
);

-- 3. AREAS / DEPARTAMENTOS (catálogo base, sin usuario propio)
CREATE TABLE areas_departamentos (
    id_area      SERIAL PRIMARY KEY,
    nombre_area  VARCHAR(100) NOT NULL,
    descripcion  TEXT,
    activo       BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. PERIODOS FISCALES
CREATE TABLE periodos_fiscales (
    id_periodo                 SERIAL PRIMARY KEY,
    nombre_periodo             VARCHAR(50) NOT NULL,
    fecha_inicio               DATE NOT NULL,
    fecha_fin                  DATE NOT NULL,
    estado                     VARCHAR(20) NOT NULL DEFAULT 'Abierto'
                                CHECK (estado IN ('Abierto','Cerrado')),
    fecha_cierre               TIMESTAMP,
    id_usuario_cierre          INTEGER REFERENCES usuarios(id_usuario),
    id_usuario_aprueba_cierre  INTEGER REFERENCES usuarios(id_usuario),
    motivo_reapertura          TEXT
);

-- 5. CATEGORIAS (ingreso / egreso)
CREATE TABLE categorias (
    id_categoria     SERIAL PRIMARY KEY,
    nombre_categoria VARCHAR(100) NOT NULL,
    tipo             VARCHAR(10) NOT NULL CHECK (tipo IN ('Ingreso','Egreso'))
);

-- 6. PRESUPUESTOS (cabecera por área + periodo)
CREATE TABLE presupuestos (
    id_presupuesto         SERIAL PRIMARY KEY,
    id_area                INTEGER NOT NULL REFERENCES areas_departamentos(id_area),
    id_periodo             INTEGER NOT NULL REFERENCES periodos_fiscales(id_periodo),
    monto_total_propuesto  NUMERIC(14,2) NOT NULL,
    monto_total_aprobado   NUMERIC(14,2),
    estado                 VARCHAR(20) NOT NULL DEFAULT 'Borrador'
                           CHECK (estado IN ('Borrador','Pendiente','Aprobado','Rechazado')),
    motivo_rechazo         TEXT,
    id_usuario_elabora     INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_usuario_aprueba     INTEGER REFERENCES usuarios(id_usuario),
    fecha_creacion         TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_resolucion       TIMESTAMP
);

-- 7. PARTIDAS PRESUPUESTARIAS (líneas del presupuesto)
CREATE TABLE partidas_presupuestarias (
    id_partida       SERIAL PRIMARY KEY,
    id_presupuesto   INTEGER NOT NULL REFERENCES presupuestos(id_presupuesto),
    id_categoria     INTEGER NOT NULL REFERENCES categorias(id_categoria),
    monto_asignado   NUMERIC(14,2) NOT NULL,
    monto_ejecutado  NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- 8. CUENTAS CONTABLES (plan de cuentas)
CREATE TABLE cuentas_contables (
    id_cuenta        SERIAL PRIMARY KEY,
    codigo_cuenta    VARCHAR(20) NOT NULL UNIQUE,
    nombre_cuenta    VARCHAR(150) NOT NULL,
    tipo_cuenta      VARCHAR(20) NOT NULL
                     CHECK (tipo_cuenta IN ('Activo','Pasivo','Patrimonio','Ingreso','Gasto')),
    id_cuenta_padre  INTEGER REFERENCES cuentas_contables(id_cuenta),
    activo           BOOLEAN NOT NULL DEFAULT TRUE
);

-- 9. CUENTAS BANCARIAS / CAJA
CREATE TABLE cuentas_bancarias (
    id_cuenta_bancaria  SERIAL PRIMARY KEY,
    nombre_cuenta       VARCHAR(150) NOT NULL,
    tipo                VARCHAR(10) NOT NULL CHECK (tipo IN ('Banco','Caja')),
    numero_cuenta       VARCHAR(50),
    saldo_actual        NUMERIC(14,2) NOT NULL DEFAULT 0,
    activo              BOOLEAN NOT NULL DEFAULT TRUE
);

-- 10. PROVEEDORES
CREATE TABLE proveedores (
    id_proveedor         SERIAL PRIMARY KEY,
    razon_social         VARCHAR(150) NOT NULL,
    nit                  VARCHAR(30) NOT NULL UNIQUE,
    contacto             VARCHAR(150),
    condiciones_pago     TEXT,
    datos_cuenta_pago    VARCHAR(150),
    estado               VARCHAR(20) NOT NULL DEFAULT 'Aprobado'
                         CHECK (estado IN ('Pendiente','Aprobado','Rechazado')),
    id_usuario_registra  INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_usuario_aprueba   INTEGER REFERENCES usuarios(id_usuario)
);

-- 11. CLIENTES
CREATE TABLE clientes (
    id_cliente           SERIAL PRIMARY KEY,
    razon_social         VARCHAR(150) NOT NULL,
    nit                  VARCHAR(30) UNIQUE,
    contacto             VARCHAR(150),
    datos_facturacion    TEXT,
    id_usuario_registra  INTEGER NOT NULL REFERENCES usuarios(id_usuario)
);

-- 12. FACTURAS (Compra a proveedor / Venta a cliente)
CREATE TABLE facturas (
    id_factura           SERIAL PRIMARY KEY,
    tipo                 VARCHAR(10) NOT NULL CHECK (tipo IN ('Compra','Venta')),
    id_proveedor         INTEGER REFERENCES proveedores(id_proveedor),
    id_cliente           INTEGER REFERENCES clientes(id_cliente),
    id_partida           INTEGER REFERENCES partidas_presupuestarias(id_partida),
    numero_factura       VARCHAR(50) NOT NULL,
    monto                NUMERIC(14,2) NOT NULL,
    fecha_emision        DATE NOT NULL,
    fecha_vencimiento    DATE,
    estado               VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                         CHECK (estado IN ('Pendiente','Solicitada','Pagada','Cobrada','Anulada')),
    motivo_anulacion     TEXT,
    id_usuario_registra  INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_registro       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 13. SOLICITUDES DE PAGO
CREATE TABLE solicitudes_pago (
    id_solicitud         SERIAL PRIMARY KEY,
    id_factura           INTEGER NOT NULL REFERENCES facturas(id_factura),
    monto                NUMERIC(14,2) NOT NULL,
    estado               VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                         CHECK (estado IN ('Pendiente','Aprobada','Rechazada','Ejecutada')),
    tipo_aprobacion      VARCHAR(10) NOT NULL CHECK (tipo_aprobacion IN ('Automatica','Manual')),
    motivo_rechazo       TEXT,
    id_usuario_solicita  INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    id_usuario_aprueba   INTEGER REFERENCES usuarios(id_usuario),
    fecha_solicitud      TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_resolucion     TIMESTAMP
);

-- 14. PAGOS (ejecución)
CREATE TABLE pagos (
    id_pago              SERIAL PRIMARY KEY,
    id_solicitud         INTEGER NOT NULL REFERENCES solicitudes_pago(id_solicitud),
    id_cuenta_bancaria   INTEGER NOT NULL REFERENCES cuentas_bancarias(id_cuenta_bancaria),
    metodo               VARCHAR(20) NOT NULL CHECK (metodo IN ('Transferencia','Cheque','Efectivo')),
    numero_operacion     VARCHAR(50),
    monto                NUMERIC(14,2) NOT NULL,
    fecha_pago           TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario_ejecuta   INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    observacion_rechazo  TEXT
);

-- 15. COBROS
CREATE TABLE cobros (
    id_cobro            SERIAL PRIMARY KEY,
    id_factura          INTEGER NOT NULL REFERENCES facturas(id_factura),
    id_cuenta_bancaria  INTEGER NOT NULL REFERENCES cuentas_bancarias(id_cuenta_bancaria),
    monto               NUMERIC(14,2) NOT NULL,
    fecha_cobro         TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario_ejecuta  INTEGER NOT NULL REFERENCES usuarios(id_usuario)
);

-- 16. ASIENTOS CONTABLES
CREATE TABLE asientos_contables (
    id_asiento           SERIAL PRIMARY KEY,
    id_cuenta            INTEGER NOT NULL REFERENCES cuentas_contables(id_cuenta),
    id_periodo           INTEGER NOT NULL REFERENCES periodos_fiscales(id_periodo),
    tipo_movimiento      VARCHAR(10) NOT NULL CHECK (tipo_movimiento IN ('Debe','Haber')),
    monto                NUMERIC(14,2) NOT NULL,
    descripcion          TEXT,
    referencia           VARCHAR(100),
    id_usuario_registra  INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_registro       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 17. OBSERVACIONES DE AUDITORÍA
CREATE TABLE observaciones_auditoria (
    id_observacion      SERIAL PRIMARY KEY,
    modulo_afectado      VARCHAR(50) NOT NULL,
    referencia_id        INTEGER,
    motivo               TEXT NOT NULL,
    estado               VARCHAR(20) NOT NULL DEFAULT 'Abierta'
                         CHECK (estado IN ('Abierta','En revisión','Cerrada')),
    id_usuario_auditor   INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    respuesta_gerente    TEXT,
    fecha_registro       TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_cierre         TIMESTAMP
);

-- 18. NOTIFICACIONES
CREATE TABLE notificaciones (
    id_notificacion     SERIAL PRIMARY KEY,
    id_usuario_destino   INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    tipo_evento          VARCHAR(50) NOT NULL,
    mensaje              TEXT NOT NULL,
    leida                BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_creacion       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 19. HISTORIAL DE ACCESOS
CREATE TABLE historial_accesos (
    id_acceso   SERIAL PRIMARY KEY,
    id_usuario  INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    fecha_hora  TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_origen   VARCHAR(50),
    resultado   VARCHAR(10) NOT NULL CHECK (resultado IN ('Exitoso','Fallido'))
);

-- 20. CONFIGURACION DEL SISTEMA (clave / valor)
CREATE TABLE configuracion_sistema (
    id_config    SERIAL PRIMARY KEY,
    clave        VARCHAR(100) NOT NULL UNIQUE,
    valor        VARCHAR(255) NOT NULL,
    descripcion  TEXT
);
