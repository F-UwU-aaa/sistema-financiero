# Manual de Roles, Flujo Completo y Preparacion para Exponer

## Sistema de Gestion Financiera y Presupuestaria

---

## 1. Tabla Rol × Modulo × Permiso

Extraida literal de `src/lib/rbac.ts`:

| Modulo | Administrador | Gerente Financiero | Contador | Tesorero | Auditor |
|--------|:------------:|:------------------:|:--------:|:--------:|:-------:|
| **usuarios** | crear, leer, modificar, desactivar | — | — | — | leer |
| **configuracion** | crear, leer, modificar | leer | leer | leer | leer |
| **presupuestos** | — | leer, **aprobar** | **crear**, leer, modificar | — | leer |
| **cuentas_contables** | — | leer | **crear**, leer, modificar | — | leer |
| **cuentas_bancarias** | — | leer | leer | **crear**, leer, modificar | leer |
| **pagos** | — | leer, **aprobar** | **crear**, leer | leer, **ejecutar** | leer |
| **cobros** | — | leer | leer | **crear**, leer | leer |
| **balances** | — | leer, **aprobar** | **crear**, leer, modificar | leer | leer |
| **facturacion** | — | leer | **crear**, leer, modificar | leer | leer |
| **proveedores_clientes** | — | leer, **aprobar** | **crear**, leer, modificar | leer | leer |
| **auditoria** | — | leer | — | — | **crear**, leer |

**Nota:** Roles sin permiso explicito = denegado (fail-closed). El Administrador NO tiene acceso a modulos financieros — solo gestiona usuarios y configuracion.

---

## 2. Manual por Rol

### 2.1 ADMINISTRADOR DEL SISTEMA

**Login:** `admin@empresa.com` / `password123`

**Menu Sidebar:**
- Dashboard → `/admin/dashboard`
- Usuarios → `/admin/usuarios`
- Configuracion → `/admin/configuracion`

**Dashboard (`/admin/dashboard`):**
- 4 KPI Cards: Total usuarios, Activos, Inactivos, Logins hoy
- Tabla "Usuarios por Rol"
- Panel "Seguridad" con intentos fallidos (7 dias) y logins exitosos hoy
- Tabla "Ultimos 20 Accesos" con nombre, correo, fecha, IP, resultado
- Botones de exportacion CSV y PDF

**Usuarios (`/admin/usuarios`):**
- CRUD completo: crear, editar, activar/desactivar usuarios
- Asignacion de rol al crear
- El sistema genera contrasena temporal automatica

**Configuracion (`/admin/configuracion`):**
- Ver/editar parametros del sistema (clave → valor):
  - `limite_aprobacion_automatica_pagos` (2000.00)
  - `umbral_aprobacion_proveedores` (50000)
  - `dias_expiracion_sesion` (1)
  - `intentos_fallidos_alerta` (5)

**Que NO puede hacer:** No ve presupuestos, facturas, pagos, cobros, balances ni auditoria.

---

### 2.2 GERENTE FINANCIERO

**Login:** `gerente@empresa.com` / `password123`

**Menu Sidebar:**
- Dashboard → `/gerente/dashboard`
- Presupuestos → `/gerente/presupuestos`
- Pagos → `/gerente/pagos`
- Proveedores/Clientes → `/gerente/proveedores`
- Auditoria → `/gerente/auditoria`
- Balances → `/gerente/balances`

**Dashboard (`/gerente/dashboard`):**
- KPI Cards: Resultado neto, Flujo de caja, Solicitudes pendientes, Proveedores pendientes, Clientes pendientes, Facturas por vencer
- Grafico de barras: Ejecucion presupuestaria por area
- Grafico dona: Gastos por categoria
- Tabla "Pagos Pendientes" con accion "Aprobar/Rechazar"
- Tabla "Proveedores Pendientes" con accion "Aprobar/Rechazar"
- Botones de exportacion CSV y PDF

**Presupuestos (`/gerente/presupuestos`):**
- Lista de presupuestos en estado "Pendiente"
- Boton "Aprobar" → cambia estado a "Aprobado", actualiza `monto_total_aprobado`
- Boton "Rechazar" → requiere motivo, cambia a "Rechazado"
- No puede auto-aprobarse (validacion: `id_usuario_elabora !== id_usuario_aprueba`)

**Pagos (`/gerente/pagos`):**
- Lista de solicitudes de pago con estado "Pendiente" y tipo "Manual"
- Boton "Aprobar/Rechazar"
- Al aprobar: actualiza `monto_ejecutado` en la partida presupuestaria

**Proveedores/Clientes (`/gerente/proveedores`):**
- Lista de proveedores/clientes con estado "Pendiente"
- Boton "Aprobar/Rechazar" (requiere motivo si rechaza)

**Auditoria (`/gerente/auditoria`):**
- Lista de observaciones de auditoria
- Boton "Responder" → abre modal para escribir respuesta → cambia estado a "En revision"

**Balances (`/gerente/balances`):**
- Lista de periodos con balance generado
- Boton "Aprobar Balance" → cambia `balance_aprobado = TRUE`
- Boton "Rechazar Balance" → resetea flags para que Contador regenere

**Que NO puede hacer:** No puede crear/editar presupuestos, facturas, proveedores, cuentas contables.

---

### 2.3 CONTADOR

**Login:** `contador@empresa.com` / `password123`

**Menu Sidebar:**
- Dashboard → `/contador/dashboard`
- Presupuestos → `/contador/presupuestos`
- Facturacion → `/contador/facturacion`
- Proveedores → `/contador/proveedores`
- Clientes → `/contador/clientes`
- Cuentas Contables → `/contador/cuentas-contables`
- Balances → `/contador/balances`

**Dashboard (`/contador/dashboard`):**
- KPI Cards: Total por pagar (proveedores), Total por cobrar (clientes), Facturas emitidas, Presupuestos activos
- Tabla "Flujo de Caja por Cuenta" (cuentas bancarias con saldos)
- Tabla "Ejecucion Presupuestaria por Categoria" con barras de progreso
- Grafico dona: Facturas por tipo (Compra vs Venta)
- Grafico dona: Solicitudes de pago por estado
- Botones de exportacion CSV y PDF

**Presupuestos (`/contador/presupuestos`):**
- Crear presupuesto (estado inicial: "Borrador")
- Agregar partidas (categoria + monto_asignado)
- Boton "Guardar Borrador" y Boton "Enviar a Aprobacion" (cambia a "Pendiente")
- Editar presupuestos en estado "Borrador" o "Rechazado"
- Solo ve sus propios presupuestos (filtro por `id_usuario_elabora`)

**Facturacion (`/contador/facturacion`):**
- Crear factura de Compra (requiere proveedor aprobado, opcional partida)
- Crear factura de Venta (requiere cliente)
- Boton "Anular" (requiere motivo, solo si estado no es Pagada/Cobrada/Anulada)
- Lista con filtros por tipo y estado

**Proveedores (`/contador/proveedores`):**
- CRUD de proveedores
- Si `monto_contrato >= umbral` (50000): estado "Pendiente", notifica a Gerente
- Si `monto_contrato < umbral`: estado "Aprobado" automatico

**Clientes (`/contador/clientes`):**
- CRUD de clientes
- Misma logica de umbral que proveedores

**Cuentas Contables (`/contador/cuentas-contables`):**
- CRUD del catalogo de cuentas

**Balances (`/contador/balances`):**
- Boton "Generar Balance" → `balance_generado = TRUE`, notifica a Gerente
- Tablas: Estado de Resultados (ingresos/gastos), Balance General (activo/pasivo/patrimonio), Ejecucion Presupuestaria (por area y categoria)
- Boton "Cerrar Periodo" → solo si `balance_generado = TRUE` y `balance_aprobado = TRUE`

---

### 2.4 TESORERO

**Login:** `tesorero@empresa.com` / `password123`

**Menu Sidebar:**
- Dashboard → `/tesorero/dashboard`
- Pagos → `/tesorero/pagos`
- Cobros → `/tesorero/cobros`
- Cuentas Bancarias → `/tesorero/cuentas-bancarias`

**Dashboard (`/tesorero/dashboard`):**
- KPI Cards: Saldo total bancos, Pagos del mes, Cobros del mes, Pagos pendientes
- Tabla "Cuentas Bancarias" con saldos en tiempo real
- Tabla "Ultimos 20 Pagos"
- Botones de exportacion CSV y PDF

**Pagos (`/tesorero/pagos`):**
- Lista de solicitudes en estado "Aprobada"
- Formulario: seleccionar cuenta bancaria, metodo (Transferencia/Cheque/Efectivo), numero de operacion
- Boton "Ejecutar Pago" → descuenta saldo bancario, solicitud → "Ejecutada", factura → "Pagada"
- Notifica a Gerente y al Contador que creo la solicitud

**Cobros (`/tesorero/cobros`):**
- Lista de facturas de Venta en estado "Pendiente"
- Formulario: seleccionar cuenta bancaria
- Boton "Registrar Cobro" → acredita saldo bancario, factura → "Cobrada"
- Notifica a Gerente y Contador

**Cuentas Bancarias (`/tesorero/cuentas-bancarias`):**
- CRUD de cuentas bancarias y cajas

---

### 2.5 AUDITOR

**Login:** `auditor@empresa.com` / `password123`

**Menu Sidebar:**
- Dashboard → `/auditor/dashboard`
- Auditoria → `/auditor/auditoria`
- Informe → `/auditor/informe`

**Dashboard (`/auditor/dashboard`):**
- KPI Cards: Observaciones activas, Cerradas, Modulos auditados
- Tabla "Observaciones por Estado"
- Tabla "Observaciones por Modulo"
- Tabla "Alertas de Cumplimiento" (pagos sin factura, presupuestos vencidos, etc.)
- Botones de exportacion CSV y PDF

**Auditoria (`/auditor/auditoria`):**
- Boton "Nueva Observacion" → formulario: modulo afectado, referencia ID, motivo
- Estado inicial: "Abierta" → notifica a Gerente
- Lista de observaciones
- Boton "Cerrar" (solo si estado = "En revision") → "Cerrada"

**Informe (`/auditor/informe`):**
- Genera reporte de auditoria consolidado

---

## 3. Narrativa del Flujo Completo (8 Flujos)

### Flujo 1: Administrador crea usuarios y configura sistema

```
Rol: Administrador
1. Login: admin@empresa.com / password123
2. Sidebar → "Usuarios" → /admin/usuarios
3. Click "Crear" → formulario: nombre, correo, rol
4. POST /api/usuarios → INSERT en usuarios
   (password_hash automatico, debe_cambiar_password = TRUE)
   Se notifica al nuevo usuario con contrasena temporal
5. Sidebar → "Configuracion" → /admin/configuracion
6. Editar parametros: umbral_aprobacion_proveedores (50000),
   limite_aprobacion_automatica_pagos (2000.00)
```

---

### Flujo 2: Contador da de alta un proveedor/cliente

**Camino A — Monto bajo (auto-aprobado):**

```
Rol: Contador
1. Sidebar → "Proveedores" → /contador/proveedores
2. Click "Nuevo Proveedor" → monto_contrato = $1000
3. POST /api/proveedores → umbral (50000) > 1000 → estado = "Aprobado"
   Sin notificacion, listo para usar
```

**Camino B — Monto alto (requiere aprobacion):**

```
Rol: Contador
1. Click "Nuevo Proveedor" → monto_contrato = $60000
2. POST /api/proveedores → 60000 > 50000 → estado = "Pendiente"
   → notificarRol(2): "Nuevo proveedor '...' registrado, pendiente de aprobacion"

Rol: Gerente Financiero
3. Sidebar → "Proveedores/Clientes" → /gerente/proveedores
4. Ve proveedor con badge "Pendiente"
5. Click "Aprobar" → POST /api/proveedores/[id]/aprobar
   → Estado: Pendiente → Aprobado
   → Notifica al Contador que lo registro
6. (Alternativa: "Rechazar" + motivo → Pendiente → Rechazado → Notifica al Contador)
```

---

### Flujo 3: Contador arma presupuesto y Gerente lo aprueba

```
Rol: Contador
1. Sidebar → "Presupuestos" → /contador/presupuestos
2. Click "Nuevo Presupuesto" → area + periodo + partidas
3. POST /api/presupuestos → estado = "Borrador"
4. Click "Enviar a Aprobacion" → estado: Borrador → Pendiente
   → notificarRol(2): "Presupuesto #[id] enviado a aprobacion"

Rol: Gerente Financiero
5. Sidebar → "Presupuestos" → /gerente/presupuestos
6. Click "Aprobar" → validacion: no auto-aprobarse
   → Pendiente → Aprobado, actualiza monto_total_aprobado
   → Notifica al Contador
7. (Alternativa: "Rechazar" + motivo → Pendiente → Rechazado
   → Contador puede corregir y reenviar)
```

---

### Flujo 4: Contador registra factura

```
Rol: Contador
1. Sidebar → "Facturacion" → /contador/facturacion
2. Click "Nueva Factura":
   - Compra: requiere proveedor aprobado, opcional partida
   - Venta: requiere cliente
3. POST /api/facturas → validaciones:
   - Periodo de fecha_emision abierto
   - Numero de factura unico
   - Proveedor/cliente existe y aprobado
   → Estado: "Pendiente"
```

---

### Flujo 5: Solicitud de pago

**Camino A — Monto bajo (auto-aprobada, <= $2000):**

```
Rol: Contador
1. Desde factura Compra en "Pendiente", click "Solicitar Pago"
2. POST /api/solicitudes-pago → monto <= umbral
   → Estado: Aprobada (Automatica)
   → monto_ejecutado en partida += monto
   → Factura: Pendiente → Solicitada
   → notificarRol(4): "Solicitud auto-aprobada, lista para ejecucion"

Rol: Tesorero
3. Recibe notificacion → puede ejecutar pago (Flujo 6)
```

**Camino B — Monto alto (> $2000):**

```
Rol: Contador
1. Solicitar pago por $5000
2. POST /api/solicitudes-pago → monto > umbral
   → Estado: Pendiente (Manual)
   → notificarRol(2): "Requiere aprobacion"

Rol: Gerente Financiero
3. Sidebar → "Pagos" → /gerente/pagos
4. Click "Aprobar" → verifica periodo abierto + saldo presupuestario
   → Pendiente → Aprobada
   → monto_ejecutado en partida += monto
   → Notifica al Contador + Tesorero
5. (Alternativa: "Rechazar" + motivo → Pendiente → Rechazado)
```

---

### Flujo 6: Tesorero ejecuta pago y registra cobro

**Ejecutar pago:**

```
Rol: Tesorero
1. Sidebar → "Pagos" → /tesorero/pagos
2. Click "Ejecutar Pago" → cuenta bancaria + metodo + operacion
3. POST /api/pagos → validaciones:
   - Cuenta activa, saldo suficiente
   - Periodo abierto
   → Transaccion atomica:
     a. INSERT en pagos
     b. UPDATE cuentas_bancarias saldo_actual -= monto
     c. UPDATE solicitudes_pago SET estado = "Ejecutada"
     d. UPDATE facturas SET estado = "Pagada"
   → Notifica a Gerente + Contador
```

**Registrar cobro:**

```
Rol: Tesorero
1. Sidebar → "Cobros" → /tesorero/cobros
2. Click "Nuevo Cobro" → factura Venta en "Pendiente"
3. POST /api/cobros → validaciones:
   - Factura tipo Venta, estado Pendiente
   - Periodo abierto
   → Transaccion atomica:
     a. INSERT en cobros
     b. UPDATE cuentas_bancarias saldo_actual += monto
     c. UPDATE facturas SET estado = "Cobrada"
   → Notifica a Gerente + Contador
```

---

### Flujo 7: Balance y cierre de periodo

```
Rol: Contador
1. Sidebar → "Balances" → /contador/balances
2. Seleccionar periodo, click "Generar Balance"
   → balance_generado = TRUE, notifica a Gerente

Rol: Gerente Financiero
3. Sidebar → "Balances" → /gerente/balances
4. Click "Aprobar Balance" → balance_aprobado = TRUE
5. (Alternativa: "Rechazar" → resetea flags, Contador regenera)

Rol: Contador
6. Solo si balance_generado Y balance_aprobado → click "Cerrar Periodo"
   → Estado: Abierto → Cerrado, notifica a Gerente

Rol: Gerente Financiero (reapertura)
7. Click "Reabrir" + motivo → Cerrado → Abierto, notifica a Contador
```

---

### Flujo 8: Auditoria

**Crear observacion:**

```
Rol: Auditor
1. Sidebar → "Auditoria" → /auditor/auditoria
2. Click "Nueva Observacion" → modulo + motivo
3. POST /api/auditor/observaciones → estado = "Abierta"
   → notificarRol(2): siempre al Gerente
   → Si modulo=usuarios: tambien al Admin
```

**Responder:**

```
Rol: Gerente Financiero
4. Sidebar → "Auditoria" → /gerente/auditoria
5. Click "Responder" → escribe respuesta
   → Estado: Abierta → "En revision"
```

**Cerrar:**

```
Rol: Auditor
6. Click "Cerrar" → Estado: "Cerrada", fecha_cierre = NOW()
```

---

## 4. Preparacion para Exponer

### 4.1 Checklist Tecnico

**Datos de prueba disponibles:**

| Dato | Estado |
|------|--------|
| 5 usuarios (uno por rol, password123) | Listos |
| 1 presupuesto aprobado ($50,000) | Listo |
| 2 facturas (1 compra $1500, 1 venta $3000) | Listas |
| 1 solicitud de pago ejecutada ($1500) | Lista |
| 1 pago ejecutado ($1500, Transferencia) | Listo |
| 1 cobro registrado ($3000) | Listo |
| 12 observaciones de auditoria | Listas |
| 2 cuentas bancarias (Banco $100K, Caja $8K) | Listas |
| 3 periodos fiscales (2026, 2027, 2028) | Todos Abiertos |
| 4 configuraciones del sistema | Listas |

**Flujos demostrables:**

| Flujo | Demostrable | Notas |
|-------|:-----------:|-------|
| Crear usuario + config | Si | Admin crea y configura |
| Proveedor/Cliente con umbral | Si | Crear con monto bajo (auto) o alto (aprobacion) |
| Presupuesto Borrador→Pendiente→Aprobado | Si | Contador crea, envia; Gerente aprueba |
| Factura compra/venta | Si | Contador crea |
| Solicitud pago baja (auto) | Si | Monto <= 2000 |
| Solicitud pago alta (manual) | Si | Monto > 2000 → Gerente aprueba |
| Ejecutar pago | Si | Tesorero ejecuta |
| Registrar cobro | Si | Tesorero registra |
| Balance→Aprobacion→Cierre | Parcial | Balance y aprobacion funcionan. Cierre disponible |
| Auditoria crear/responder/cerrar | Si | Ciclo completo |

### 4.2 Checklist de Seguridad

| Aspecto | Respuesta |
|---------|-----------|
| Queries parametrizadas | Si, 100% con $1, $2 |
| Sesion expira | Si, cookie 24h con exp en payload |
| Manipulacion de cookie | HMAC-SHA256 + timingSafeEqual |
| Contrasenas | scrypt con salt de 16 bytes, formato salt:derivedKey |
| Backend bloquea sin frontend | Si, verificarPermiso() en cada endpoint |
| Self-approval prevenido | Si, en presupuestos |
| Periodo cerrado bloquea | Si, verificarPeriodoAbiertoPorFecha() |
| Audit trail | Si, historial_accesos con IP y resultado |
| CSRF | Solo SameSite=Lax |
| Rate limiting | No disponible |
| Regeneracion sesion post-password | No implementada |

### 4.3 Higiene para Presentacion

1. **Usar BD de prueba:** El `.env.local` apunta a BD local con datos de seed
2. **NO mostrar .env.local en pantalla:** Contiene `COOKIE_SECRET` y password de PostgreSQL
3. **Re-ejecutar seed antes de la demo** si hay datos de tests: `npx tsx scripts/migrate.ts`

### 4.4 Guion Sugerido de Demo (5-8 min)

**Caso: Compra de suministros por $15,000**

| Tiempo | Rol | Accion |
|--------|-----|--------|
| 0:00-0:30 | — | Contexto: "Sistema con 5 roles, PostgreSQL, Next.js 16" |
| 0:30-1:00 | Admin | Crear usuario + mostrar config (umbrales) |
| 1:00-1:30 | Contador | Crear proveedor con monto alto → Pendiente |
| 1:30-2:00 | Contador | Crear presupuesto → enviar a aprobacion |
| 2:00-2:30 | Gerente | Aprobar proveedor + presupuesto |
| 2:30-3:00 | Contador | Crear factura + solicitud de pago (monto alto) |
| 3:00-3:30 | Gerente | Aprobar pago |
| 3:30-4:00 | Tesorero | Ejecutar pago |
| 4:00-4:30 | Contador | Generar balance |
| 4:30-5:00 | — | Cierre: "Segregacion de funciones, backend verifica permisos" |

### 4.5 Preguntas Tipicas y Respuestas

**P1: Por que SQL crudo y no un ORM?**
El dominio financiero requiere consultas complejas con agregaciones y transacciones. Un ORM anade abstraccion que complica el control fino. `pg` con `withTransaction()` da control explicito sobre cada operacion.

**P2: Por que autenticacion propia y no NextAuth.js?**
Necesitabamos control total sobre el payload de la cookie (incluir `id_rol`, `nombre_rol`). HMAC-SHA256 cumple OWASP y es mantenible para 5 roles sin OAuth.

**P3: Como se garantiza segregacion de funciones?**
Tres capas: (1) RBAC en backend — cada endpoint verifica permisos, no confia en frontend. (2) Self-approval prevention. (3) Transacciones atomicas.

**P4: Que pasa si dos personas aprueban al mismo tiempo?**
PostgreSQL maneja concurrencia. La segunda transaccion vera que el estado ya cambio. No hay `FOR UPDATE` explicito — mejora identificada.

**P5: Como escala a mas roles/modulos?**
La matriz RBAC es un objeto TypeScript — agregar rol = anadir clave, agregar modulo = anadir entrada. No requiere cambios en logica de autorizacion.

**P6: Que pasa si un Contador llama directo al endpoint de aprobacion?**
Recibe 403. `verificarPermiso(request, "presupuestos", "aprobar")` solo lo tiene Gerente Financiero.

**P7: Hay logging de quien hizo que?**
`historial_accesos` registra logins. Tablas criticas registran `id_usuario_elabora`, `id_usuario_aprueba`, `id_usuario_ejecuta`.

**P8: Como se manejan los montos decimales?**
`NUMERIC(14,2)` en PostgreSQL (precision exacta). En JS se manejan como strings desde BD y se convierten a Number solo para UI.

### 4.6 Mejoras Rapidas Antes de Exponer

| # | Mejora | Impacto |
|---|--------|---------|
| 1 | nombre_rol y nombre_completo en login response | Ya corregido |
| 2 | Auditoria PATCH: cambiar "leer" → "modificar" | Bug critico |
| 3 | No resetear balances al cerrar periodo | Bug |
| 4 | Actualizar monto_ejecutado en auto-aprobacion | Bug |
| 5 | Agregar pantalla de periodos al sidebar de admin | UX faltante |

---

*Documento generado a partir del codigo fuente, esquema de base de datos y datos de seed del repositorio.*
