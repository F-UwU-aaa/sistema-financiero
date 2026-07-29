# Guion de Demo Interactivo — 5 Roles

## Sistema de Gestión Financiera y Presupuestaria

---

## Accesos (usuarios semilla)

| Rol | Correo electrónico | Contraseña |
|-----|-------------------|------------|
| Administrador del Sistema | `admin@empresa.com` | `password123` |
| Gerente Financiero | `gerente@empresa.com` | `password123` |
| Contador | `contador@empresa.com` | `password123` |
| Tesorero | `tesorero@empresa.com` | `password123` |
| Auditor | `auditor@empresa.com` | `password123` |

---

## Resumen del escenario

Se simula el ciclo completo de dos operaciones comerciales paralelas sobre un mismo presupuesto del área **Tecnología** durante el período fiscal **2026**:

1. **Compra (egreso):** La empresa contrata a un proveedor externo ("Insumos Andinos SRL") por $60.000. Como el monto supera el umbral de $50.000, el Gerente Financiero debe aprobarlo manualmente. Luego se registra una factura de compra por $2.000, se solicita el pago (autoaprobado por estar bajo el límite de $2.000), y el Tesorero ejecuta la transferencia bancaria.

2. **Venta (ingreso):** Un cliente ("Distribuidora Andina S.A.") firma un contrato por $15.000. Al estar por debajo del umbral de $50.000, se autoaprueba sin intervención del Gerente. Se registra una factura de venta y el Tesorero registra el cobro.

Ambas operaciones impactan el mismo balance del período, que pasa por generación (Contador), aprobación (Gerente) y cierre del período. Finalmente, el Auditor crea una observación sobre alguno de estos movimientos, el Gerente responde y el Auditor la cierra.

---

## Guion paso a paso

---

### Paso 1 — Administrador · Verificar configuración del sistema

**Ruta:** Sidebar → "Configuración" → `/admin/configuracion`

**Qué hacer:**

1. Ir a la solapa **"Períodos Fiscales"**
2. Verificar que los tres períodos (2026, 2027, 2028) estén en estado **Abierto**
3. Ir a la solapa **"Sistema"**
4. Verificar los valores:
   - `limite_aprobacion_automatica_pagos` = `2000.00`
   - `umbral_aprobacion_proveedores` = `50000.00`

**Qué pasa en el sistema:** No se modifica nada — es una verificación visual de que la configuración está en los valores esperados para la demo.

**En la vida real esto significa:** El Administrador se asegura de que los umbrales de negocio (qué montos requieren aprobación manual del Gerente) están correctamente definidos antes de iniciar las operaciones del período.

**Qué ven los otros roles después de esto:** Nada — la verificación es transparente para el resto.

---

### Paso 2 — Contador · Crear proveedor "Insumos Andinos SRL"

**Ruta:** Sidebar → "Proveedores" → `/contador/proveedores`

**Contexto de negocio:** Un **proveedor** es una empresa externa que le *vende* insumos o servicios a *nuestra* empresa. Nosotros somos *su* cliente. Por eso, todo lo que registremos con este proveedor generará **facturas de COMPRA** y representará un **EGRESO** (nosotros les pagamos a ellos). El sistema no administra el negocio del proveedor — solo registra el contrato, la factura de compra y el pago desde nuestro lado.

**Qué hacer:**

1. Click en el botón **"+ Nuevo proveedor"**
2. Completar el formulario:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Razón social * | texto | `Insumos Andinos SRL` | Nombre legal del proveedor |
| NIT * | texto | `1234567890123` | Número de identificación tributaria (ya existe un proveedor con este NIT en seed, pero en la demo se ingresa uno de prueba; se puede usar cualquier número de 13 dígitos) |
| Contacto | texto | `contacto@insumosandinos.com` | Correo del contacto comercial |
| Monto contrato | número | `60000` | Monto del contrato comercial. **$60.000 ≥ $50.000** (umbral configurado), por lo que el proveedor quedará **Pendiente** de aprobación del Gerente |
| Condiciones de pago | área de texto | `45 días` | Plazo acordado |
| Datos cuenta de pago | texto | `Banco Andino Cta. Cte. 1234-5` | Cuenta bancaria del proveedor para transferencias |

3. Click en el botón **"Guardar"**

**Qué pasa en el sistema:** El sistema consulta la configuración `umbral_aprobacion_proveedores = 50000`. Como el monto del contrato ($60.000) es **mayor o igual** al umbral, el proveedor se crea con estado **"Pendiente"**. Se genera una notificación al Gerente Financiero (tipo `proveedor_pendiente`).

**En la vida real esto significa:** Se registra un nuevo proveedor en el sistema, pero las operaciones de compra contra él todavía no pueden completarse hasta que el Gerente Financiero lo apruebe.

**Qué ven los otros roles después de esto:** El Gerente Financiero, al entrar al sidebar, verá una notificación. Y en `/gerente/proveedores` (solapa "Proveedores") verá a "Insumos Andinos SRL" con badge "Pendiente" y los botones **"Aprobar"** / **"Rechazar"**.

---

### Paso 3 — Contador · Crear cliente "Distribuidora Andina S.A."

**Ruta:** Sidebar → "Clientes" → `/contador/clientes`

**Contexto de negocio:** Un **cliente** es una empresa externa a la que *nuestra* empresa le *vende* productos o servicios. Por eso, todo lo que registremos con este cliente generará **facturas de VENTA** y representará un **INGRESO** (ellos nos pagan a nosotros). El sistema no administra el negocio del cliente — solo registra el contrato, la factura de venta y el cobro desde nuestro lado.

**Qué hacer:**

1. Click en el botón **"+ Nuevo cliente"**
2. Completar el formulario:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Razón social * | texto | `Distribuidora Andina S.A.` | Nombre legal del cliente |
| NIT | texto | `9876543210987` | NIT (ya existe un cliente con este NIT en seed; se puede usar cualquier número de 13 dígitos para la demo) |
| Contacto | texto | `contacto@distribuidoraandina.com` | Correo del contacto |
| Monto relación comercial | número | `15000` | Monto estimado de la relación. **$15.000 < $50.000** (umbral), por lo que el cliente se **autoaprueba** directamente |
| Datos de facturación | área de texto | `Factura electrónica, atención al departamento de compras` | Instrucciones para emitir facturas |

3. Click en el botón **"Guardar"**

**Qué pasa en el sistema:** El sistema consulta el mismo umbral (`umbral_aprobacion_proveedores = 50000`). Como $15.000 < $50.000, el cliente se crea directamente con estado **"Aprobado"** (no necesita aprobación manual del Gerente).

**En la vida real esto significa:** Clientes con montos de relación bajos se consideran de bajo riesgo y se aprueban automáticamente, acelerando el proceso comercial.

**Qué ven los otros roles después de esto:** El Contador ve al cliente con badge "Aprobado" en la misma tabla. El Gerente no recibe notificación ni tiene que hacer nada. El cliente ya está listo para operar.

---

### Paso 4 — Gerente Financiero · Aprobar proveedor "Insumos Andinos SRL"

**Ruta:** Sidebar → "Proveedores/Clientes" → `/gerente/proveedores`

**Contexto de negocio:** Recordatorio — "Insumos Andinos SRL" es un **proveedor**. Le compraremos insumos a ellos. Es un **egreso** futuro para nuestra empresa. El Gerente debe evaluar el riesgo crediticio y operativo antes de habilitarlo.

**Qué hacer:**

1. En la solapa **"Proveedores"**, ubicar a "Insumos Andinos SRL" en la tabla (estado "Pendiente", badge amarillo)
2. Hacer click en el botón **"Aprobar"** en la fila correspondiente

**Qué pasa en el sistema:** El proveedor cambia de estado "Pendiente" a **"Aprobado"**. Ya puede asociarse a facturas de compra y solicitudes de pago. No se envía notificación al Contador (el Contador puede ver el cambio al recargar la tabla de proveedores).

**En la vida real esto significa:** El Gerente Financiero da el visto bueno para operar con este proveedor, validando que cumple con las políticas de la empresa.

**Qué ven los otros roles después de esto:** El Contador, al entrar a `/contador/proveedores`, ahora ve a "Insumos Andinos SRL" con badge "Aprobado" y ya puede crear facturas de compra contra él. También aparece en el dropdown "Proveedor" del formulario de Nueva factura en `/contador/facturacion`.

---

### Paso 5 — Contador · Crear presupuesto y enviar a aprobación

**Ruta:** Sidebar → "Presupuestos" → `/contador/presupuestos`

**Qué hacer:**

1. Click en el botón **"+ Nueva propuesta"**
2. Completar el formulario:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Área | select | `Tecnología` | El área que ejecutará este presupuesto |
| Período | select | `2026` | Período fiscal al que aplica |
| Categoría | select | `Suministros de oficina (Egreso)` | Tipo de gasto (única categoría de Egreso disponible, la que usaremos para la factura de compra) |
| Monto | número | `20000` | Monto asignado a la partida |

3. Click en el botón **"Agregar"** para añadir la partida a la lista
4. Verificar que en la lista de partidas aparece "Suministros de oficina (Egreso)" con monto $20.000 y el balance total es $20.000 (egreso puro)
5. Click en el botón **"Enviar a aprobación"**

**Qué pasa en el sistema:** Se crea el presupuesto con estado **"Pendiente"** (ya no se queda en Borrador como antes del fix — el POST ahora respeta el flag `enviar`). Se envía notificación al Gerente Financiero (tipo `presupuesto_pendiente`).

**En la vida real esto significa:** El Contador prepara la propuesta de presupuesto del área y la eleva al Gerente Financiero para su revisión y aprobación. Hasta que no esté aprobado, no se puede gastar contra ese presupuesto.

**Qué ven los otros roles después de esto:** El Gerente Financiero recibe una notificación y, al entrar a `/gerente/presupuestos`, ve una nueva fila "Tecnología / 2026" con estado "Pendiente" y el botón **"Ver detalle"**.

---

### Paso 6 — Gerente Financiero · Aprobar presupuesto de Tecnología

**Ruta:** Sidebar → "Presupuestos" → `/gerente/presupuestos`

**Qué hacer:**

1. Ubicar la fila "Tecnología / 2026" con estado "Pendiente"
2. Click en el botón **"Ver detalle"**
3. En el modal, revisar la tabla de partidas: "Suministros de oficina — Propuesto: $20.000"
4. Click en el botón **"Aprobar"**

**Qué pasa en el sistema:** El presupuesto cambia de "Pendiente" a **"Aprobado"**. Queda habilitado para asociar facturas de compra a su partida. Se actualiza `monto_total_aprobado` con el monto propuesto.

**En la vida real esto significa:** El Gerente Financiero autoriza el presupuesto del área Tecnología para el período 2026. A partir de este momento, el Contador puede crear facturas de compra contra las partidas de este presupuesto.

**Qué ven los otros roles después de esto:** El Contador, al recargar `/contador/presupuestos`, ve el badge "Aprobado" en la fila de Tecnología 2026. Además, las partidas de este presupuesto aparecerán ahora en el dropdown "Partida presupuestaria" del formulario de Nueva factura (solo se muestran partidas de presupuestos Aprobados).

---

### Paso 7 — Contador · Crear factura de Venta a "Distribuidora Andina S.A."

**Ruta:** Sidebar → "Facturación" → `/contador/facturacion`

**Contexto de negocio:** "Distribuidora Andina S.A." es nuestro **cliente** (Paso 3). Le *vendemos* un servicio. Esto genera un **INGRESO** de $15.000 para nuestra empresa. Ellos nos pagan a nosotros. Por ser una venta, NO se asocia a ninguna partida presupuestaria (el presupuesto es solo para gastos/egresos).

**Qué hacer:**

1. Click en el botón **"+ Nueva factura"**
2. Completar el formulario:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Tipo | select | `Venta (cliente)` | Determina que es un ingreso |
| Cliente | select | `Distribuidora Andina S.A.` | El cliente que nos compra |
| Número de factura | texto | `FV-002` | Número único de factura de venta (FV-001 ya existe en seed) |
| Monto | número | `15000` | Valor de la venta |
| Fecha emisión | fecha | `2026-03-01` | Fecha dentro del período 2026 (validado contra período abierto) |
| Fecha vencimiento (opcional) | fecha | `2026-04-01` | Fecha límite de pago |

3. Click en el botón **"Registrar factura"**

**Qué pasa en el sistema:** La factura se crea con estado **"Pendiente"** y tipo "Venta". Queda visible en la tabla de facturación. Como es tipo Venta, NO aparece el botón "Solicitar pago" (solicitar pago es solo para facturas de Compra). El cobro lo registrará el Tesorero más adelante.

**En la vida real esto significa:** Se emite una factura a un cliente por un servicio prestado. La factura queda pendiente de cobro.

**Qué ven los otros roles después de esto:** El Tesorero, al entrar a `/tesorero/cobros`, ve esta factura en la sección "Facturas de Venta pendientes" con monto $15.000 y el botón **"Registrar cobro"**.

---

### Paso 8 — Contador · Crear factura de Compra a "Insumos Andinos SRL"

**Ruta:** Sidebar → "Facturación" → `/contador/facturacion`

**Contexto de negocio:** "Insumos Andinos SRL" es nuestro **proveedor** (Pasos 2 y 4). Le *compramos* insumos a ellos. Esto genera un **EGRESO** de $2.000. Nosotros les pagamos a ellos. Esta factura SÍ se asocia a la partida presupuestaria "Suministros de oficina" del presupuesto de Tecnología 2026, porque es un gasto que debe imputarse a ese presupuesto.

**Qué hacer:**

1. Click en el botón **"+ Nueva factura"**
2. Completar el formulario:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Tipo | select | `Compra (proveedor)` | Determina que es un egreso |
| Proveedor | select | `Insumos Andinos SRL` | El proveedor registrado y aprobado |
| Número de factura | texto | `FAC-002` | Número único (FAC-001 ya existe en seed) |
| Monto | número | `2000` | Monto de la compra. **$2.000 ≤ $2.000** (umbral de autoaprobación de pagos), por lo que la futura solicitud de pago se autoaprobará |
| Fecha emisión | fecha | `2026-03-15` | Fecha dentro del período |
| Fecha vencimiento (opcional) | fecha | `2026-04-15` | — |
| Partida presupuestaria (opcional) | select | `Suministros de oficina (Tecnología - 2026) — Saldo: $20,000` | **NO** elegir "Sin partida". Esta es la partida del presupuesto aprobado contra la que se imputará el gasto. El saldo disponible muestra $20.000 porque aún no se ha ejecutado ningún gasto. |

3. Click en el botón **"Registrar factura"**

**Qué pasa en el sistema:** La factura se crea con estado **"Pendiente"** y tipo "Compra", vinculada a la partida `id_partida` del presupuesto de Tecnología 2026. Aparece en la tabla de facturación con el badge "Pendiente" y, como es tipo Compra, tiene disponible el botón **"Solicitar pago"**.

**En la vida real esto significa:** Se registra una factura recibida de un proveedor por una compra realizada. La factura queda pendiente de pago y el gasto queda imputado al presupuesto correspondiente.

**Qué ven los otros roles después de esto:** En la tabla de facturación del Contador, la fila FAC-002 aparece con badge "Pendiente" y el botón **"Solicitar pago"** en la columna Acciones. El Gerente y Tesorero aún no ven nada porque la factura está pendiente de solicitar el pago.

---

### Paso 9 — Contador · Solicitar pago de FAC-002 (autoaprobado)

**Ruta:** Sidebar → "Facturación" → `/contador/facturacion`

**Contexto de negocio:** Ahora que tenemos la factura de compra de "Insumos Andinos SRL" registrada, necesitamos iniciar el proceso de pago. Como el monto ($2.000) está en el límite de autoaprobación configurado, el sistema lo aprobará automáticamente sin pasar por el Gerente.

**Qué hacer:**

1. En la tabla de facturas, ubicar la fila de FAC-002 (estado "Pendiente", tipo "Compra")
2. Click en el botón **"Solicitar pago"**
3. Confirmar en el diálogo del navegador: click en **"Aceptar"**

**Qué pasa en el sistema:** El sistema llama a `POST /api/solicitudes-pago` con `id_factura`. Verifica:
   - La factura existe y es de tipo Compra ✅
   - La factura está en estado "Pendiente" ✅
   - Tiene partida presupuestaria asociada ✅
   - Saldo suficiente en la partida ($20.000 disponibles ≥ $2.000 solicitados) ✅
   - Período abierto ✅
   - **$2.000 ≤ $2.000** (umbral de autoaprobación) → **Autoaprobado**

   La solicitud se crea con estado **"Aprobada"** y tipo **"Automática"**. La factura cambia de "Pendiente" a **"Solicitada"**. El `monto_ejecutado` de la partida presupuestaria se incrementa en $2.000 (ahora $20.000 asignados, $2.000 ejecutados, $18.000 disponibles). Se notifica al Tesorero (rol 4) que hay una solicitud lista para ejecutar.

**En la vida real esto significa:** El Contador inicia el proceso de pago. Como el monto no supera el límite de aprobación automática, el sistema aprueba el pago sin intervención del Gerente. El Tesorero recibe la instrucción de pagar.

**Qué ven los otros roles después de esto:**
- La factura FAC-002 ahora tiene badge **"Solicitada"**
- Se muestra un Alert verde con el mensaje del sistema
- El Tesorero recibe notificación y, al entrar a `/tesorero/pagos`, ve la solicitud en la "Cola de Pagos" con badge "Aprobada", tipo "Automática", y el botón **"Ejecutar"**

---

### Paso 10 — Tesorero · Ejecutar pago a "Insumos Andinos SRL"

**Ruta:** Sidebar → "Pagos" → `/tesorero/pagos`

**Contexto de negocio:** Recordatorio — "Insumos Andinos SRL" es un proveedor. Le estamos pagando una factura de compra. Es un **EGRESO** de nuestra cuenta bancaria. El Tesorero ejecuta la transferencia bancaria desde el sistema de la empresa.

**Qué hacer:**

1. En la "Cola de Pagos", ubicar la solicitud de pago de FAC-002 (monto $2.000, aprobación "Automática")
2. Click en el botón **"Ejecutar"**
3. Completar el formulario del modal:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Cuenta de origen | select | `Banco Nacional - Cta. Corriente (Saldo: $100,000.00)` | Cuenta bancaria desde la que saldrá el dinero |
| Método de pago | select | `Transferencia` | Medio de pago |
| Nº de operación / comprobante | texto | `TRF-002` | Número de operación bancaria real (TRF-001 ya existe en seed) |

4. Click en el botón **"Ejecutar pago"**

**Qué pasa en el sistema:** El sistema:
   - Descuenta $2.000 del saldo de la cuenta bancaria: $100.000 → **$98.000**
   - Cambia la solicitud de pago de "Aprobada" a **"Ejecutada"**
   - Cambia la factura FAC-002 de "Solicitada" a **"Pagada"**
   - Notifica al Gerente Financiero y al Contador (tipo `pago_ejecutado`)

**En la vida real esto significa:** El Tesorero transfiere el dinero desde la cuenta bancaria de la empresa a la cuenta del proveedor. El pago queda registrado en el sistema.

**Qué ven los otros roles después de esto:**
- El Contador, en `/contador/facturacion`, ve la factura FAC-002 con badge **"Pagada"**. Ya no tiene botones de acción disponibles.
- En el dashboard del Gerente (`/gerente/dashboard`), la tarjeta "Gastos" se actualiza y el área Tecnología en "Ejecución Presupuestaria" muestra $2.000 ejecutados.
- La factura FAC-002 desaparece de la "Cola de Pagos" del Tesorero (ya no está en estado "Aprobada").

---

### Paso 11 — Tesorero · Registrar cobro de "Distribuidora Andina S.A."

**Ruta:** Sidebar → "Cobros" → `/tesorero/cobros`

**Contexto de negocio:** Recordatorio — "Distribuidora Andina S.A." es nuestro cliente. Nos está pagando una factura de venta. Es un **INGRESO** a nuestra cuenta bancaria.

**Qué hacer:**

1. En la sección "Facturas de Venta pendientes", ubicar la fila de FV-002 ($15.000)
2. Click en el botón **"Registrar cobro"**
3. Completar el formulario del modal:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Cuenta destino | select | `Banco Nacional - Cta. Corriente` | Cuenta bancaria donde se acreditará el dinero |
| Monto a cobrar | número | `15000` | Monto de la factura (se puede cobrar parcial o total) |

4. Click en el botón **"Registrar cobro"**

**Qué pasa en el sistema:** El sistema:
   - Acredita $15.000 al saldo de la cuenta bancaria: $98.000 → **$113.000**
   - Cambia la factura FV-002 de "Pendiente" a **"Cobrada"**
   - Notifica al Gerente Financiero y al Contador (tipo `cobro_registrado`)

**En la vida real esto significa:** El Tesorero registra la recepción de la transferencia del cliente. El dinero ingresa a la cuenta bancaria de la empresa.

**Qué ven los otros roles después de esto:**
- El Contador, en `/contador/facturacion`, ve la factura FV-002 con badge **"Cobrada"**.
- En el dashboard del Gerente (`/gerente/dashboard`), la tarjeta "Ingresos" se actualiza para reflejar los $15.000 cobrados.
- La factura FV-002 desaparece de "Facturas de Venta pendientes" del Tesorero y aparece en "Historial de cobros".

---

### Paso 12 — Contador · Generar balances del período 2026

**Ruta:** Sidebar → "Balances" → `/contador/balances`

**Qué hacer:**

1. En el selector "Período fiscal", seleccionar **`2026`**
2. Click en el botón **"Generar balances"** (mientras carga, el botón muestra "Calculando...")
3. Una vez generados, se muestran tres tablas:

   **Estado de Resultados:**
   | Concepto | Monto |
   |---|---|
   | Ingresos por Ventas | $15,000.00 |
   | Gastos de Suministros | -$2,000.00 |
   | **Resultado Neto** | **$13,000.00** |

   *(El sistema también incluye los datos del seed: FAC-001 por $1.500 y FV-001 por $3.000, que se suman a estos totales.)*

   **Balance General:**
   | Rubro | Detalle | Monto |
   |---|---|---|
   | Activo | Bancos | $113,000.00 |
   | Pasivo | — | $0.00 |
   | Patrimonio | Resultado del ejercicio | $13,000.00 |

   **Ejecución Presupuestaria:**
   | Área | Aprobado | Ejecutado | % |
   |---|---|---|---|
   | Tecnología | $20,000.00 | $2,000.00 | 10.0% |

**Qué pasa en el sistema:** El sistema consulta los movimientos registrados (facturas, pagos, cobros, partidas ejecutadas) en el período 2026 y genera los estados financieros. Los datos del seed (FAC-001, FV-001, pagos y cobros seed) se suman a los de la demo, por lo que los totales incluyen ambos. Los balances aún no están "generados" ni "aprobados" — solo se muestran en pantalla.

**En la vida real esto significa:** El Contador prepara los estados financieros del período para su revisión y aprobación por parte del Gerente Financiero. Es el cierre contable del período.

**Qué ven los otros roles después de esto:** El Gerente Financiero, en `/gerente/balances`, ve el período 2026 con "Balance: No" (aún no marcado como generado). Ve el texto "Esperando que el Contador genere el balance..."

---

### Paso 13 — Contador · Marcar balance como generado

**Ruta:** Sidebar → "Balances" → `/contador/balances`

**Qué hacer:**

1. Con el período 2026 seleccionado y los balances visibles en pantalla
2. Click en el botón **"Marcar como generado"**

**Qué pasa en el sistema:** El campo `balance_generado` del período pasa a `true`. Ahora el Gerente Financiero puede ver y aprobar el balance.

**En la vida real esto significa:** El Contador certifica que los estados financieros están completos y correctos, y los eleva al Gerente para su aprobación formal.

**Qué ven los otros roles después de eso:** El Gerente Financiero, en `/gerente/balances`, ahora ve el período 2026 con badge "Balance: Sí" (generado) y "Aprobado: No". Aparecen los botones **"Ver balance"**, **"Aprobar balance"** y **"Rechazar"**.

---

### Paso 14 — Gerente Financiero · Aprobar balance del período 2026

**Ruta:** Sidebar → "Balances" → `/gerente/balances`

**Qué hacer:**

1. Ubicar la fila del período 2026 (debe mostrar "Balance: Sí", "Aprobado: No")
2. Click en el botón **"Ver balance"**
3. Revisar los datos del Estado de Resultados y Balance General
4. Click en el botón **"Aprobar balance"**

**Qué pasa en el sistema:** El campo `balance_aprobado` del período pasa a `true`. Aparece un Alert verde: "Balance aprobado — listo para cierre". El Contador ahora puede cerrar el período.

**En la vida real esto significa:** El Gerente Financiero da su aprobación formal a los estados financieros del período, validando que los montos son correctos.

**Qué ven los otros roles después de esto:** El Contador, al volver a `/contador/balances`, ve el botón **"Cerrar período"** disponible (solo aparece cuando `balance_aprobado` es `true`).

---

### Paso 15 — Contador · Cerrar el período 2026

**Ruta:** Sidebar → "Balances" → `/contador/balances`

**Qué hacer:**

1. Con el período 2026 seleccionado y `balance_aprobado = true`
2. Click en el botón **"Cerrar período"**
3. En el modal de confirmación, click en el botón **"Cerrar período"**

**Qué pasa en el sistema:** El estado del período fiscal 2026 cambia de **"Abierto"** a **"Cerrado"**. A partir de este momento:
   - No se pueden crear nuevas facturas con fecha de emisión en 2026
   - No se pueden crear nuevas solicitudes de pago contra facturas de 2026
   - El período queda bloqueado para todas las operaciones
   - El balance queda congelado en el estado aprobado

**En la vida real esto significa:** Se cierra formalmente el ejercicio contable. No se pueden registrar más operaciones en ese período.

**Qué ven los otros roles después de esto:** En todas las pantallas donde se filtran períodos, 2026 aparece ahora como "(Cerrado)". Cualquier intento de operación con fechas dentro de 2026 será rechazado por el backend.

---

### Paso 16 — Auditor · Crear observación sobre el pago ejecutado

**Ruta:** Sidebar → "Auditoría" → `/auditor/auditoria`

**Contexto de negocio:** El Auditor revisa los movimientos del período y decide dejar una observación sobre el pago a "Insumos Andinos SRL" para que el Gerente Financiero justifique o aclare la operación.

**Qué hacer:**

1. Click en el botón **"+ Nueva Observación"**
2. Completar el formulario:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Módulo afectado * | select | `Pagos` | El módulo donde ocurrió la operación observada |
| Tipo de transacción | select | `Transferencia` | El método de pago usado (aparece porque seleccionamos Pagos como módulo) |
| Referencia ID | número | `2` | ID de la solicitud de pago creada en la demo (la primera solicitud del seed tiene ID 1, la nuestra tiene ID 2) |
| Motivo * | área de texto | `Verificar que el comprobante bancario de la transferencia TRF-002 coincida con el registro contable del pago a Insumos Andinos SRL por $2,000.` | Descripción de la irregularidad o hallazgo |

3. Click en el botón **"Registrar"**

**Qué pasa en el sistema:** La observación se crea con estado **"Abierta"**. Aparece en la tabla de auditoría con badge rojo "Abierta".

**En la vida real esto significa:** El Auditor documenta un hallazgo o punto de control que requiere respuesta del Gerente Financiero.

**Qué ven los otros roles después de esto:** El Gerente Financiero, al entrar a `/gerente/auditoria`, ve la nueva observación con badge "Abierta" y el botón **"Ver / Responder"**.

---

### Paso 17 — Gerente Financiero · Responder la observación

**Ruta:** Sidebar → "Auditoría" → `/gerente/auditoria`

**Qué hacer:**

1. Ubicar la observación creada por el Auditor
2. Click en el botón **"Ver / Responder"**
3. En el modal, revisar el motivo de la observación
4. Completar el campo de respuesta:

| Campo (label visible) | Tipo | Valor | Para qué |
|---|---|---|---|
| Tu respuesta | área de texto | `El pago fue ejecutado correctamente. El comprobante bancario TRF-002 se encuentra archivado en la carpeta de pagos de marzo 2026.` | Justificación o respuesta del Gerente |

5. Click en el botón **"Enviar Respuesta"**

**Qué pasa en el sistema:** La observación cambia de "Abierta" a **"En revisión"**. Se registra la respuesta del Gerente en el campo `respuesta_gerente`.

**En la vida real esto significa:** El Gerente Financiero da su versión o justificación sobre el punto observado. La observación vuelve al Auditor para su cierre.

**Qué ven los otros roles después de esto:** El Auditor, al entrar a `/auditor/auditoria`, ve la observación con badge amarillo "En revisión" y la respuesta del Gerente visible. Aparece el botón **"Cerrar"**.

---

### Paso 18 — Auditor · Cerrar la observación

**Ruta:** Sidebar → "Auditoría" → `/auditor/auditoria`

**Qué hacer:**

1. Ubicar la observación ahora en estado "En revisión"
2. Click en el botón **"Ver"**
3. En el modal, leer la respuesta del Gerente
4. Click en el botón **"Cerrar"** (solo visible si estado es "En revisión")

**Qué pasa en el sistema:** La observación pasa de "En revisión" a **"Cerrada"**. Se registra la fecha de cierre. Este es el estado terminal del flujo de auditoría.

**En la vida real esto significa:** El Auditor da por concluida la revisión de ese punto, aceptando la respuesta del Gerente como satisfactoria.

**Qué ven los otros roles después de esto:** La observación aparece con badge verde "Cerrada" en todas las pantallas de auditoría de todos los roles. Ya no se puede modificar.

---

## Tabla de visibilidad cruzada

| Dato ingresado | Quién lo ingresó | Qué rol lo ve después | Dónde lo ve |
|---|---|---|---|
| Proveedor "Insumos Andinos SRL" ($60.000, Pendiente) | Contador (Paso 2) | Gerente Financiero | `/gerente/proveedores` — badge Pendiente, botones Aprobar/Rechazar |
| Cliente "Distribuidora Andina S.A." ($15.000, Aprobado) | Contador (Paso 3) | Tesorero | `/tesorero/cobros` — aparece en "Facturas de Venta pendientes" |
| Proveedor aprobado | Gerente (Paso 4) | Contador | `/contador/proveedores` — badge Aprobado / `/contador/facturacion` — dropdown Proveedor |
| Presupuesto Tecnología 2026 ($20.000, Pendiente) | Contador (Paso 5) | Gerente Financiero | `/gerente/presupuestos` — badge Pendiente, botón Ver detalle |
| Presupuesto aprobado | Gerente (Paso 6) | Contador | `/contador/presupuestos` — badge Aprobado / `/contador/facturacion` — dropdown "Partida presupuestaria" |
| Factura de Venta FV-002 ($15.000, Pendiente) | Contador (Paso 7) | Tesorero | `/tesorero/cobros` — "Facturas de Venta pendientes", botón "Registrar cobro" |
| Factura de Compra FAC-002 ($2.000, Pendiente) | Contador (Paso 8) | — (solo Contador) | `/contador/facturacion` — badge Pendiente, botón "Solicitar pago" |
| Solicitud de pago autoaprobada ($2.000, Automática) | Contador (Paso 9) | Tesorero | `/tesorero/pagos` — "Cola de Pagos", botón "Ejecutar" |
| Pago ejecutado ($2.000, Transferencia) | Tesorero (Paso 10) | Gerente + Contador | `/gerente/dashboard` — Gastos + Ejecución / `/contador/facturacion` — badge "Pagada" |
| Cobro registrado ($15.000) | Tesorero (Paso 11) | Gerente + Contador | `/gerente/dashboard` — Ingresos / `/contador/facturacion` — badge "Cobrada" |
| Balance generado (período 2026) | Contador (Pasos 12-13) | Gerente Financiero | `/gerente/balances` — badge "Balance: Sí", botón "Aprobar balance" |
| Balance aprobado | Gerente (Paso 14) | Contador | `/contador/balances` — botón "Cerrar período" disponible |
| Período 2026 cerrado | Contador (Paso 15) | Todos los roles | Todas las pantallas — el período aparece como "(Cerrado)" |
| Observación de auditoría (Abierta) | Auditor (Paso 16) | Gerente Financiero | `/gerente/auditoria` — badge "Abierta", botón "Ver / Responder" |
| Respuesta del Gerente (En revisión) | Gerente (Paso 17) | Auditor | `/auditor/auditoria` — badge "En revisión", botón "Cerrar" |
| Observación cerrada | Auditor (Paso 18) | Todos los roles | Estado terminal — badge verde "Cerrada" |

---

## Orden de ejecución para no romper la demo

1. **No crear la factura de compra (Paso 8) antes de que el proveedor esté aprobado (Paso 4).** El backend valida que el proveedor existe y está en estado "Aprobado" al crear la factura.
2. **No solicitar el pago (Paso 9) sin haber creado primero la factura de compra (Paso 8) con una partida presupuestaria asignada.** La solicitud de pago rechaza si `id_partida` es nulo.
3. **No ejecutar el pago (Paso 10) si el saldo de la cuenta bancaria es insuficiente.** Verificar que "Banco Nacional - Cta. Corriente" tenga saldo suficiente (inicia en $100.000, después del cobro del seed ya tuvo movimientos).
4. **No registrar el cobro (Paso 11) antes de crear la factura de venta (Paso 7).** El backend exige que la factura exista y esté en estado "Pendiente".
5. **No marcar el balance como generado (Paso 13) sin haber ejecutado los pasos 10 y 11.** El balance refleja los movimientos registrados hasta el momento de la generación.
6. **No cerrar el período (Paso 15) antes de que el balance esté generado (Paso 13) y aprobado (Paso 14).** El botón "Cerrar período" solo aparece cuando `balance_aprobado = true`.
7. **No crear la observación (Paso 16) antes de ejecutar el pago (Paso 10).** La observación hace referencia a la operación de pago; si no existe, el número de referencia no tendrá sentido.
8. **El cierre del período (Paso 15) es irreversible** desde la UI del Contador. Solo un Administrador puede reabrir un período desde la base de datos o desde la pantalla de configuración (si existiera esa función). Asegurarse de no cerrar el período hasta que todos los pasos anteriores estén completos.

---

## Notas de fidelidad al código

| Ítem del escenario propuesto | Ajuste aplicado | Motivo |
|---|---|---|
| Área "Ventas Tecnológicas" | Se usó **"Tecnología"** | El seed solo tiene las áreas "Tecnología" (id=1) y "Operaciones" (id=2) |
| Categoría "Suministros y Marketing" | Se usó **"Suministros de oficina"** (Egreso) | El seed solo tiene 3 categorías: "Servicios básicos" (Egreso), "Suministros de oficina" (Egreso) y "Venta de servicios" (Ingreso) |
| NIT del proveedor "Insumos Andinos SRL" | Se usó `1234567890123` (coincide con seed) | El seed tiene un proveedor con ese NIT, pero la demo asume que el Contador lo ingresa como número de prueba. En un entorno real el NIT debería ser único |
| NIT del cliente "Distribuidora Andina S.A." | Se usó `9876543210987` (coincide con seed) | Misma situación que el proveedor |
| Número de factura FAC-001 | Se usó **"FAC-002"** | FAC-001 ya existe en seed |
| Número de factura FV-001 | Se usó **"FV-002"** | FV-001 ya existe en seed |
| Número de operación TRF-001 | Se usó **"TRF-002"** | TRF-001 ya existe en seed |
| Montos del balance (Pasos 12-14) | Incluyen los datos del seed además de los de la demo | El seed ya tiene FAC-001 ($1.500, pagada), FV-001 ($3.000, cobrada), pagos y cobros asociados. El balance refleja todos los movimientos del período combinados, no solo los de la demo |
| Referencia ID de la observación (Paso 16) | Se usó `2` (ID de la solicitud de pago de la demo) | La solicitud de pago del seed tiene ID 1; la creada en la demo tendrá ID 2 |
| Botón "Editar" en tabla de presupuestos | Solo aparece para estados "Borrador" o "Rechazado" | Es correcto — la validación está en el frontend en la condición `(row.estado === "Borrador" || row.estado === "Rechazado")` |
| Botón "Solicitar pago" en facturas | Solo aparece para tipo "Compra" y estado "Pendiente" | Es correcto — las facturas de Venta no pasan por solicitud de pago, van directo a cobro |
