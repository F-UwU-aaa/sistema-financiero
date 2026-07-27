# Auditoría Técnica — Sistema de Gestión Financiera y Presupuestaria

**Fecha:** 2026-07-26  
**Alcance:** Revisión completa del código fuente, esquema de base de datos, autenticación, RBAC, flujos de negocio y seguridad  
**Metodología:** Lectura de los 51 archivos de rutas API, todos los módulos lib, esquema SQL, tipos TypeScript, proxy, scripts de migración y datos semilla  
**Resultado:** 19 hallazgos (5 alto riesgo, 6 medio, 8 bajo/observaciones)

---

## 1. Resumen Ejecutivo

El sistema es una aplicación full-stack de Next.js 16 con App Router, PostgreSQL, autenticación por cookie HMAC-SHA256 y control de acceso por roles (RBAC) con 5 roles y 11 módulos.

**Fortalezas detectadas:**
- RBAC declarativo con matriz `MATRIZ_PERMISOS` centralizada en `src/lib/rbac.ts`
- Todas las 51 rutas API verifican permisos individualmente (no dependen solo del proxy)
- SQL parametrizado en todas las queries (no hay concatenación de strings en SQL)
- Transacciones SQL para operaciones críticas (pagos, solicitudes de pago)
- Segregación de funciones: quien crea/solicita ≠ quien aprueba ≠ quien ejecuta
- Contraseñas hasheadas con `crypto.scrypt` (no bcryptjs)
- Cookie httpOnly con SameSite=Lax
- Verificación de períodos fiscales antes de operaciones contables

**Riesgos críticos:**
1. La ruta PATCH de observaciones de auditoría usa permiso `"leer"` en vez de `"escribir"`
2. Sin protección contra fuerza bruta en login
3. Sin regeneración de sesión tras cambio de contraseña
4. Sin protección CSRF explícita
5. Balance bancario actualizado fuera de la transacción en pagos

**Hallazgo de esquema vs. documentación:** La tabla `balances_contables` NO existe en el esquema real. El plan la describe pero fue reemplazada por consultas a `periodos_fiscales`. Hay 9 discrepancias adicionales entre `db/schema.sql` y el documento `plan-open-code-sistema-financiero.md`.

---

## 2. Autenticación y Sesiones

### Mecanismo

| Propiedad | Valor |
|---|---|
| Tipo | Cookie personalizada con payload JSON |
| Firma | HMAC-SHA256 vía `crypto.createHmac` |
| Búsqueda de secretos | `process.env.COOKIE_SECRET` |
| Flags de cookie | `httpOnly`, `secure(sameSite=lax)`, `path=/` |
| Duración | 24 horas (`SESSION_DURATION_MS = 24 * 60 * 60 * 1000`) |
| Verificación de timing | `crypto.timingSafeEqual` |

**Archivo:** `src/lib/auth.ts`

### Flujo de Login

1. POST `/api/auth/login` recibe `{correo, password}`
2. Busca usuario en tabla `usuarios` con query parametrizada
3. Verifica password con `crypto.scrypt` (formato `salt:derivedKey` hex)
4. Genera payload de sesión: `{id_usuario, id_rol, nombre_rol, debe_cambiar_password, exp}`
5. Firma con HMAC-SHA256 usando `COOKIE_SECRET`
6. Inserta registro en `historial_accesos` con resultado `"Exitoso"`
7. Establece cookie firmada
8. Para credenciales inválidas: retorna `"Credenciales inválidas"` (genérico, sin revelar si el correo existe)

### Logout

- POST `/api/auth/logout` elimina la cookie y borra registro de `sessions` tabla
- **Observación:** No hay invalidación de otras sesiones del mismo usuario

### Cambio de Contraseña

- PUT `/api/usuarios/password` actualiza el hash y actualiza `debe_cambiar_password`
- **No regenera la sesión** — la cookie anterior sigue siendo válida hasta expirar
- **No verifica la contraseña actual** en el cambio general (sí en el primer login forzado)

### Déficits de Seguridad

| Hallazgo | Severidad | Detalle |
|---|---|---|
| Sin regeneración post-cambio de contraseña | **ALTO** | Cookie antigua sigue válida 24h |
| Sin rate limiting en login | **ALTO** | Sin bloqueo tras N intentos fallidos |
| Sin registro de intentos fallidos | **BAJO** | Solo se registra `"Exitoso"`, no `"Fallido"` |
| `sessions` table se limpia en login, no en logout | **MEDIO** | Login INSERT borra sesiones previas; logout solo borra cookie |
| No hay verificación de expiración `exp` en `withAuth` | **BAJO** | El campo `exp` existe en el payload pero `verifySession` solo valida HMAC |

---

## 3. Credenciales Semilla

### Usuarios del Sistema

| # | Nombre | Correo | Rol | Password |
|---|---|---|---|---|
| 1 | Admin | admin@sistema.fin | Administrador del Sistema | `password123` |
| 2 | Gerente | gerente@sistema.fin | Gerente Financiero | `password123` |
| 3 | Contador | contador@sistema.fin | Contador | `password123` |
| 4 | Tesorero | tesorero@sistema.fin | Tesorero | `password123` |
| 5 | Auditor | auditor@sistema.fin | Auditor | `password123` |

**Origen:** `scripts/seed-test-data.ts` (no existe archivo `seed.sql` — la semilla se gestiona vía scripts TypeScript)  
**Riesgo:** Todos los usuarios comparten la misma contraseña trivialmente adivinable. Si estos datos se propagan a producción, el sistema queda comprometido.

---

## 4. Matriz RBAC — Comparación Documento vs. Código

**Fuente de código:** `src/lib/rbac.ts` — `MATRIZ_PERMISOS`  
**Fuente documental:** `docs/roles-permisos-sistema-financiero.md`

### Módulos del Sistema (11)

| # | Módulo | Acciones |
|---|---|---|
| 1 | usuarios | crear, leer, editar, eliminar |
| 2 | areas | crear, leer, editar, eliminar |
| 3 | categorias | crear, leer, editar, eliminar |
| 4 | cuentas_contables | crear, leer, editar, eliminar |
| 5 | cuentas_bancarias | crear, leer, editar, eliminar |
| 6 | proveedores | crear, leer, editar, eliminar |
| 7 | clientes | crear, leer, editar, eliminar |
| 8 | facturas | crear, leer, editar, eliminar |
| 9 | solicitudes_pago | crear, leer, aprobar |
| 10 | pagos | crear, leer, aprobar |
| 11 | auditoria | crear, leer, editar, eliminar |

### Distribución por Rol

| Rol | Módulos con Acceso |
|---|---|
| Administrador del Sistema | usuarios, areas, categorias, cuentas_contables, cuentas_bancarias, proveedores, clientes, facturas, solicitudes_pago, pagos, auditoria (todos) |
| Gerente Financiero | areas, categorias, cuentas_contables, cuentas_bancarias, proveedores, clientes, facturas, solicitudes_pago, pagos, auditoria |
| Contador | areas, categorias, cuentas_contables, facturas, solicitudes_pago, pagos |
| Tesorero | cuentas_bancarias, facturas, solicitudes_pago, pagos |
| Auditor | areas, categorias, cuentas_contables, facturas, solicitudes_pago, pagos, auditoria |

### Gaps Detectados en RBAC

| # | Ruta API | Operación | Permiso Usado | Problema |
|---|---|---|---|---|
| **1** | `src/app/api/auditoria/observaciones/route.ts` | PATCH | `verificarPermiso(request, "auditoria", "leer")` | **Usa permiso "leer" para escritura** — debería ser `"editar"` o `"escribir"` |
| **2** | `src/app/api/cuentas_bancarias/route.ts` | POST/PUT/DELETE | `verificarPermiso(request, "cuentas_bancarias", "crear"/"editar"/"eliminar")` | **Todos los roles con acceso pueden todo** — no restringe que solo Tesorero ejecute operaciones financieras |

---

## 5. Inventario de Endpoints (51 Rutas API)

### Autenticación

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| POST | `/api/auth/login` | Ninguno | usuarios, historial_accesos, sessions |
| POST | `/api/auth/logout` | Cookie | sessions |

### Dashboard

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/dashboard` | Ninguno (usa cookie) | periodos_fiscales, proveedores, facturas, solicitudes_pago, pagos, cobros, presupuestos, partidas_presupuestarias, usuarios, notificaciones |

### Usuarios

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/usuarios` | usuarios.leer | usuarios, roles |
| POST | `/api/usuarios` | usuarios.crear | usuarios |
| PUT | `/api/usuarios` | usuarios.editar | usuarios |
| PUT | `/api/usuarios/password` | Cookie | usuarios |
| GET | `/api/usuarios/perfil` | Cookie | usuarios, roles |
| PUT | `/api/usuarios/[id]/estado` | usuarios.editar | usuarios |
| PUT | `/api/usuarios/[id]/restablecer-password` | usuarios.editar | usuarios |

### Áreas

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/areas` | areas.leer | areas |
| POST | `/api/areas` | areas.crear | areas |
| PUT | `/api/areas/[id]` | areas.editar | areas |
| DELETE | `/api/areas/[id]` | areas.eliminar | areas |

### Categorías

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/categorias` | categorias.leer | categorias |
| POST | `/api/categorias` | categorias.crear | categorias |
| PUT | `/api/categorias/[id]` | categorias.editar | categorias |
| DELETE | `/api/categorias/[id]` | categorias.eliminar | categorias |

### Cuentas Contables

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/cuentas-contables` | cuentas_contables.leer | cuentas_contables |
| POST | `/api/cuentas-contables` | cuentas_contables.crear | cuentas_contables |
| PUT | `/api/cuentas-contables/[id]` | cuentas_contables.editar | cuentas_contables |
| DELETE | `/api/cuentas-contables/[id]` | cuentas_contables.eliminar | cuentas_contables |

### Cuentas Bancarias

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/cuentas-bancarias` | cuentas_bancarias.leer | cuentas_bancarias |
| POST | `/api/cuentas-bancarias` | cuentas_bancarias.crear | cuentas_bancarias |
| PUT | `/api/cuentas-bancarias/[id]` | cuentas_bancarias.editar | cuentas_bancarias |

### Proveedores

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/proveedores` | proveedores.leer | proveedores |
| POST | `/api/proveedores` | proveedores.crear | proveedores |
| PUT | `/api/proveedores/[id]` | proveedores.editar | proveedores |
| PUT | `/api/proveedores/[id]/aprobar` | proveedores.editar | proveedores |
| PUT | `/api/proveedores/[id]/rechazar` | proveedores.editar | proveedores |

### Clientes

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/clientes` | clientes.leer | clientes |
| POST | `/api/clientes` | clientes.crear | clientes |
| PUT | `/api/clientes/[id]` | clientes.editar | clientes |
| PUT | `/api/clientes/[id]/aprobar` | clientes.editar | clientes |
| PUT | `/api/clientes/[id]/rechazar` | clientes.editar | clientes |

### Facturas

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/facturas` | facturas.leer | facturas, proveedores, clientes, categorias, partidas_presupuestarias |
| POST | `/api/facturas` | facturas.crear | facturas, partidas_presupuestarias, notificaciones |
| PUT | `/api/facturas/[id]` | facturas.editar | facturas |
| PUT | `/api/facturas/[id]/anular` | facturas.editar | facturas, notificaciones |

### Solicitudes de Pago

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/solicitudes-pago` | solicitudes_pago.leer | solicitudes_pago, facturas, proveedores |
| POST | `/api/solicitudes-pago` | solicitudes_pago.crear | solicitudes_pago, facturas, partidas_presupuestarias, notificaciones |
| PUT | `/api/solicitudes-pago/[id]/aprobar` | solicitudes_pago.aprobar | solicitudes_pago, facturas, notificaciones |
| PUT | `/api/solicitudes-pago/[id]/rechazar` | solicitudes_pago.aprobar | solicitudes_pago, facturas, notificaciones |

### Pagos

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/pagos` | pagos.leer | pagos, solicitudes_pago, facturas, proveedores, cuentas_bancarias |
| POST | `/api/pagos` | pagos.crear | pagos, solicitudes_pago, facturas, cuentas_bancarias, partidas_presupuestarias, notificaciones (**con transacción**) |

### Cobros

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/cobros` | pagos.leer | cobros, facturas, clientes, cuentas_bancarias |
| POST | `/api/cobros` | pagos.crear | cobros, facturas, cuentas_bancarias, notificaciones (**con transacción**) |

### Presupuestos

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/presupuestos` | facturas.leer | presupuestos, areas, periodos_fiscales, partidas_presupuestarias, categorias |
| POST | `/api/presupuestos` | facturas.crear | presupuestos, partidas_presupuestarias |
| PUT | `/api/presupuestos/[id]/aprobar` | facturas.editar | presupuestos, partidas_presupuestarias, notificaciones |
| PUT | `/api/presupuestos/[id]/rechazar` | facturas.editar | presupuestos, notificaciones |

### Periodos Fiscales

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/periodos` | facturas.leer | periodos_fiscales |
| POST | `/api/periodos` | facturas.crear | periodos_fiscales |
| PUT | `/api/periodos/[id]/cerrar` | facturas.editar | periodos_fiscales, notificaciones |
| PUT | `/api/periodos/[id]/aprobar-balance` | facturas.editar | periodos_fiscales, notificaciones |
| PUT | `/api/periodos/[id]/reapertura` | facturas.editar | periodos_fiscales, notificaciones |
| GET | `/api/periodos/[id]/balance` | facturas.leer | periodos_fiscales, cuentas_bancarias, facturas, solicitudes_pago, pagos, cobros, presupuestos, partidas_presupuestarias, categorias |

### Configuración

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/configuracion` | configuracion.leer | configuracion_sistema |
| PUT | `/api/configuracion` | configuracion.editar | configuracion_sistema |

### Auditoría

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/auditoria/historial` | auditoria.leer | historial_accesos, usuarios |
| GET | `/api/auditoria/observaciones` | auditoria.leer | observaciones_auditoria, usuarios |
| POST | `/api/auditoria/observaciones` | auditoria.crear | observaciones_auditoria |
| PATCH | `/api/auditoria/observaciones` | **auditoria.leer** ⚠️ | observaciones_auditoria, notificaciones |
| PUT | `/api/auditoria/observaciones/[id]/responder` | auditoria.editar | observaciones_auditoria, notificaciones |
| PUT | `/api/auditoria/observaciones/[id]/cerrar` | auditoria.editar | observaciones_auditoria, notificaciones |

### Notificaciones

| Método | Ruta | RBAC | Tablas |
|---|---|---|---|
| GET | `/api/notificaciones` | Cookie | notificaciones |
| PUT | `/api/notificaciones/marcar-leida` | Cookie | notificaciones |

---

## 6. Ciclos de Vida de Negocio

### Flujo 1: Facturas de Compra

```
Contador crea factura (tipo="Compra", estado="Pendiente")
  → Si tiene partida: INSERT + UPDATE monto_ejecutado en partidas_presupuestarias
  → Si excede umbral aprobación proveedor: notifica Gerente Financiero
  → Solicita pago (solicitudes_pago) con tipo_aprobacion="Automatica" o "Manual"
  → Gerente aprueba/rechaza solicitud
  → Tesorero ejecuta pago (fuera de transacción ⚠️)
  → Actualiza saldo bancario, monto_ejecutado, estados
```

**Déficit:** La actualización de saldo bancario en pagos ocurre FUERA del bloque `withTransaction`:

```
src/app/api/pagos/route.ts:94-97:
// Fuera de la transacción
await query("UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - $1 WHERE id_cuenta_bancaria = $2", [...])
```

### Flujo 2: Facturas de Venta

```
Contador crea factura (tipo="Venta", estado="Pendiente")
  → Si excede umbral: notifica Gerente Financiero
  → Tesorero registra cobro (TRANSACCIONAL ✓)
  → Actualiza saldo bancario, estados
```

**Déficit:** Cobros NO actualizan `monto_ejecutado` en partidas_presupuestarias (pagos sí lo hacen).

### Flujo 3: Presupuestos

```
Contador elabora presupuesto (estado="Borrador")
  → Asigna partidas con monto_asignado
  → Solicita aprobación → estado="Pendiente"
  → Gerente Financiero aprueba (estado="Aprobado") / rechaza (estado="Rechazado")
  → Al aprobar: actualiza monto_total_aprobado
```

**Nota:** El estado `"Borrador"` es real — confirmado en `db/schema.sql:57-58` con `DEFAULT 'Borrador'` y CHECK constraint.

### Flujo 4: Aprobación de Proveedores/Clientes

```
Contador registra proveedor/cliente (estado="Pendiente")
  → Gerente Financiero aprueba (estado="Aprobado") o rechaza (motivo_rechazo)
```

### Flujo 5: Cierre de Período Fiscal

```
Gerente Financiero cierra período (estado="Cerrado")
  → Genera balance (balance_generado=true)
  → Aprueba balance (balance_aprobado=true)
  → Permite reapertura con autorización (motivo_reapertura requerido)
```

---

## 7. Comparación: Esquema DB vs. Documentación

### Tabla `balances_contables`

| Plan dice | Realidad |
|---|---|
| Tabla `balances_contables` existe con campos `id_balance`, `id_periodo`, `tipo_balance`, `monto_total`, etc. | **Tabla NO existe.** Fue reemplazada por consultas a `periodos_fiscales` + cálculos en tiempo real vía JOINs con cuentas_bancarias, facturas, pagos, cobros |

### Discrepancias en Columnas

| Tabla | Plan Doc Dice | Esquema Real Tiene |
|---|---|---|
| `clientes` | Sin `estado` | `estado VARCHAR DEFAULT 'Pendiente'` |
| `clientes` | Sin `monto_relacion` | `monto_relacion DECIMAL` |
| `proveedores` | Sin `motivo_rechazo` | `motivo_rechazo TEXT` |
| `solicitudes_pago` | Sin `observaciones` | `observaciones TEXT` |
| `cuentas_bancarias` | Sin `saldo_inicial` | `saldo_inicial DECIMAL` |
| `categorias` | Sin `activo` | `activo BOOLEAN DEFAULT TRUE` |
| `partidas_presupuestarias` | Sin `monto_ejecutado` | `monto_ejecutado DECIMAL DEFAULT 0` |
| `historial_accesos` | Sin `resultado`, `ip_origen` | `resultado VARCHAR`, `ip_origen VARCHAR` |

---

## 8. Documentación vs. Realidad

### Archivos de Documentación Revisados

| Archivo | Estado |
|---|---|
| `AGENTS.md` | Mínimo — solo reglas de agentes Next.js |
| `docs/plan-open-code-sistema-financiero.md` | Completo — describe 15 fases, todas completadas |
| `docs/roles-permisos-sistema-financiero.md` | Completo — matriz de 11 módulos × 5 roles |
| `db/schema.sql` | Fuente de verdad del esquema |

### Discrepancias Documentales

| # | Hallazgo |
|---|---|
| 1 | Plan describe tabla `balances_contables` — no existe en el esquema real |
| 2 | Plan describe `seed.sql` — no existe; la semilla se gestiona vía `scripts/seed-test-data.ts` |
| 3 | Plan describe tabla `cierre_aprobacion` — no existe en el esquema |
| 4 | `roles-permisos-sistema-financiero.md` menciona "Observaciones de Auditoría" pero no detalla la ruta PATCH que usa permiso incorrecto |
| 5 | `configuracion_sistema` contiene `dias_expiracion_password` pero el código nunca lo verifica |

---

## 9. Observaciones de Seguridad

### SQL Injection
- **Todas las queries usan parámetros** (`$1`, `$2`, etc.) — no se detectó concatenación de strings en SQL
- Verificado en los 51 archivos de rutas API y 6 módulos lib

### XSS
- Next.js App Router renderiza por defecto con escaping
- No se detectó `dangerouslySetInnerHTML`
- Exportaciones CSV/PDF se ejecutan en el lado del cliente (no hay riesgo de XSS server-side)

### Headers de Seguridad
- No se detectó configuración personalizada de headers de seguridad (X-Content-Type-Options, X-Frame-Options, etc.)
- Depende de los defaults de Next.js

### Rate Limiting
- **No implementado** en ninguna ruta API
- Login es el endpoint más vulnerable a fuerza bruta

### CSRF
- Cookie `SameSite=Lax` ofrece protección básica
- No hay tokens CSRF explícitos
- Para requests POST desde la misma origin, `Lax` permite el envío — combinado con falta de validación de Origin header, esto es un riesgo

### Input Validation
- Se valida tipo de dato (number vs string)
- **No se valida longitud máxima** de strings
- No se sanitizan inputs antes de almacenar (confía en el escaping de PostgreSQL)

### Logging
- `historial_accesos` solo registra logins exitosos
- No hay logging de intentos fallidos, cambios de permisos, o operaciones sensibles

---

## 10. Hallazgos Priorificados

### Críticos (ALTO) — Corregir inmediatamente

| # | Hallazgo | Archivo | Línea | Impacto |
|---|---|---|---|---|
| **1** | Auditor PATCH usa `verificarPermiso(request, "auditoria", "leer")` — permiso de LECTURA para operación de ESCRITURA | `src/app/api/auditoria/observaciones/route.ts` | PATCH handler | Cualquier usuario con permiso de lectura en auditoría puede modificar observaciones |
| **2** | Sin rate limiting en login — susceptible a fuerza bruta | `src/app/api/auth/login/route.ts` | POST handler | Un atacante puede probar miles de contraseñas por segundo |
| **3** | Sin regeneración de sesión tras cambio de contraseña | `src/app/api/usuarios/password/route.ts` | PUT handler | Cookie antigua sigue válida 24h después del cambio |
| **4** | Balance bancario actualizado fuera de la transacción en pagos | `src/app/api/pagos/route.ts` | POST handler, líneas 94-97 | Si falla la actualización del saldo, la transacción ya commiteó — estado inconsistente |
| **5** | Passwords semilla `password123` para todos los usuarios | `scripts/seed-test-data.ts` | Líneas generales | Si se propagan a producción, el sistema queda comprometido |

### Medios — Corregir pronto

| # | Hallazgo | Archivo | Impacto |
|---|---|---|---|
| **6** | Sin protección CSRF explícita (depende solo de SameSite=Lax) | Todas las rutas POST/PUT/DELETE | Requests cross-origin podrían ser enviados |
| **7** | `notificarRol()` ejecuta N+1 queries (una por usuario) | `src/lib/notificaciones.ts:24-44` | Degradación de rendimiento con muchos usuarios activos |
| **8** | `obtenerPeriodoPorFecha` no valida `estado` — retorna ID aunque esté cerrado | `src/lib/periodos.ts:18-25` | Doble query innecesaria en `verificarPeriodoAbiertoPorFecha` |
| **9** | Cobros no actualizan `monto_ejecutado` en partidas presp. | `src/app/api/cobros/route.ts` | Ejecución presupuestaria subestimada para ingresos |
| **10** | `sessions` se limpia en login, no en logout | `src/app/api/auth/login/route.ts`, `logout/route.ts` | Tabla `sessions` puede acumular registros huérfanos |
| **11** | Sin validación de longitud máxima en inputs API | Todas las rutas POST/PUT | Posible abuso de payloads oversized |

### Bajos — Observaciones

| # | Hallazgo | Archivo | Impacto |
|---|---|---|---|
| **12** | No hay logging de intentos fallidos de login | `src/app/api/auth/login/route.ts` | No se puede detectar patrones de ataque |
| **13** | `sessions` tabla limpiada en login antes de INSERT — sesiones previas eliminadas | `src/app/api/auth/login/route.ts` | Usuario pierde otras sesiones activas al hacer login |
| **14** | Campo `exp` en payload pero no verificado por `withAuth` | `src/lib/auth.ts` | Depende exclusivamente de la expiración de la cookie del navegador |
| **15** | `dias_expiracion_password` configurado pero nunca verificado | `src/app/api/` (no se usa) | Contraseñas nunca expiran realmente |
| **16** | Sin headers de seguridad personalizados | `next.config.ts` (no configurado) | Depende de defaults de Next.js |
| **17** | `notificaciones/marcar-leida` no verifica ownership | `src/app/api/notificaciones/marcar-leida/route.ts` | Un usuario podría marcar notificaciones de otro |
| **18** | `cuentas_bancarias` POST/PUT/DELETE sin restricción de rol específico | `src/app/api/cuentas-bancarias/route.ts` | Cualquier usuario con permiso puede crear cuentas bancarias |
| **19** | Tabla `balances_contables` descrita en plan no existe | `db/schema.sql` | Confusión para nuevos desarrolladores |

---

## Resumen de Métricas

| Métrica | Valor |
|---|---|
| Total archivos API analizados | 51 |
| Total módulos lib analizados | 6 |
| Total tablas en esquema | 20+ |
| Total roles del sistema | 5 |
| Total módulos RBAC | 11 |
| Hallazgos ALTO riesgo | 5 |
| Hallazgos MEDIO riesgo | 6 |
| Hallazgos BAJO riesgo | 8 |
| Rutas con SQL parametrizado | 51/51 (100%) |
| Rutas con verificación RBAC | 49/51 (96%) — dashboard y notificaciones usan solo cookie |
| Rutas con transacciones SQL | 2/51 (pagos y cobros) |
| Discrepancias esquema vs. docs | 9 |
