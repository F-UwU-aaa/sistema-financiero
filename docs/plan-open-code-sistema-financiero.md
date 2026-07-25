# Plan de Desarrollo Full Stack para Open Code
## Sistema de Gestión Financiera y Presupuestaria (5 roles fijos)

Este documento es tu guía completa para construir el sistema **con Open Code**, en base al documento `roles_permisos_sistema_financiero_DEFINITIVO.md` que ya tienes. No contiene código de la aplicación — contiene el **esquema de base de datos**, la **estructura de carpetas** y **todos los prompts** que le irás copiando a Open Code, fase por fase, alternando entre Modo Plan y Modo Build.

> Los 5 roles fijos: **Administrador del Sistema, Gerente Financiero, Contador, Tesorero, Auditor.** Principio rector: segregación de funciones — quien prepara/solicita nunca es quien aprueba, y quien aprueba nunca es quien ejecuta. Todo el detalle de funciones, flujos y la matriz de permisos por módulo está en el documento de roles: **consúltalo junto con este** en cada fase.

---

## Índice

1. [Cómo usar este documento con Open Code](#1-cómo-usar-este-documento-con-open-code)
2. [Resumen del proyecto](#2-resumen-del-proyecto)
3. [Stack tecnológico](#3-stack-tecnológico-fijo)
4. [Reglas globales — contenido para tu AGENTS.md](#4-reglas-globales--contenido-para-tu-agentsmd)
5. [Estructura de carpetas del proyecto](#5-estructura-de-carpetas-del-proyecto)
6. [Esquema de base de datos](#6-esquema-de-base-de-datos)
7. [Plan de desarrollo por fases (prompts Plan + Build)](#7-plan-de-desarrollo-por-fases)
8. [Notas finales](#8-notas-finales)

---

## 1. Cómo usar este documento con Open Code

**Paso 0 — prepara el repo:**
1. Crea la carpeta de tu proyecto y corre `git init`.
2. Crea una carpeta `docs/` y copia ahí dos archivos: tu documento de roles (renómbralo a `docs/roles-permisos-sistema-financiero.md`, sin el timestamp) y este mismo documento (`docs/plan-open-code-sistema-financiero.md`).
3. Abre Open Code dentro de esa carpeta.
4. Copia el contenido de la sección 4 de este documento dentro de un archivo `AGENTS.md` en la raíz del proyecto (o corre `/init` y luego pégaselo). Open Code lo lee automáticamente en cada sesión, así no tienes que repetir las reglas del stack en cada prompt.

**Cómo se usa cada fase (sección 7):**
- Cada fase trae un **Prompt — Modo Plan**. Antes de pegarlo, confirma que Open Code esté en modo **Plan** (tecla `Tab`, se ve indicado abajo a la derecha). En este modo Open Code no toca archivos, solo te devuelve un plan.
- Debajo tienes un checklist de **qué revisar** en ese plan antes de continuar. Si algo falla, coméntaselo a Open Code en el mismo modo Plan hasta que el plan quede bien — recién ahí pasas al build.
- Luego viene el **Prompt — Modo Build**. Cambia a modo **Build** (`Tab` de nuevo) y pégalo. Ahí sí escribe archivos y corre comandos.
- Al terminar cada fase con éxito, haz `git add -A && git commit -m "fase X: ..."`. Si algo sale mal, `/undo` dentro de Open Code o `git checkout` te devuelven al último punto bueno.
- No saltes fases ni las combines en un solo mensaje: están ordenadas por dependencia (no puedes hacer RBAC sin autenticación, ni pagos sin presupuestos, etc.).

---

## 2. Resumen del proyecto

Sistema interno de gestión financiera y presupuestaria con **5 roles de usuario fijos y precargados** (no editables como catálogo libre): Administrador del Sistema, Gerente Financiero, Contador, Tesorero y Auditor. Cada rol tiene una naturaleza distinta — soporte de sistema, decisión/aprobación, operación/preparación, ejecución y control independiente, respectivamente — y el sistema debe impedir, a nivel de código en cada endpoint, que un rol haga lo que le corresponde a otro. El detalle línea por línea de qué puede hacer cada rol, los 5 flujos de trabajo completos (alta de usuario, presupuesto, pago, cierre de periodo, irregularidad) y la matriz de permisos por módulo están en `docs/roles-permisos-sistema-financiero.md` — ese documento es la fuente de verdad del negocio; este documento es la fuente de verdad técnica (stack, esquema, estructura, prompts).

---

## 3. Stack tecnológico (fijo)

| Capa | Tecnología | Notas |
|---|---|---|
| Framework | Next.js 16 (App Router) + TypeScript | En Next.js 16 el archivo de middleware se llama **`proxy.ts`** (ya no `middleware.ts`) y exporta una función `proxy`. `cookies()`, `headers()` y `params` son **asíncronos** (van con `await`). Turbopack es el bundler por defecto en desarrollo. |
| Base de datos | PostgreSQL vía `pg` | SQL crudo con *queries parametrizadas* (`$1, $2...`). Sin ORM, sin Prisma, sin Drizzle, sin query builders. |
| Estilos | Tailwind CSS v4 | Configuración "CSS-first": `@import "tailwindcss";` dentro de `globals.css`, sin `tailwind.config.js` obligatorio. Solo necesitas un `postcss.config.mjs` mínimo con `@tailwindcss/postcss`. |
| Autenticación | Cookie httpOnly firmada (HMAC-SHA256) | Sesión propia, sin NextAuth/Auth.js ni librerías de JWT. Se firma y verifica con el módulo nativo `crypto` de Node. |
| RBAC | Verificación de permisos por rol en cada endpoint | Matriz de permisos como constante en código (basada en la sección 6 del documento de roles) + una función que se llama al inicio de cada `route.ts`. |

**Dos decisiones técnicas que el documento de roles no especifica, y que asumo así — dímelo si prefieres otra cosa:**
- **Hash de contraseñas:** no es lo mismo que la firma de la cookie. Para no sumar una dependencia externa (ej. bcrypt) y quedarnos 100% en el módulo nativo `crypto` (igual que para la cookie), uso `crypto.scrypt` para guardar las contraseñas. Es igual de válido cambiarlo por `bcryptjs` si lo prefieres — es una sola función.
- **Exportación de reportes (Fase 12):** el documento pide exportar en PDF/Excel pero el stack no define librería. Mi sugerencia: para "Excel" alcanza con generar un `.csv` a mano (se abre nativo en Excel, cero dependencias); para PDF conviene una librería liviana en el momento de esa fase. Lo dejo como decisión a tomar en el Plan de la Fase 12, no antes.

---

## 4. Reglas globales — contenido para tu AGENTS.md

Copia esto tal cual dentro de tu archivo `AGENTS.md`. Es lo que hace que no tengas que repetir el stack y las restricciones en cada uno de los prompts de la sección 7.

```markdown
# AGENTS.md — Sistema de Gestión Financiera y Presupuestaria

Antes de planear o construir cualquier cosa, lee `docs/roles-permisos-sistema-financiero.md`
(reglas de negocio, roles, flujos, matriz de permisos) y `docs/plan-open-code-sistema-financiero.md`
(esquema de BD, estructura de carpetas, stack). Este proyecto se construye fase por fase: no
adelantes funcionalidad de una fase futura aunque parezca conveniente.

## Stack — no negociable
- Next.js 16, App Router, TypeScript. El archivo de intercepción de requests es `src/proxy.ts`
  (export `function proxy(...)`), NUNCA `middleware.ts`.
- PostgreSQL con el paquete `pg`. SQL crudo, siempre con parámetros ($1, $2...), nunca
  concatenando strings. Prohibido cualquier ORM o query builder (Prisma, Drizzle, Knex, TypeORM).
- Tailwind CSS v4 (`@import "tailwindcss"` en `src/styles/globals.css`). No uses styled-components,
  CSS-in-JS, ni otra librería de estilos. Todo estilo global vive en `src/styles/`.
- Sesión: cookie httpOnly, secure (en producción) y sameSite=lax, con payload + firma HMAC-SHA256
  generada con el módulo `crypto` nativo de Node. Nada de NextAuth/Auth.js ni jsonwebtoken/jose.
- Contraseñas con `crypto.scrypt` (nunca en texto plano, nunca con `===` para comparar hashes).

## RBAC — obligatorio en cada endpoint
- Toda ruta en `src/app/api/**/route.ts` debe empezar verificando la sesión y el permiso del rol
  contra la matriz de `src/lib/rbac.ts` ANTES de tocar la base de datos. 401 si no hay sesión
  válida, 403 si hay sesión pero el rol no tiene permiso.
- La restricción de roles vive en el backend. El frontend puede ocultar botones/menús según el rol
  para mejorar la experiencia, pero eso NUNCA reemplaza la verificación del backend.
- Respeta la segregación de funciones: quien crea/solicita un registro no puede ser quien lo
  aprueba, y quien aprueba no puede ser quien lo ejecuta. Válidalo aunque ya esté implícito por rol.

## Base de datos
- Nomenclatura en español, snake_case, tal como está en la sección 6 de
  `docs/plan-open-code-sistema-financiero.md`. No traduzcas nombres de tablas/columnas al inglés.
- Sin triggers, sin funciones ni vistas en la base de datos. Toda la lógica (validar saldo
  disponible, bloquear ediciones de un periodo cerrado, actualizar saldos al ejecutar un pago,
  generar notificaciones) va en el código de la ruta de la API, no en la base de datos.
- Cualquier operación que escriba en más de una tabla a la vez va dentro de una transacción real
  (`BEGIN` / `COMMIT` / `ROLLBACK` con el mismo cliente de `pg`), nunca queries sueltas.

## Convenciones generales
- Nombres de variables, tipos e interfaces de dominio en español (`Usuario`, `Presupuesto`,
  `SolicitudPago`), igual que las tablas. El código de framework (page.tsx, route.ts, layout.tsx)
  sigue la convención de Next.js tal cual.
- No instales ninguna librería que no esté explícitamente pedida en el prompt de la fase sin
  preguntar primero.
- No avances a una fase que no se te haya pedido. Si algo de una fase futura es un prerequisito
  real e ineludible, dilo en el plan en vez de construirlo directamente.
```

---

## 5. Estructura de carpetas del proyecto

```
sistema-financiero/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── cambiar-password/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx                     # Sidebar + verificación de sesión
│   │   │   ├── admin/
│   │   │   │   ├── usuarios/page.tsx
│   │   │   │   └── configuracion/page.tsx
│   │   │   ├── gerente/
│   │   │   │   ├── presupuestos/page.tsx
│   │   │   │   ├── pagos/page.tsx
│   │   │   │   └── dashboard/page.tsx
│   │   │   ├── contador/
│   │   │   │   ├── presupuestos/page.tsx
│   │   │   │   ├── facturacion/page.tsx
│   │   │   │   ├── proveedores/page.tsx
│   │   │   │   ├── clientes/page.tsx
│   │   │   │   ├── cuentas-contables/page.tsx
│   │   │   │   ├── balances/page.tsx
│   │   │   │   └── dashboard/page.tsx
│   │   │   ├── tesorero/
│   │   │   │   ├── pagos/page.tsx
│   │   │   │   ├── cobros/page.tsx
│   │   │   │   ├── cuentas-bancarias/page.tsx
│   │   │   │   └── dashboard/page.tsx
│   │   │   └── auditor/
│   │   │       ├── auditoria/page.tsx
│   │   │       └── dashboard/page.tsx
│   │   ├── api/
│   │   │   ├── auth/{login,logout,cambiar-password}/route.ts
│   │   │   ├── usuarios/route.ts (+ [id]/route.ts)
│   │   │   ├── areas/route.ts
│   │   │   ├── configuracion/route.ts
│   │   │   ├── presupuestos/route.ts (+ [id]/route.ts, [id]/aprobar/route.ts)
│   │   │   ├── partidas/route.ts
│   │   │   ├── cuentas-contables/route.ts
│   │   │   ├── cuentas-bancarias/route.ts
│   │   │   ├── proveedores/route.ts (+ [id]/aprobar/route.ts)
│   │   │   ├── clientes/route.ts
│   │   │   ├── facturas/route.ts
│   │   │   ├── solicitudes-pago/route.ts (+ [id]/aprobar/route.ts)
│   │   │   ├── pagos/route.ts
│   │   │   ├── cobros/route.ts
│   │   │   ├── balances/route.ts (+ cierre/route.ts, reapertura/route.ts)
│   │   │   ├── auditoria/route.ts
│   │   │   └── notificaciones/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx                           # Redirige a /login o al dashboard del rol
│   ├── components/
│   │   ├── ui/                                # Botón, Tabla, Modal, Input, etc. reutilizables
│   │   ├── layout/                             # Sidebar, Navbar, RoleGuard
│   │   └── modulos/                            # Componentes específicos (FormPresupuesto, etc.)
│   ├── lib/
│   │   ├── db.ts                               # Pool de conexión pg + helper query()
│   │   ├── auth.ts                             # Firmar/verificar cookie, hash de contraseñas
│   │   ├── rbac.ts                             # Matriz de permisos + tienePermiso()
│   │   └── validaciones.ts
│   ├── types/
│   │   └── index.ts                            # Usuario, Rol, Presupuesto, Factura, etc.
│   ├── styles/
│   │   └── globals.css                         # Todos los estilos globales + Tailwind v4
│   └── proxy.ts                                 # Verifica sesión y redirige (reemplaza middleware.ts)
├── db/
│   ├── schema.sql                              # Sección 6 de este documento
│   └── seed.sql                                # Inserts de prueba de la sección 6
├── docs/
│   ├── roles-permisos-sistema-financiero.md
│   └── plan-open-code-sistema-financiero.md
├── public/
├── .env.local                                   # DATABASE_URL, COOKIE_SECRET
├── AGENTS.md
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## 6. Esquema de base de datos

Solo lo pedido: **tablas, atributos, PK/FK con su cardinalidad, e inserts de prueba.** Sin triggers, sin funciones, sin vistas — esa lógica va en el código de la API en las fases de la sección 7.

### 6.1 Tablas

```sql
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
    estado                 VARCHAR(20) NOT NULL DEFAULT 'Pendiente'
                           CHECK (estado IN ('Pendiente','Aprobado','Rechazado')),
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
```

*Tip: como ningún FK tiene `ON DELETE CASCADE`, Postgres ya impide por sí solo borrar un usuario (o cualquier registro) que tenga actividad relacionada — esto refuerza a nivel de base de datos la regla de la sección 4.1 del documento de roles ("eliminar solo si nunca tuvo actividad").*

### 6.2 Relaciones y cardinalidad

- `roles` (1) → `usuarios` (N): un rol tiene muchos usuarios; un usuario tiene un solo rol.
- `usuarios` (1) → `presupuestos` (N) por `id_usuario_elabora`, y (1) → (N) por `id_usuario_aprueba`: el Contador elabora muchos presupuestos, el Gerente Financiero aprueba muchos.
- `areas_departamentos` (1) → `presupuestos` (N); `periodos_fiscales` (1) → `presupuestos` (N).
- `presupuestos` (1) → `partidas_presupuestarias` (N); `categorias` (1) → `partidas_presupuestarias` (N).
- `cuentas_contables` (1) → `cuentas_contables` (N): relación reflexiva opcional para jerarquía (cuenta padre / sub-cuentas).
- `proveedores` (1) → `facturas` (N) cuando `tipo = 'Compra'`; `clientes` (1) → `facturas` (N) cuando `tipo = 'Venta'`; `partidas_presupuestarias` (1) → `facturas` (N).
- `facturas` (1) → `solicitudes_pago` (N) — normalmente una, pero permite reenvíos si una solicitud fue rechazada.
- `solicitudes_pago` (1) → `pagos` (N); `cuentas_bancarias` (1) → `pagos` (N) y (1) → `cobros` (N); `facturas` (1) → `cobros` (N).
- `cuentas_contables` (1) → `asientos_contables` (N); `periodos_fiscales` (1) → `asientos_contables` (N).
- `usuarios` (1) → (N) en `proveedores`, `clientes`, `facturas`, `solicitudes_pago`, `pagos`, `cobros`, `asientos_contables`, `observaciones_auditoria`, `notificaciones` e `historial_accesos` (cada una registra quién hizo la acción).

**¿Y una relación N a M?** Tal como está descrito el negocio en el documento de roles, cada caso de uso es de cabecera → detalle (1 a N); no hay ningún flujo que exija una tabla puente. Si en el futuro quisieras que **una sola Solicitud de Pago cubra varias facturas del mismo proveedor** (pagar 3 facturas en una transferencia), ahí sí aparecería una relación N a M real entre `facturas` y `solicitudes_pago`, resuelta con una tabla intermedia `solicitud_pago_facturas (id_solicitud, id_factura)`. No la implementes ahora — el flujo del documento es de una factura por solicitud — pero es la extensión natural si el alcance crece.

### 6.3 Inserts de prueba

```sql
-- Roles fijos
INSERT INTO roles (nombre_rol, descripcion) VALUES
('Administrador del Sistema', 'Gestiona usuarios, accesos y configuración técnica'),
('Gerente Financiero', 'Define política financiera y aprueba presupuestos y pagos'),
('Contador', 'Registra la contabilidad, prepara presupuestos y factura'),
('Tesorero', 'Ejecuta pagos y cobros ya aprobados, custodia cuentas'),
('Auditor', 'Supervisa el sistema en modo solo lectura');

-- Usuarios de prueba (uno por rol).
-- password_hash es un valor de ejemplo: Open Code debe generarlo con crypto.scrypt
-- en el script de seed real (fase 1), no escribirlo a mano.
INSERT INTO usuarios (nombre_completo, correo, password_hash, id_rol, debe_cambiar_password) VALUES
('Ana Pérez',   'admin@empresa.com',    'REEMPLAZAR_HASH_1', 1, FALSE),
('Luis Gómez',  'gerente@empresa.com',  'REEMPLAZAR_HASH_2', 2, FALSE),
('Marta Ríos',  'contador@empresa.com', 'REEMPLAZAR_HASH_3', 3, FALSE),
('Jorge Salas', 'tesorero@empresa.com', 'REEMPLAZAR_HASH_4', 4, FALSE),
('Clara Vega',  'auditor@empresa.com',  'REEMPLAZAR_HASH_5', 5, FALSE);

-- Áreas / departamentos
INSERT INTO areas_departamentos (nombre_area, descripcion) VALUES
('Tecnología', 'Área de sistemas e infraestructura'),
('Operaciones', 'Área operativa general');

-- Periodo fiscal
INSERT INTO periodos_fiscales (nombre_periodo, fecha_inicio, fecha_fin) VALUES
('2026', '2026-01-01', '2026-12-31');

-- Categorías
INSERT INTO categorias (nombre_categoria, tipo) VALUES
('Servicios básicos', 'Egreso'),
('Suministros de oficina', 'Egreso'),
('Venta de servicios', 'Ingreso');

-- Presupuesto ya aprobado (Contador=3 elabora, Gerente Financiero=2 aprueba)
INSERT INTO presupuestos
    (id_area, id_periodo, monto_total_propuesto, monto_total_aprobado, estado, id_usuario_elabora, id_usuario_aprueba, fecha_resolucion)
VALUES (1, 1, 50000.00, 50000.00, 'Aprobado', 3, 2, NOW());

-- Partidas presupuestarias del presupuesto 1
INSERT INTO partidas_presupuestarias (id_presupuesto, id_categoria, monto_asignado, monto_ejecutado) VALUES
(1, 1, 30000.00, 0),
(1, 2, 20000.00, 0);

-- Plan de cuentas
INSERT INTO cuentas_contables (codigo_cuenta, nombre_cuenta, tipo_cuenta) VALUES
('1101', 'Caja', 'Activo'),
('1102', 'Bancos', 'Activo'),
('2101', 'Cuentas por Pagar', 'Pasivo'),
('5101', 'Gastos de Servicios', 'Gasto');

-- Cuentas bancarias / caja
INSERT INTO cuentas_bancarias (nombre_cuenta, tipo, numero_cuenta, saldo_actual) VALUES
('Banco Nacional - Cta. Corriente', 'Banco', '1234567890', 100000.00),
('Caja Chica', 'Caja', NULL, 2000.00);

-- Proveedor y cliente (registrados por el Contador=3)
INSERT INTO proveedores (razon_social, nit, contacto, condiciones_pago, datos_cuenta_pago, id_usuario_registra) VALUES
('Suministros del Sur S.A.', '1234567890123', 'ventas@suministrossur.com', '30 días', 'Cta. 987654321 - Banco Nacional', 3);

INSERT INTO clientes (razon_social, nit, contacto, datos_facturacion, id_usuario_registra) VALUES
('Comercial Andina S.R.L.', '9876543210987', 'facturacion@comercialandina.com', 'Facturación mensual', 3);

-- Flujo completo de un pago: factura de compra -> solicitud -> pago
-- (1500 < límite de aprobación automática de 2000 configurado abajo: por eso es 'Automatica')
INSERT INTO facturas (tipo, id_proveedor, id_partida, numero_factura, monto, fecha_emision, estado, id_usuario_registra) VALUES
('Compra', 1, 1, 'FAC-001', 1500.00, '2026-02-10', 'Solicitada', 3);

INSERT INTO solicitudes_pago (id_factura, monto, estado, tipo_aprobacion, id_usuario_solicita, fecha_resolucion) VALUES
(1, 1500.00, 'Ejecutada', 'Automatica', 3, NOW());

INSERT INTO pagos (id_solicitud, id_cuenta_bancaria, metodo, numero_operacion, monto, id_usuario_ejecuta) VALUES
(1, 1, 'Transferencia', 'OP-000123', 1500.00, 4);

-- Flujo completo de un cobro: factura de venta -> cobro
INSERT INTO facturas (tipo, id_cliente, numero_factura, monto, fecha_emision, estado, id_usuario_registra) VALUES
('Venta', 1, 'FV-001', 3000.00, '2026-02-15', 'Cobrada', 3);

INSERT INTO cobros (id_factura, id_cuenta_bancaria, monto, id_usuario_ejecuta) VALUES
(2, 1, 3000.00, 4);

-- Historial de accesos
INSERT INTO historial_accesos (id_usuario, ip_origen, resultado) VALUES
(1, '192.168.1.10', 'Exitoso'),
(3, '192.168.1.22', 'Exitoso');

-- Notificación de ejemplo
INSERT INTO notificaciones (id_usuario_destino, tipo_evento, mensaje) VALUES
(2, 'presupuesto_pendiente', 'Hay un presupuesto del área Tecnología pendiente de tu aprobación');

-- Observación de auditoría de ejemplo
INSERT INTO observaciones_auditoria (modulo_afectado, referencia_id, motivo, id_usuario_auditor) VALUES
('Pagos', 1, 'Verificar que el número de operación coincida con el comprobante bancario', 5);

-- Asiento contable de ejemplo
INSERT INTO asientos_contables (id_cuenta, id_periodo, tipo_movimiento, monto, descripcion, referencia, id_usuario_registra) VALUES
(4, 1, 'Debe', 1500.00, 'Gasto de servicios pagado a Suministros del Sur', 'FAC-001', 3);

-- Configuración del sistema
INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
('limite_aprobacion_automatica_pagos', '2000.00', 'Monto máximo que el sistema aprueba automáticamente sin pasar por el Gerente Financiero'),
('dias_expiracion_sesion', '1', 'Días antes de que expire la cookie de sesión de un usuario'),
('intentos_fallidos_alerta', '5', 'Intentos fallidos de acceso antes de generar alerta al Administrador');
```

*Estos inserts asumen una base de datos recién creada (IDs empezando en 1, en este orden). Si cambias el orden de ejecución, ajusta los IDs.*

---

## 7. Plan de desarrollo por fases

14 fases, en orden de dependencia. Cada una: **Prompt — Modo Plan**, **qué revisar**, **Prompt — Modo Build**.

### Fase 0 — Inicialización del proyecto

**Objetivo:** dejar el proyecto arrancado, sin ninguna funcionalidad de negocio todavía.

**📋 Prompt — Modo Plan** *(Tab a Plan)*
```
Vamos a iniciar el proyecto "Sistema de Gestión Financiera y Presupuestaria". Lee AGENTS.md
completo antes de continuar. En esta fase SOLO quiero dejar el esqueleto del proyecto:

- Next.js 16 con TypeScript, App Router, src/ directory, Tailwind CSS v4.
- Instalar pg y @types/pg (nada de ORM).
- Crear la estructura de carpetas completa de la sección 5 de docs/plan-open-code-sistema-financiero.md
  (carpetas vacías o con placeholders donde aún no corresponde escribir código).
- Crear src/proxy.ts como placeholder que por ahora solo deja pasar todas las requests (no hay
  sesión que verificar todavía, eso es la fase 2).
- Crear src/styles/globals.css con el setup de Tailwind v4 e importarlo desde el layout raíz.
- Crear .env.local con placeholders (DATABASE_URL, COOKIE_SECRET) y agregarlo a .gitignore.
- NO crear ninguna tabla de base de datos, ninguna página de negocio ni ningún endpoint todavía.

Dame el plan de qué archivos vas a crear y con qué contenido, sin escribirlos todavía.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Usa `src/app/` (App Router), no `pages/`?
- ¿Instala `pg`, no Prisma/Drizzle/otro ORM?
- ¿Detecta que Tailwind es v4 (sin pedir `tailwind.config.js` como obligatorio)?
- ¿El archivo se llama `src/proxy.ts` y no `middleware.ts`?
- ¿Crea la carpeta `src/styles/` tal como se pidió, y no mete los estilos sueltos dentro de `app/`?
- ¿Deja `.env.local` fuera de git?

**🔨 Prompt — Modo Build** *(Tab a Build)*
```
Implementa exactamente el plan que acabas de proponer, sin agregar nada extra. Al terminar corre
npm run build (o npm run dev) para confirmar que el proyecto arranca sin errores, y dame un
resumen breve de los archivos creados.
```

---

### Fase 1 — Base de datos: esquema y conexión

**Objetivo:** tener PostgreSQL con las 20 tablas creadas, datos de prueba cargados, y una forma de consultarlos desde Next.js.

**📋 Prompt — Modo Plan**
```
Ahora vamos a montar la base de datos. Usa exactamente el esquema de la sección 6.1 de
docs/plan-open-code-sistema-financiero.md (20 tablas, en ese orden por las dependencias de FK) y
los inserts de la sección 6.3. Quiero:

- db/schema.sql con las 20 tablas tal cual están documentadas (no agregues triggers, funciones ni
  vistas, ni cambies nombres de tablas/columnas).
- db/seed.sql con los inserts de prueba, generando los password_hash reales con crypto.scrypt en
  vez de los placeholders "REEMPLAZAR_HASH_N" (puede ser un script aparte que los genere e
  imprima, o resolverlo en el script de migración).
- src/lib/db.ts con un Pool de pg leyendo DATABASE_URL de las variables de entorno, y una función
  query() reutilizable.
- Un script (puede ser scripts/migrate.ts + un comando en package.json, ej. "db:migrate") que
  ejecute schema.sql y luego seed.sql contra la base de datos.

No crees todavía ningún endpoint de API ni ninguna pantalla. Dame el plan antes de escribir nada.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Las 20 tablas coinciden en nombre, columnas, tipos, PK y FK con la sección 6.1?
- ¿No aparece ningún `CREATE TRIGGER`, `CREATE FUNCTION` ni `CREATE VIEW`?
- ¿El pool de conexión usa `DATABASE_URL` de entorno, no una contraseña hardcodeada?
- ¿Los password_hash de prueba se generan de verdad con `crypto.scrypt`, no quedan como texto plano?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre el script de migración contra mi base de datos local y
confirma con una query simple (por ejemplo, contar filas de cada tabla) que las 20 tablas se
crearon y los inserts de prueba cargaron sin error. Muéstrame ese resultado.
```

---

### Fase 2 — Autenticación (login, cookie HMAC-SHA256)

**Objetivo:** login funcional con sesión propia, sin librerías de auth externas.

**📋 Prompt — Modo Plan**
```
Vamos a implementar autenticación. Mecanismo exacto:

1. Página de login en src/app/(auth)/login/page.tsx (correo + contraseña).
2. POST /api/auth/login: busca el usuario por correo en `usuarios`, verifica la contraseña con
   crypto.scrypt contra password_hash, revisa que `activo = true`. Si es válido: arma un payload
   {id_usuario, id_rol, nombre_rol, exp}, lo firma con HMAC-SHA256 (clave = COOKIE_SECRET) usando
   el módulo crypto nativo, y lo guarda como cookie httpOnly, secure en producción, sameSite=lax.
   Si no es válido: no reveles si falló el correo o la contraseña, solo "credenciales inválidas".
3. Cada intento (exitoso o fallido) se inserta en `historial_accesos`.
4. Si `debe_cambiar_password = true`, redirige a /cambiar-password y no deja avanzar hasta
   cambiarla.
5. POST /api/auth/logout: borra la cookie.
6. src/lib/auth.ts: funciones para firmar/verificar la cookie (comparación seguem con
   crypto.timingSafeEqual, no con ===) y para hashear/verificar contraseñas con scrypt.
7. Actualiza src/proxy.ts para que verifique la cookie de sesión en las rutas del grupo
   (dashboard) y redirija a /login si no hay una válida. Todavía NO implementes qué rol puede
   ver qué (eso es RBAC, fase 3) — aquí solo es "¿hay sesión válida o no?".

No uses NextAuth, Auth.js, jsonwebtoken, jose ni bcrypt. Dame el plan primero.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿La cookie es httpOnly, secure en producción y sameSite correcto?
- ¿La verificación de la firma usa comparación de tiempo constante (`timingSafeEqual`), no `===`?
- ¿En ningún punto se guarda o compara la contraseña en texto plano?
- ¿Registra en `historial_accesos` tanto los intentos exitosos como los fallidos?
- ¿El cambio de contraseña obligatorio (`debe_cambiar_password`) realmente bloquea el acceso hasta completarse?
- ¿`proxy.ts` redirige a `/login` cuando no hay cookie válida?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Al terminar, corre npm run build, corrige cualquier error, y
pruébalo manualmente: entra con uno de los usuarios de seed, confirma que la cookie se crea, y que
borrarla o alterarla a mano hace que la sesión se invalide. Cuéntame qué probaste.
```

---

### Fase 3 — RBAC: sistema de permisos por rol

**Objetivo:** una única fuente de verdad de permisos, usable en una línea desde cualquier endpoint.

**📋 Prompt — Modo Plan**
```
Implementa el sistema de RBAC. Quiero:

- src/lib/rbac.ts con una constante que reproduzca la matriz de la sección 6 (Matriz de permisos
  por módulo) de docs/roles-permisos-sistema-financiero.md: por módulo, qué acciones
  (crear/leer/modificar/aprobar/ejecutar/desactivar) puede hacer cada uno de los 5 roles.
- Una función tienePermiso(rol, modulo, accion) que consulte esa matriz.
- Un helper para usar dentro de cualquier route.ts, que lea la cookie ya verificada (fase 2), saque
  el rol, y devuelva 401 si no hay sesión válida o 403 si el rol no tiene el permiso pedido — antes
  de tocar la base de datos.
- Una forma simple de que los Server Components lean el rol actual (para mostrar/ocultar menús y
  botones según rol) — dejando claro que esto es solo UX, la seguridad real está en el backend.

Todavía no construyas ningún módulo de negocio (usuarios, presupuestos, etc.), solo la
infraestructura de permisos. Dame el plan primero.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿La matriz de permisos coincide con la tabla de la sección 6 del documento de roles, módulo por módulo?
- ¿El helper se puede usar con una sola línea al inicio de cualquier `route.ts`?
- ¿Devuelve 401 cuando no hay sesión y 403 cuando hay sesión pero el rol no tiene permiso (no los mezcla)?
- ¿Deja explícito que ocultar un botón en el frontend no reemplaza la verificación del backend?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Escribe una ruta de prueba temporal que use el helper con distintos
módulos/acciones para que puedas confirmar, entrando con cada uno de los 5 usuarios de seed, que
el 403 aparece exactamente donde la matriz dice que debe aparecer. Bórrala al final y cuéntame los
resultados de la prueba.
```

---

### Fase 4 — Administrador: Usuarios/Roles y Configuración del sistema

**Objetivo:** el Administrador puede gestionar cuentas y la configuración base, y nadie más.

**📋 Prompt — Modo Plan**
```
Construye el módulo de Administrador, basado en la sección 4.1 (funciones 1-15) del documento de
roles. Alcance:

- src/app/(dashboard)/admin/usuarios/page.tsx: listado de usuarios con filtro por rol y por
  activo/inactivo, y su historial de accesos. Formulario para crear usuario (nombre, correo, rol
  — el rol se elige de un <select> con los 5 roles existentes, nunca texto libre ni la opción de
  crear un rol nuevo), editar, desactivar, restablecer contraseña (genera una temporal y obliga a
  cambiarla en el siguiente login), y eliminar (solo si el usuario nunca tuvo actividad registrada
  en ninguna otra tabla — si tiene, ofrece "desactivar" en vez de bloquear sin más).
- src/app/(dashboard)/admin/configuracion/page.tsx: CRUD de areas_departamentos y categorias,
  gestión de periodos_fiscales, y edición de configuracion_sistema (incluyendo
  limite_aprobacion_automatica_pagos e intentos_fallidos_alerta).
- Endpoints correspondientes en /api/usuarios y /api/areas /api/configuracion, todos protegidos con
  el RBAC de la fase 3 — solo Administrador puede escribir; el Auditor puede leer usuarios según la
  matriz, el resto no tiene acceso a este módulo.

Dame el plan de pantallas y endpoints antes de escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Solo Administrador puede crear/editar/desactivar usuarios (prueba con otro rol y debe dar 403)?
- ¿El rol al crear un usuario se elige entre los 5 existentes, sin poder escribir uno nuevo?
- ¿"Eliminar" verifica actividad previa antes de permitirlo, y ofrece desactivar como alternativa?
- ¿El límite de aprobación automática vive en `configuracion_sistema`, no hardcodeado en el código?
- ¿El Auditor puede ver el listado de usuarios en modo solo lectura, tal como dice la matriz?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Al terminar corre npm run build y corrige errores. Prueba crear,
editar, desactivar y (si aplica) eliminar un usuario de prueba, y confirma que otro rol distinto
de Administrador recibe 403 al intentar estas acciones. Resume qué probaste.
```

---

### Fase 5 — Presupuestos

**Objetivo:** el Contador propone, el Gerente Financiero aprueba o rechaza — nunca la misma persona.

**📋 Prompt — Modo Plan**
```
Construye el módulo de Presupuestos, basado en la sección 4.2 (funciones 1-6 del Gerente
Financiero), 4.3 (funciones 4-7 del Contador) y el Flujo 2 del documento de roles. Alcance:

- Contador (src/app/(dashboard)/contador/presupuestos/page.tsx): crear una propuesta de
  presupuesto por área + periodo, con sus partidas_presupuestarias por categoría, enviarla a
  aprobación, ver el histórico y reenviar una rechazada con los ajustes.
- Gerente Financiero (src/app/(dashboard)/gerente/presupuestos/page.tsx): ver propuestas
  pendientes, ajustar montos, aprobar o rechazar con motivo obligatorio si rechaza.
- Endpoints en /api/presupuestos (POST para crear, GET para listar/filtrar) y
  /api/presupuestos/[id]/aprobar (PATCH, solo Gerente Financiero).
- Aunque el rol ya lo restringe, agrega una verificación explícita en el endpoint de aprobar de
  que id_usuario_aprueba no sea el mismo que id_usuario_elabora, como defensa adicional del
  principio de segregación de funciones de la sección 1 del documento de roles.

Dame el plan antes de escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Un Contador puede ver el botón/endpoint de aprobar su propia propuesta? (No debería.)
- ¿El Gerente Financiero puede ajustar montos antes de aprobar?
- ¿El motivo de rechazo queda guardado y visible para el Contador que la elaboró?
- ¿Las partidas presupuestarias quedan bien asociadas a su presupuesto y sus categorías?
- ¿Se puede consultar el histórico de presupuestos de periodos anteriores?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba el flujo completo con
los usuarios de seed: Contador crea una propuesta, Gerente Financiero la aprueba y luego crea otra
que rechaza con motivo, y el Contador la ve rechazada. Resume el resultado.
```

---

### Fase 6 — Catálogos operativos: Cuentas contables, Cuentas bancarias, Proveedores y Clientes

**Objetivo:** la data maestra que necesitan Facturación y Pagos en las próximas fases.

**📋 Prompt — Modo Plan**
```
Construye estos catálogos, basados en las secciones 4.3 (funciones 1, 20-21), 4.4 (función 7) y
4.2 (función 13) del documento de roles:

- Contador: CRUD de cuentas_contables (plan de cuentas) y CRUD de proveedores y clientes.
- Tesorero: CRUD de cuentas_bancarias (tipo Banco/Caja, saldo).
- Alta de un proveedor "grande" (el umbral de monto de contrato es configurable, agrégalo a
  configuracion_sistema) queda en estado Pendiente hasta que el Gerente Financiero la apruebe;
  las altas por debajo del umbral quedan Aprobado automáticamente.
- El Tesorero puede consultar (solo lectura) los datos bancarios de los proveedores que registra
  el Contador, tal como indica la matriz de permisos.
- Respeta exactamente quién puede Crear/Leer/Modificar cada catálogo según la sección 6 del
  documento de roles (no todos los roles ven todo).

Dame el plan antes de escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Cada catálogo respeta el Crear/Leer/Modificar de la matriz exactamente, sin ampliar accesos de más?
- ¿El umbral de aprobación de proveedores grandes es configurable, no un número fijo en el código?
- ¿El Tesorero puede ver pero no editar los datos bancarios de proveedores?
- ¿El Gerente Financiero puede aprobar/rechazar altas grandes de proveedor?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba crear un proveedor por
debajo y por encima del umbral configurado, y confirma que el segundo caso efectivamente queda
pendiente de aprobación del Gerente Financiero. Resume el resultado.
```

---

### Fase 7 — Facturación y Solicitudes de Pago

**Objetivo:** registrar facturas y generar solicitudes de pago, con validación de saldo presupuestario.

**📋 Prompt — Modo Plan**
```
Construye Facturación y Solicitudes de Pago, basado en la sección 4.3 (funciones 8-11, 16-19) del
documento de roles. Alcance, todo a cargo del Contador:

- Registrar facturas (Compra o Venta); una factura de Compra se asocia a una
  partida_presupuestaria.
- A partir de una factura de Compra pendiente, generar una Solicitud de Pago: en el código del
  endpoint (no en la base de datos), dentro de una transacción, valida que
  (monto_asignado - monto_ejecutado) de la partida alcance para cubrir el monto solicitado; si no
  alcanza, bloquea la operación y avisa por qué.
- Según el monto de la solicitud vs. configuracion_sistema.limite_aprobacion_automatica_pagos:
  si es menor, estado='Aprobada' y tipo_aprobacion='Automatica' de una vez; si es mayor, queda
  estado='Pendiente' y tipo_aprobacion='Manual' para que el Gerente Financiero la resuelva (eso lo
  construimos en la fase 8, aquí solo debe quedar bien guardado el estado).
- Emitir/anular facturas o comprobantes, dejando siempre el motivo cuando se anula uno (nunca se
  borra en silencio).

Dame el plan antes de escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿La validación de saldo disponible ocurre en el backend, dentro de una transacción real (`BEGIN`...`COMMIT`)?
- ¿Compara el monto contra el valor guardado en `configuracion_sistema`, no un número fijo en el código?
- ¿Una factura anulada conserva el motivo y no desaparece de la base de datos?
- ¿Una solicitud por debajo del límite realmente queda lista para el Tesorero sin pasar por el Gerente Financiero?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba generar una solicitud
que exceda el saldo disponible de una partida (debe bloquearse) y otra que sí tenga saldo tanto por
debajo como por encima del límite configurado, confirmando el estado y tipo_aprobacion correctos en
cada caso. Resume el resultado.
```

---

### Fase 8 — Pagos y Cobros

**Objetivo:** el Gerente Financiero aprueba los pagos grandes, el Tesorero ejecuta pagos y registra cobros — nunca la misma persona que aprobó.

**📋 Prompt — Modo Plan**
```
Construye Pagos y Cobros, basado en las secciones 4.2 (funciones 7-10), 4.4 (funciones 1-6, 8) del
documento de roles. Alcance:

- Gerente Financiero: pantalla de solicitudes de pago pendientes de su aprobación (las de
  tipo_aprobacion='Manual'), aprobar o rechazar con motivo obligatorio si rechaza.
- Tesorero: cola de pagos ya aprobados (automática o manualmente) listos para ejecutar. Al
  ejecutar un pago, verifica que la cuenta bancaria de origen tenga saldo suficiente, y en una
  única transacción: crea el registro en `pagos`, descuenta saldo_actual de la cuenta bancaria,
  suma monto_ejecutado de la partida presupuestaria correspondiente, y marca la factura como
  'Pagada'.
- El Tesorero puede además rechazar la EJECUCIÓN de un pago por una inconsistencia operativa (ej.
  datos bancarios incorrectos), devolviéndolo al Contador con una observación — esto no es
  aprobar/rechazar la solicitud (eso ya lo hizo el Gerente Financiero), es una verificación previa
  a mover el dinero.
- Cobros: el Tesorero registra un cobro contra una factura de Venta, sumando saldo_actual de la
  cuenta bancaria destino y marcando la factura como 'Cobrada'.
- Todas estas actualizaciones multi-tabla van en transacciones reales con pg (BEGIN/COMMIT,
  ROLLBACK si algo falla).

Dame el plan antes de escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Cada actualización que toca varias tablas (saldo + partida + estado de factura) ocurre dentro de una transacción real, con rollback si algo falla a mitad de camino?
- ¿El Tesorero puede ejecutar/devolver un pago pero nunca aprobar o rechazar la solicitud en sí?
- ¿Se verifica saldo suficiente en la cuenta bancaria antes de marcar el pago como ejecutado?
- ¿El número de operación es obligatorio al ejecutar un pago?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba el flujo completo:
Gerente Financiero aprueba una solicitud manual, Tesorero la ejecuta y confirma que el saldo de la
cuenta, la partida y el estado de la factura se actualizaron juntos. Prueba también que un
Tesorero no pueda acceder al endpoint de aprobar. Resume el resultado.
```

---

### Fase 9 — Balances y Cierre de Periodo

**Objetivo:** cerrar un periodo bloquea su edición para todos los roles, incluido quien lo cierra.

**📋 Prompt — Modo Plan**
```
Construye Balances y Cierre de Periodo, basado en 4.2 (funciones 11-12), 4.3 (funciones 12-15) y
el Flujo 4 del documento de roles. Alcance:

- Contador: generar el balance general y estado de resultados de un periodo (a partir de los datos
  ya existentes en asientos_contables, presupuestos, pagos y cobros — no inventes datos), y
  enviarlo al Gerente Financiero.
- Gerente Financiero: revisar y dar su visto bueno.
- Contador: ejecutar el cierre formal del periodo (marca periodos_fiscales.estado = 'Cerrado').
  A partir de ahí, TODOS los endpoints que escriben en asientos_contables, facturas, pagos y
  cobros de ese periodo deben verificar primero si el periodo está cerrado y, si lo está, rechazar
  la escritura — sin excepción para ningún rol, incluido el propio Contador.
- Gerente Financiero: autorizar la reapertura de un periodo cerrado, con motivo obligatorio,
  quedando registrado quién la autorizó.

Dame el plan antes de escribir código, incluyendo en qué endpoints ya existentes (de fases
anteriores) hay que agregar la verificación de "periodo cerrado".
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Identifica todos los endpoints de escritura afectados por un cierre de periodo (no solo los nuevos de esta fase)?
- ¿La verificación de periodo cerrado aplica sin excepción, incluido el Contador que hizo el cierre?
- ¿Solo el Gerente Financiero puede autorizar una reapertura, y queda guardado el motivo y quién la autorizó?
- ¿El balance refleja datos reales ya cargados, no valores de ejemplo inventados?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba cerrar un periodo y
confirma que intentar registrar un pago o asiento contra ese periodo falla para cualquier rol.
Prueba también la reapertura por el Gerente Financiero. Resume el resultado.
```

---

### Fase 10 — Auditoría

**Objetivo:** el Auditor ve todo en modo lectura y solo puede escribir sus propias observaciones.

**📋 Prompt — Modo Plan**
```
Construye el módulo de Auditoría, basado en la sección 4.5 y el Flujo 5 del documento de roles.
Alcance:

- Vistas de solo lectura para el Auditor sobre presupuestos, cuentas, pagos, cobros, balances,
  facturación y proveedores/clientes, mostrando trazabilidad completa (quién registró, quién
  aprobó, quién ejecutó y cuándo — esto ya está disponible con los campos id_usuario_* y fecha_*
  que existen en cada tabla desde las fases anteriores, no hace falta una tabla de historial nueva
  para esto).
- Registrar una observacion_auditoria sobre una transacción (módulo, referencia, motivo) sin
  alterar el registro original.
- Seguimiento del estado de cada observación propia: Abierta → En revisión → Cerrada.
- Al registrar una observación, notificar al Gerente Financiero (y también al Administrador si el
  hallazgo involucra usuarios o accesos).
- Generación de informes filtrando por periodo, usuario, módulo o tipo de transacción.

Confirma también que ningún otro rol (ni el Administrador) tenga acceso al contenido de este
módulo, salvo el Gerente Financiero viendo los hallazgos que le llegan. Dame el plan antes de
escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿El Auditor tiene lectura sobre TODOS los módulos financieros listados en la matriz, no solo algunos?
- ¿La única escritura permitida al Auditor es su propia tabla de observaciones (ninguna otra tabla)?
- ¿El Administrador queda sin acceso al contenido de Auditoría, tal como exige la sección 4.1?
- ¿Se puede filtrar el informe por periodo, usuario, módulo y tipo de transacción?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba que el Auditor pueda
leer los módulos financieros y registrar una observación, que el Administrador reciba 403 al
intentar ver el contenido de Auditoría, y que la notificación al Gerente Financiero se genere.
Resume el resultado.
```

---

### Fase 11 — Notificaciones

**Objetivo:** cada evento relevante ya construido en fases anteriores dispara una notificación al rol correcto.

**📋 Prompt — Modo Plan**
```
Este módulo es transversal: no es una pantalla aislada, es agregar un INSERT en `notificaciones`
al final de las transacciones que ya construimos en fases anteriores. Basado en las subsecciones
"Notificaciones" de 4.1 (función 11), 4.2 (funciones 17-19), 4.3 (funciones 24-28), 4.4 (funciones
12-14) y 4.5 (función 7) del documento de roles, identifica cada evento que ya existe en el código
y agrégale su notificación correspondiente, por ejemplo: presupuesto enviado a aprobación (avisa
al Gerente Financiero), presupuesto aprobado/rechazado (avisa al Contador), solicitud de pago
pendiente de aprobación manual (avisa al Gerente Financiero), pago ejecutado (avisa al Contador
para que concilie), hallazgo de auditoría (avisa al Gerente Financiero/Administrador), entre
otros. Además:

- Un componente de campanita/lista de notificaciones por usuario (leídas y no leídas), y un
  endpoint para marcarlas como leídas.
- Deja aparte, señalado en el plan, cualquier alerta que dependa del tiempo y no de una acción de
  usuario (ej. "factura próxima a vencer", "saldo de cuenta por debajo del mínimo") — para esas
  necesitamos un endpoint que se pueda llamar periódicamente (o un cron), no ocurren solas.

Dime primero en qué archivos exactos vas a agregar cada notificación antes de tocar nada.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Identifica cada evento de negocio ya construido (fases 4 a 10) que necesita disparar una notificación?
- ¿Un usuario solo puede ver sus propias notificaciones, nunca las de otro?
- ¿Deja claro cómo se van a generar las alertas dependientes del tiempo (vencimientos, saldos mínimos), ya que no ocurren en el momento de una acción?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba dos o tres de los
flujos ya construidos (por ejemplo, aprobar un presupuesto y ejecutar un pago) y confirma que la
notificación correcta le aparece al usuario correcto. Resume el resultado.
```

---

### Fase 12 — Dashboards y Reportes

**Objetivo:** un dashboard distinto por rol, con exportación de lo que cada uno ve.

**📋 Prompt — Modo Plan**
```
Construye los dashboards, basados en 4.1 (función 15), 4.2 (funciones 14-15), 4.3 (funciones
22-23), 4.4 (funciones 10-11), 4.5 (funciones 9-10), y las filas "Dashboard / Reportes" y
"Exportación de reportes" de la matriz de permisos (sección 6) del documento de roles:

- Administrador: uso del sistema, accesos.
- Gerente Financiero: ingresos vs. egresos, balance general, flujo de caja consolidado, ejecución
  presupuestaria por área, indicadores clave.
- Contador: cuentas por pagar/cobrar pendientes, ejecución presupuestaria, flujo de caja; reportes
  de libro diario, libro mayor, balance de comprobación.
- Tesorero: saldo por cuenta en tiempo real, pagos ejecutados y pendientes de ejecutar.
- Auditor: alertas activas, transacciones marcadas, cumplimiento de políticas de aprobación.

Para exportar: no tenemos librería definida en el stack para esto. Propón en el plan una opción
concreta (por ejemplo: CSV generado a mano sin dependencias para lo que el documento llama
"Excel", y una librería liviana para PDF) antes de instalar nada, para que la apruebe.

Dame el plan de qué ve cada rol y con qué datos reales antes de escribir código.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Cada rol ve solo el contenido de dashboard que le corresponde según la matriz, ni más ni menos?
- ¿Los datos del dashboard salen de las tablas reales, no de valores de ejemplo?
- ¿Propuso una librería concreta (o la alternativa sin dependencias) para exportar, en vez de asumir una sin decirlo?
- ¿La exportación refleja lo que está filtrado en pantalla, no todo el sistema sin filtrar?

**🔨 Prompt — Modo Build**
```
Implementa el plan aprobado. Corre npm run build y corrige errores. Prueba entrar con cada uno de
los 5 usuarios de seed y confirma que cada dashboard muestra lo que le corresponde. Resume el
resultado.
```

---

### Fase 13 — QA final: los 5 flujos completos y seguridad

**Objetivo:** recorrer el sistema de punta a punta antes de darlo por terminado.

**📋 Prompt — Modo Plan**
```
Última fase: no se agrega funcionalidad nueva, se verifica todo lo construido. Arma un plan de
pruebas que recorra, con los usuarios de seed, los 5 Flujos de trabajo completos de la sección 5
del documento de roles (alta de usuario, presupuesto, pago, cierre de periodo, irregularidad) de
principio a fin, y que además revise:

- Que cada endpoint de la API (no solo las pantallas) rechace con 401/403 a un rol sin permiso,
  probando llamarlos directamente.
- Que una cookie de sesión alterada a mano sea rechazada por la verificación HMAC.
- Que el cierre de un periodo bloquee ediciones para todos los roles, sin excepción.
- Que ningún rol pueda aprobar o ejecutar algo que él mismo solicitó o registró.
- Una revisión visual básica de que las pantallas principales se vean bien con Tailwind (sin
  romperse en móvil).

Dame el plan de pruebas (qué vas a probar y cómo) antes de ejecutarlo.
```

**✅ Qué revisar antes de aprobar el plan**
- ¿Cubre los 5 flujos completos del documento de roles, no una versión resumida?
- ¿Prueba los endpoints directamente (no solo a través de la interfaz)?
- ¿Incluye probar que la firma de la cookie realmente rechaza una cookie alterada?
- ¿Incluye probar el bloqueo de un periodo cerrado para todos los roles?

**🔨 Prompt — Modo Build**
```
Ejecuta el plan de pruebas aprobado. Por cada falla que encuentres, corrígela y vuelve a probar
ese punto específico antes de seguir con el siguiente. Al terminar, dame un resumen de qué se
probó, qué se corrigió, y si el sistema queda listo o si algo necesita una fase adicional.
```

---

## 8. Notas finales

- **Un commit por fase.** `git add -A && git commit -m "fase N: ..."` después de cada Build exitoso — es tu red de seguridad si una fase futura rompe algo.
- **Prueba antes de avanzar.** No pegues el Plan de la fase siguiente hasta haber probado a mano lo que la fase anterior construyó.
- **Está bien que Open Code proponga ajustes menores** en cada Plan (nombres de componentes, orden de campos en un formulario, etc.). Lo que no debe ceder son las reglas de segregación de funciones, el stack fijo de la sección 3, y el esquema de la sección 6.
- **Si Open Code se desvía** (agrega una librería no pedida, crea una tabla nueva, mezcla dos fases), no lo dejes seguir en modo Build: vuelve a Plan, corrígelo ahí, y recién entonces continúa.
- Este documento y el de roles son la memoria persistente del proyecto — si en algún momento Open Code "olvida" una regla, es más rápido señalarle la sección exacta de uno de los dos documentos que reexplicarla desde cero.
