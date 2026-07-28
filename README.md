# Sistema de Gestion Financiera y Presupuestaria

Sistema web full-stack para la gestion financiera, presupuestaria y contable de una empresa. Control de acceso por roles, segregacion de funciones, aprobaciones multinivel y notificaciones en tiempo real.

## Stack Tecnologico

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Next.js API Routes, PostgreSQL via `pg` (SQL crudo, sin ORM)
- **Autenticacion:** Cookie httpOnly firmada con HMAC-SHA256 (modulo `crypto` nativo)
- **RBAC:** Matriz declarativa de permisos (11 modulos x 5 roles)
- **Graficos:** Recharts
- **Exportacion:** jsPDF + jspdf-autotable (PDF), Blob (CSV)
- **Iconos:** Lucide React
- **Estilos:** Tailwind CSS v4 con design tokens personalizados

## Prerrequisitos

- [Node.js](https://nodejs.org/) >= 18
- [PostgreSQL](https://www.postgresql.org/) >= 12
- npm

## Instalacion

```bash
# 1. Clonar el repositorio
git clone https://github.com/TU_USUARIO/sistema-financiero.git
cd sistema-financiero

# 2. Instalar dependencias
npm install

# 3. Crear la base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE sistema_financiero;"

# 4. Ejecutar el esquema SQL
psql -U postgres -d sistema_financiero -f db/schema.sql

# 5. Ejecutar el seed (usuarios, roles, datos iniciales)
npx tsx scripts/migrate.ts
```

## Variables de Entorno

Crear el archivo `.env.local` en la raiz del proyecto:

```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/sistema_financiero"
COOKIE_SECRET="cadena_aleatoria_de_64caracteres_hexadecimales"
```

| Variable | Descripcion |
|----------|-------------|
| `DATABASE_URL` | URL de conexion a PostgreSQL |
| `COOKIE_SECRET` | Secreto para firmar la cookie de sesion (minimo 64 caracteres hex) |

## Comandos Disponibles

```bash
npm run dev        # Iniciar servidor de desarrollo (Turbopack)
npm run build      # Construir para produccion
npm start          # Iniciar servidor de produccion
npm run db:migrate # Ejecutar migracion y seed de datos
```

## Usuarios de Prueba

Todos los usuarios tienen la contrasena: **`password123`**

| Rol | Correo | Contrasena |
|-----|--------|------------|
| Administrador del Sistema | admin@empresa.com | password123 |
| Gerente Financiero | gerente@empresa.com | password123 |
| Contador | contador@empresa.com | password123 |
| Tesorero | tesorero@empresa.com | password123 |
| Auditor | auditor@empresa.com | password123 |

> En la pagina de login hay botones de acceso rapido para cada rol.

## Estructura del Proyecto

```
sistema-financiero/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Login, cambiar contrasena
│   │   ├── (dashboard)/         # Paneles por rol (admin, gerente, contador, tesorero, auditor)
│   │   ├── api/                 # 51 endpoints REST
│   │   └── globals.css          # Estilos globales y design tokens
│   ├── components/
│   │   ├── ui/                  # 20 componentes reutilizables
│   │   ├── layout/              # Sidebar, Navbar, NotificationBell
│   │   └── dashboard/           # ChartBarras, ChartDonut
│   ├── lib/
│   │   ├── auth.ts              # Autenticacion (cookie HMAC-SHA256)
│   │   ├── rbac.ts              # Matriz de permisos por rol
│   │   ├── db.ts                # Pool PostgreSQL, query(), withTransaction()
│   │   ├── notificaciones.ts    # Sistema de notificaciones
│   │   ├── periodos.ts          # Verificacion de periodos fiscales
│   │   └── export.ts            # Exportacion CSV y PDF
│   ├── types/
│   │   └── index.ts             # Interfaces TypeScript
│   └── proxy.ts                 # Middleware de proteccion de rutas
├── db/
│   └── schema.sql               # Esquema completo de la base de datos (20+ tablas)
├── scripts/
│   ├── migrate.ts               # Seed principal (roles, usuarios, areas, etc.)
│   ├── seed-test-data.ts        # Datos de prueba (proveedores, facturas, pagos)
│   ├── migrate-*.ts             # Migraciones incrementales
│   └── test-*.ts                # Scripts de verificacion
├── docs/
│   ├── Auditoria_web.md         # Auditoria tecnica completa
│   └── *.md                     # Documentacion adicional
└── .env.local                   # Variables de entorno (no se sube a git)
```

## Funcionalidades por Rol

### Administrador del Sistema
- Gestionar usuarios (crear, editar, desactivar)
- Configurar parametros del sistema
- Gestionar periodos fiscales
- Ver dashboard con metricas de seguridad y accesos

### Gerente Financiero
- Aprobar/rechazar presupuestos
- Aprobar/rechazar proveedores y clientes
- Aprobar/rechazar solicitudes de pago
- Aprobar/rechazar balances
- Responder observaciones de auditoria
- Ver dashboard con ejecucion presupuestaria y graficos

### Contador
- Elaborar y enviar presupuestos (borrador -> pendiente)
- Registrar facturas de compra y venta
- Crear solicitudes de pago
- Registrar cuentas contables
- Generar balances y cerrar periodos
- Ver dashboard con resumen de facturacion

### Tesorero
- Ejecutar pagos aprobados
- Registrar cobros
- Gestionar cuentas bancarias
- Ver dashboard con flujo de caja

### Auditor
- Crear observaciones de auditoria
- Cerrar observaciones
- Generar informes
- Ver todo en modo solo lectura

## API Endpoints

### Autenticacion
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/api/auth/login` | Iniciar sesion |
| POST | `/api/auth/logout` | Cerrar sesion |
| POST | `/api/auth/cambiar-password` | Cambiar contrasena |

### Usuarios
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/usuarios` | Listar usuarios |
| POST | `/api/usuarios` | Crear usuario |
| PUT | `/api/usuarios/[id]` | Editar usuario |
| DELETE | `/api/usuarios/[id]` | Desactivar usuario |

### Presupuestos
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/presupuestos` | Listar presupuestos |
| POST | `/api/presupuestos` | Crear presupuesto (borrador) |
| PUT | `/api/presupuestos/[id]` | Editar/enviar presupuesto |
| PATCH | `/api/presupuestos/[id]/aprobar` | Aprobar/rechazar |

### Facturacion
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/facturas` | Listar facturas |
| POST | `/api/facturas` | Crear factura |
| PATCH | `/api/facturas/[id]` | Anular factura |

### Solicitudes de Pago
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/solicitudes-pago` | Listar solicitudes |
| POST | `/api/solicitudes-pago` | Crear solicitud |
| PATCH | `/api/solicitudes-pago/[id]/aprobar` | Aprobar/rechazar |

### Pagos
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/pagos` | Listar pagos |
| POST | `/api/pagos` | Ejecutar pago |

### Cobros
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/cobros` | Listar cobros |
| POST | `/api/cobros` | Registrar cobro |

### Proveedores y Clientes
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/proveedores` | Listar proveedores |
| POST | `/api/proveedores` | Crear proveedor |
| PATCH | `/api/proveedores/[id]/aprobar` | Aprobar/rechazar |
| GET | `/api/clientes` | Listar clientes |
| POST | `/api/clientes` | Crear cliente |
| PATCH | `/api/clientes/[id]/aprobar` | Aprobar/rechazar |

### Balances y Periodos
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/balances` | Consultar balance |
| POST | `/api/balances/generar` | Generar balance |
| PATCH | `/api/balances/[id]/aprobar` | Aprobar/rechazar balance |
| POST | `/api/balances/cerrar` | Cerrar periodo |
| POST | `/api/balances/reabrir` | Reabrir periodo |
| GET | `/api/periodos` | Listar periodos |
| POST | `/api/periodos` | Crear periodo |

### Auditoria
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/auditor/observaciones` | Listar observaciones |
| POST | `/api/auditor/observaciones` | Crear observacion |
| PATCH | `/api/auditor/observaciones/[id]` | Responder/cerrar observacion |

### Configuracion y Otros
| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/api/configuracion` | Ver configuracion |
| PUT | `/api/configuracion` | Actualizar configuracion |
| GET | `/api/notificaciones` | Listar notificaciones |
| GET | `/api/notificaciones/no-leidas` | Contar no leidas |
| PATCH | `/api/notificaciones/marcar-todas` | Marcar todas leidas |

## Flujo Principal del Sistema

```
1. Admin crea usuarios y periodos fiscales
2. Contador registra proveedores/clientes -> Gerente aprueba (si monto >= umbral)
3. Contador elabora presupuestos -> Gerente aprueba
4. Contador registra facturas (compra/venta)
5. Contador crea solicitud de pago -> Auto-aprobada (monto bajo) o Gerente aprueba (monto alto)
6. Tesorero ejecuta pagos y registra cobros
7. Contador genera balances -> Gerente aprueba -> Contador cierra periodo
8. Auditor supervisa y registra observaciones
```

## Licencia

MIT
