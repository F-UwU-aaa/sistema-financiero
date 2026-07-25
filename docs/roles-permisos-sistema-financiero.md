# Roles y Permisos del Sistema — Sistema de Gestión Financiera y Presupuestaria

**Versión definitiva — 5 roles fijos**

Este documento consolida y reemplaza las versiones previas. Los roles del sistema son, en definitiva, estos cinco — no se agregará ningún otro: **Administrador del Sistema, Gerente Financiero, Contador, Tesorero y Auditor.** No existen como roles de usuario "Jefe de Área" ni "Proveedor/Cliente"; la sección 3 explica cómo el flujo completo de una empresa real funciona igual de bien sin ellos, sin perder ningún control.

## Índice

1. Principio de diseño: segregación de funciones
2. Los 5 roles del sistema
3. Punto clave: el flujo sin el rol "Jefe de Área"
4. Detalle de funciones por rol
   - 4.1 Administrador del Sistema
   - 4.2 Gerente Financiero
   - 4.3 Contador
   - 4.4 Tesorero
   - 4.5 Auditor
5. Flujos de trabajo completos
6. Matriz de permisos por módulo
7. Notas de implementación

---

## 1. Principio de diseño: segregación de funciones

En todo sistema financiero serio —contable, ERP, bancario— existe una regla básica de control interno conocida como **segregación de funciones** (*segregation of duties*): ninguna persona debe poder solicitar, aprobar y ejecutar el mismo movimiento de dinero. Cuando una sola persona controla un proceso de principio a fin, desaparecen los controles cruzados que permiten detectar errores o prevenir fraude — y es, literalmente, la razón de ser de un módulo de Auditoría: no tendría sentido si una sola persona pudiera hacer de todo.

En este sistema, esa regla se traduce en cuatro principios concretos:

1. Quien **administra el sistema** (usuarios, configuración) no participa en las operaciones financieras del día a día ni ve el detalle de los movimientos de dinero.
2. Quien **registra y prepara** la información financiera (Contador) no es quien la **aprueba** (Gerente Financiero).
3. Quien **aprueba** un pago o presupuesto no es quien lo **ejecuta** (Tesorero).
4. Quien **audita** el sistema no participa en ninguna operación: no crea, no aprueba, no ejecuta — solo verifica.

Por eso, por ejemplo, no tiene sentido que el Contador cree cuentas de Administrador, que el Administrador vea el detalle contable, o que el Tesorero apruebe sus propios pagos: son funciones de naturaleza distinta que deben mantenerse separadas para que el sistema sea confiable y auditable.

## 2. Los 5 roles del sistema

| Rol | Responsabilidad principal | Naturaleza de la función |
|---|---|---|
| **Administrador del Sistema** | Gestiona usuarios, accesos y configuración técnica. No participa en operaciones de dinero. | Soporte de sistema |
| **Gerente Financiero** | Define política financiera y aprueba o rechaza presupuestos y pagos. Visión ejecutiva. | Decisión / Aprobación |
| **Contador** | Registra la contabilidad, prepara presupuestos, factura y arma cada operación antes de que avance. | Operación / Preparación |
| **Tesorero** | Ejecuta los pagos y cobros ya aprobados. Custodia el efectivo y las cuentas bancarias. | Ejecución |
| **Auditor** | Supervisa todo el sistema en modo solo lectura. Detecta y reporta irregularidades. | Control independiente |

Estos 5 roles cubren, sin superposición, las cuatro capas de control que exige un sistema financiero real: quien **opera** (Contador), quien **decide** (Gerente Financiero), quien **ejecuta** (Tesorero) y quien **controla** (Auditor) — con el Administrador sosteniendo la infraestructura de todos ellos, sin tocar el dinero en ningún momento.

## 3. Punto clave: el flujo sin el rol "Jefe de Área"

Las otras respuestas que recibiste agregaban un sexto rol —Jefe de Área— con el argumento de que, sin él, el módulo de Presupuestos "no cierra": alguien tiene que pedir presupuesto para que el Gerente Financiero lo apruebe. Es un argumento válido, pero no es la única forma de resolverlo, y **no hace falta un rol nuevo para solucionarlo.**

La alternativa —la que usa este diseño— es igual de real y, de hecho, más común en sistemas financieros internos de empresas pequeñas y medianas: **el Contador es el único punto de entrada formal al sistema para cualquier necesidad financiera que surja en la organización.**

En la práctica:

- Si un área operativa necesita presupuesto, lo solicita al Contador **fuera del sistema** (correo, memo, conversación) — igual que hoy, en la mayoría de empresas pequeñas y medianas, un jefe de área no entra a un ERP a pedir presupuesto: se lo pide directamente a Contabilidad.
- El Contador consolida esas necesidades junto con el histórico de ejecución y arma la propuesta de presupuesto por área/periodo **dentro** del sistema.
- Si llega una factura de un proveedor o surge un gasto de cualquier área, el Contador la registra y genera la Solicitud de Pago dentro del sistema.

Esto **no debilita la segregación de funciones** — al contrario, la mantiene igual de sólida, porque lo que importa no es cuántos roles participan, sino que **quien prepara/solicita (Contador) nunca sea quien aprueba (Gerente Financiero) ni quien ejecuta (Tesorero)**. Ese triángulo de tres personas distintas se mantiene intacto con 5 roles. Como beneficio adicional, menos cuentas de usuario significa menos credenciales que administrar y proteger — algo que en sistemas financieros de tamaño reducido suele valorarse tanto como la separación misma.

**Nota de diseño:** aunque no exista un usuario "Jefe de Área", el catálogo **Áreas / Departamentos** sí se mantiene como tabla base del sistema (la configura el Administrador), porque los presupuestos y los gastos necesitan organizarse por área aunque nadie de esa área tenga cuenta propia en el sistema.

## 4. Detalle de funciones por rol

### 4.1 Administrador del Sistema

**Quién es en la vida real:** la persona de TI, o la persona designada por gerencia, que mantiene el sistema funcionando y a las personas correctas con el acceso correcto. No es contador ni financiero: gestiona accesos, no dinero.

**Gestión de usuarios**
1. Crear una cuenta de usuario para cualquiera de los otros 4 roles (Gerente Financiero, Contador, Tesorero, Auditor), ingresando nombre completo, correo electrónico institucional y una contraseña temporal autogenerada por el sistema.
2. Asignar el rol correspondiente a cada cuenta en el momento de la creación. Los 5 roles del sistema son fijos: el Administrador asigna un rol existente, no crea roles nuevos.
3. Editar los datos de un usuario existente (nombre, correo, rol asignado).
4. Reasignar el rol de un usuario si cambia de función dentro de la organización.
5. Desactivar el acceso de un usuario que deja la organización. Se recomienda desactivar y no eliminar, para no perder la trazabilidad de todo lo que esa persona hizo mientras tuvo acceso — algo que después necesita el Auditor.
6. Eliminar una cuenta de forma definitiva solo si nunca tuvo actividad registrada en el sistema.
7. Restablecer la contraseña de un usuario bloqueado o que la olvidó, generando una temporal que debe cambiarse en el siguiente ingreso.
8. Consultar el listado de usuarios activos e inactivos, filtrando por rol, y su historial de accesos (quién entró, cuándo, desde dónde).

**Configuración general**
9. Configurar catálogos base usados por otros módulos: moneda del sistema, áreas/departamentos, categorías de ingreso/egreso, periodos fiscales.
10. Definir el **monto límite de aprobación automática de pagos**: el valor a partir del cual un pago necesita aprobación manual del Gerente Financiero (por debajo del límite, el sistema lo aprueba automáticamente).
11. Configurar qué evento dispara qué notificación y hacia qué rol (por ejemplo: "cuando el presupuesto de un área llega al 90%, notificar al Gerente Financiero").
12. Configurar políticas de contraseña y tiempo de expiración de sesión.

**Supervisión técnica** *(distinta de la auditoría financiera, que es exclusiva del rol Auditor)*
13. Consultar el registro técnico de accesos al sistema. Esto es supervisión técnica, no auditoría financiera: el Administrador no tiene acceso al módulo de Auditoría ni a su contenido.
14. Recibir alerta ante intentos de acceso fallidos repetidos sobre una misma cuenta.

**Reportes**
15. Exportar reportes de usuarios, accesos y configuración del sistema.

**Lo que el Administrador NO hace:** no crea presupuestos, no registra asientos contables, no aprueba ni ejecuta pagos, y no puede ver el detalle de ningún movimiento financiero —presupuestos, cuentas, pagos, balances, facturación, proveedores/clientes— ni el contenido del módulo de Auditoría, ni siquiera en modo solo lectura. Así se garantiza que quien controla el acceso al sistema no pueda, a la vez, controlar o influir sobre el dinero que pasa por él.

### 4.2 Gerente Financiero

**Quién es en la vida real:** la persona que responde por la salud financiera de la organización — Director Financiero, CFO o cargo equivalente. Decide y aprueba; no ejecuta nada con sus propias manos ni lleva el registro contable del día a día.

**Presupuestos**
1. Definir la política y el techo general de presupuesto de la organización por periodo (mensual/anual), en función de la disponibilidad real que reporta el Contador.
2. Revisar cada propuesta de presupuesto que el Contador elabora por área, departamento o proyecto.
3. Ajustar montos antes de aprobar (por ejemplo, reducir lo propuesto para un área).
4. Aprobar o rechazar la propuesta; si rechaza, debe registrar un motivo visible para el Contador.
5. Reasignar montos entre partidas presupuestarias cuando exista una justificación válida.
6. Consultar el histórico de presupuestos de periodos anteriores y compararlos contra la ejecución real.

**Pagos**
7. Revisar las solicitudes de pago que superan el monto límite configurado por el Administrador — las que están por debajo, el sistema las aprueba automáticamente sin pasar por el Gerente Financiero.
8. Verificar que exista saldo disponible en la partida presupuestaria antes de aprobar.
9. Aprobar o rechazar la solicitud, registrando motivo si rechaza. Si aprueba, el pago queda habilitado para el Tesorero — el Gerente Financiero nunca lo ejecuta directamente.
10. Consultar el estado de todos los pagos del sistema: pendientes, aprobados, ejecutados, rechazados.

**Balances y cierre de periodo**
11. Revisar los balances y estados financieros que prepara el Contador al cierre de cada periodo, y darles el visto bueno antes de que se consideren definitivos.
12. Autorizar —con motivo, quedando registrado quién lo autorizó— la reapertura de un periodo ya cerrado, solo cuando sea indispensable.

**Proveedores / Clientes**
13. Aprobar el alta de un nuevo proveedor o cliente cuando el monto del contrato o de la relación comercial sea significativo (umbral configurable).

**Dashboard y reportes**
14. Consultar el dashboard financiero ejecutivo completo: ingresos vs. egresos, balance general, flujo de caja consolidado, ejecución presupuestaria por área, indicadores clave.
15. Exportar reportes financieros consolidados (PDF/Excel) para junta directiva, socios o entes reguladores.

**Auditoría**
16. Revisar los hallazgos u observaciones que reporta el Auditor, y responder o justificar lo señalado.

**Notificaciones**
17. Recibe notificación automática cuando una propuesta de presupuesto o una solicitud de pago está pendiente de su aprobación.
18. Recibe alerta cuando un área está por alcanzar o ya superó su presupuesto asignado.
19. Puede enviar observaciones al Contador pidiendo ajustes o correcciones sobre lo que este propuso.

**Lo que el Gerente Financiero NO hace:** no crea usuarios ni cuentas, no registra asientos contables, no ejecuta pagos ni cobros. Decide sobre lo que otros preparan y ejecutan; mezclar eso con la operación diaria eliminaría el control cruzado que su rol existe para dar.

### 4.3 Contador

**Quién es en la vida real:** quien lleva la contabilidad día a día y es, en este diseño, el punto de entrada operativo del sistema: registra, prepara, propone y factura. No aprueba montos que superen su umbral ni mueve el dinero directamente.

**Cuentas contables**
1. Crear y mantener el plan/catálogo de cuentas contables (Caja, Bancos, Cuentas por Pagar, Cuentas por Cobrar, Gastos, Ingresos, etc.).
2. Registrar los asientos contables de cada transacción (ingresos, egresos, ajustes).
3. Conciliar periódicamente los saldos del sistema contra los extractos bancarios reales (**conciliación bancaria** — distinta del arqueo diario de caja, que hace el Tesorero; ver sección 7).

**Presupuestos**
4. Elaborar la propuesta de presupuesto de cada periodo, por área/departamento/proyecto, basándose en el histórico de ejecución y en las necesidades que las áreas comunican fuera del sistema.
5. Enviar la propuesta al Gerente Financiero para su aprobación.
6. Ajustar y reenviar la propuesta si fue rechazada.
7. Consultar el saldo disponible de una partida presupuestaria antes de procesar cualquier gasto.

**Pagos**
8. Registrar las facturas de proveedores recibidas (cuentas por pagar), sin importar de qué área operativa haya surgido la necesidad de gasto.
9. A partir de una factura pendiente, generar una Solicitud de Pago —verificando que haya presupuesto disponible en la partida correspondiente— y enviarla a aprobación.
10. Si el monto no supera el límite configurado, el sistema aprueba automáticamente y la solicitud pasa directo a Tesorería; si lo supera, queda pendiente de aprobación manual del Gerente Financiero.
11. Una vez que el Tesorero ejecuta un pago o registra un cobro, realizar el registro contable de conciliación correspondiente.

**Balances**
12. Generar el balance general y el estado de resultados de cada periodo.
13. Enviar los balances al Gerente Financiero para su revisión y visto bueno.
14. Ejecutar formalmente el **cierre del periodo contable** una vez aprobado por el Gerente Financiero, lo que bloquea la edición de esos movimientos para todos los roles, incluido el propio Contador.
15. Solicitar al Gerente Financiero la reapertura de un periodo cerrado, solo si es indispensable y con justificación.

**Facturación / Comprobantes**
16. Emitir facturas o comprobantes de venta a clientes (cuentas por cobrar).
17. Registrar los comprobantes de pago o cobro recibidos de clientes.
18. Validar el comprobante que el sistema genera automáticamente cada vez que el Tesorero ejecuta un pago o registra un cobro.
19. Anular o corregir un comprobante con errores, dejando constancia del motivo — nunca se borra en silencio, por trazabilidad.

**Proveedores / Clientes**
20. Dar de alta y mantener actualizada la información de proveedores (razón social, NIT u otro identificador fiscal equivalente, contacto, condiciones y cuenta de pago) y de clientes (datos de facturación, contacto, historial).
21. Consultar el historial de transacciones por proveedor o cliente.

**Dashboard y reportes**
22. Consultar el dashboard contable: cuentas por pagar/cobrar pendientes, ejecución presupuestaria por área, flujo de caja.
23. Generar y exportar reportes contables: libro diario, libro mayor, balance de comprobación, ejecución presupuestaria.

**Notificaciones**
24. Recibe notificación cuando el Gerente Financiero aprueba o rechaza una propuesta de presupuesto o una solicitud de pago.
25. Envía notificación automática al Gerente Financiero cada vez que genera una solicitud que necesita su aprobación.
26. Recibe alerta cuando una factura de proveedor está próxima a vencer.
27. Recibe notificación automática cuando el Tesorero ejecuta un pago o registra un cobro, para poder conciliarlo.
28. Solicita al Administrador la creación o modificación de un usuario cuando lo necesite — no puede crearlo ni modificarlo directamente.

**Lo que el Contador NO hace:** no aprueba sus propias propuestas de presupuesto ni sus propias solicitudes de pago, no ejecuta el desembolso real del dinero (exclusivo del Tesorero), y no crea, edita ni elimina usuarios del sistema. Prepara todo, pero no decide montos grandes ni mueve el dinero: si pudiera hacer ambas cosas, podría aprobarse pagos a sí mismo.

### 4.4 Tesorero

**Quién es en la vida real:** quien mueve efectivamente el dinero una vez que ya fue aprobado, y cuida el efectivo y las cuentas bancarias de la organización. No decide ni registra la contabilidad de fondo.

**Pagos**
1. Consultar la cola de pagos ya validados por el Contador y aprobados (automática o manualmente, según el monto), pendientes de ejecución.
2. Verificar que haya saldo suficiente en la cuenta de origen antes de ejecutar.
3. Ejecutar el pago (transferencia, cheque, efectivo), registrando cuenta de origen, fecha, método y número de operación o comprobante bancario.
4. Marcar la solicitud como "Pagado", lo que actualiza automáticamente el saldo de la cuenta, la partida presupuestaria y el estado de la factura.
5. Rechazar la ejecución de un pago si detecta una inconsistencia (por ejemplo, datos bancarios incorrectos del proveedor), devolviéndolo al Contador con una observación. Esto no es "aprobar o rechazar" la solicitud —esa decisión ya la tomó el Gerente Financiero—, es una verificación operativa antes de mover el dinero.
6. Consultar, sin editar, los datos bancarios de los proveedores registrados por el Contador, necesarios para ejecutar las transferencias.

**Cuentas y cobros**
7. Administrar el saldo y los movimientos de las cuentas bancarias y caja chica de la organización (depósitos, retiros, transferencias entre cuentas propias).
8. Registrar los cobros recibidos de clientes, asociándolos a la factura correspondiente.
9. Realizar el **arqueo de caja** —conteo diario del efectivo físico contra el registro del sistema— distinto de la conciliación bancaria formal que hace el Contador contra los extractos oficiales (ver sección 7).

**Dashboard y reportes**
10. Consultar el dashboard de flujo de caja: saldo disponible en cada cuenta en tiempo real, pagos ejecutados, pagos aprobados pendientes de ejecutar.
11. Generar y exportar el reporte de flujo de caja y el listado de pagos ejecutados por rango de fechas.

**Notificaciones**
12. Recibe notificación automática cuando hay un nuevo pago aprobado y listo para ejecutar.
13. Notifica automáticamente al Contador cuando ejecuta un pago o registra un cobro, para que concilie.
14. Recibe alerta cuando el saldo de una cuenta cae por debajo de un mínimo configurado, o es insuficiente para cubrir un pago ya aprobado.

**Lo que el Tesorero NO hace:** no aprueba solicitudes de pago (eso es del Gerente Financiero), no registra asientos contables ni genera balances (eso es del Contador), y no crea presupuestos. Solo ejecuta lo que ya fue preparado y aprobado por otros dos roles — separar "aprobar" de "ejecutar" es lo que impide que una sola persona controle todo el ciclo del dinero.

### 4.5 Auditor

**Quién es en la vida real:** el rol de control independiente — auditor interno o externo. No participa en la operación; su trabajo es verificar que todo lo demás se haya hecho correctamente.

**Auditoría**
1. Consultar, en modo solo lectura, todos los módulos financieros del sistema: presupuestos, cuentas, pagos, cobros, balances, facturación, proveedores/clientes.
2. Revisar el historial completo de cada transacción: quién la registró, quién la aprobó, quién la ejecutó y en qué fecha exacta — trazabilidad total.
3. Consultar, sin modificar, el listado de usuarios y los roles asignados a cada uno, para verificar periódicamente que los accesos otorgados sean correctos.
4. Registrar una **observación** sobre una transacción que considere irregular (por ejemplo, un pago sin comprobante válido, o un gasto que superó el presupuesto sin aprobación registrada), indicando el motivo — sin poder alterar el registro original.
5. Dar seguimiento al estado de cada observación propia: abierta → en revisión → cerrada.
6. Generar informes de auditoría filtrando por periodo, usuario, módulo o tipo de transacción.

**Notificaciones**
7. Recibe alertas automáticas ante patrones inusuales: intento de modificar un registro de un periodo ya cerrado, un pago ejecutado fuera del flujo normal, montos inusualmente altos, o intentos fallidos de acceso repetidos.
8. Notifica al Gerente Financiero —y también al Administrador, si el hallazgo involucra accesos o usuarios— cuando identifica una irregularidad relevante.

**Dashboard y reportes**
9. Consultar el dashboard de auditoría: alertas activas, transacciones marcadas, cumplimiento de las políticas de aprobación.
10. Exportar sus reportes en PDF, como respaldo documental o legal, o para presentar ante entes reguladores.

**Lo que el Auditor NO hace:** no crea, edita ni elimina ningún registro financiero —ni siquiera los que él mismo marca como "observados"— y no gestiona usuarios ni roles. Su única escritura permitida en el sistema es registrar sus propias observaciones de auditoría. Si pudiera modificar lo que audita, dejaría de ser independiente.

## 5. Flujos de trabajo completos

### Flujo 1 — Alta de un nuevo usuario
1. Gerencia informa al Administrador, fuera del sistema, que se necesita una cuenta nueva, indicando el rol (Gerente Financiero, Contador, Tesorero o Auditor).
2. El Administrador ingresa al módulo "Usuarios y Roles" y completa nombre completo, correo electrónico y rol a asignar.
3. El sistema genera una contraseña temporal y envía un correo automático con las credenciales.
4. En su primer inicio de sesión, el sistema obliga a cambiar la contraseña.
5. El usuario queda activo con los permisos exactos de su rol — ni uno más, ni uno menos.

### Flujo 2 — Definición y aprobación de un presupuesto
1. Las áreas comunican al Contador, fuera del sistema, sus necesidades de presupuesto para el periodo siguiente.
2. El Contador elabora la propuesta de presupuesto por área/departamento, apoyándose en el histórico de ejecución.
3. El sistema marca la propuesta como "Pendiente de aprobación" y notifica al Gerente Financiero.
4. El Gerente Financiero revisa, puede ajustar montos, y aprueba o rechaza (con motivo, si rechaza).
5. Si aprueba: el sistema activa el presupuesto por partida, disponible para que el Contador registre gastos contra él.
6. Si rechaza: el Contador ajusta la propuesta según el motivo indicado y la reenvía.

### Flujo 3 — Solicitud, aprobación y ejecución de un pago
1. Llega una factura o necesidad de pago —de un proveedor, o de un gasto interno de cualquier área— a Contabilidad, por el canal que use la organización fuera del sistema.
2. El Contador registra la factura y genera una Solicitud de Pago, asociándola a la partida presupuestaria correspondiente.
3. El sistema valida automáticamente que exista saldo suficiente en esa partida; si no lo hay, bloquea la solicitud y avisa al Contador.
4. Según el monto: si está por debajo del límite configurado por el Administrador, el sistema la aprueba automáticamente y la envía directo a Tesorería; si lo supera, se notifica al Gerente Financiero para aprobación manual.
5. El Gerente Financiero aprueba o rechaza (con motivo, si rechaza).
6. Una vez aprobada —automática o manualmente—, el sistema notifica al Tesorero.
7. El Tesorero verifica el saldo de la cuenta de origen y ejecuta el pago, registrando el número de operación.
8. El sistema actualiza automáticamente: saldo de la partida presupuestaria, saldo de la cuenta bancaria/caja, y estado de la factura a "Pagada".
9. Se notifica al Contador para que concilie el movimiento.
10. Todo el recorrido —quién registró, quién aprobó, quién ejecutó y cuándo— queda disponible automáticamente para el Auditor, sin que nadie tenga que documentarlo manualmente.

### Flujo 4 — Cierre de periodo contable
1. Al finalizar el periodo, el Contador revisa que todos los movimientos estén correctamente registrados y realiza la conciliación bancaria.
2. El Contador genera el balance general y el estado de resultados del periodo, y los envía al Gerente Financiero.
3. El Gerente Financiero revisa y da su visto bueno.
4. El Contador ejecuta formalmente el cierre del periodo contable, lo que bloquea la edición de todos los movimientos de ese periodo para todos los roles, incluido él mismo.
5. El Auditor revisa libremente los movimientos del periodo ya cerrado y genera su informe.
6. Si es indispensable corregir algo, solo el Gerente Financiero puede autorizar la reapertura del periodo, quedando registrada la razón y quién la autorizó.

### Flujo 5 — Detección y gestión de una irregularidad
1. El Auditor, revisando el sistema o al recibir una alerta automática por un patrón inusual, detecta una transacción que considera irregular.
2. Registra una observación formal sobre esa transacción, indicando el motivo, sin alterar el registro original.
3. El sistema notifica al Gerente Financiero y, si el hallazgo involucra accesos o usuarios, también al Administrador.
4. El Gerente Financiero revisa el hallazgo y responde o lo justifica; si corresponde una acción sobre accesos, el Administrador la ejecuta.
5. El Auditor actualiza el estado de la observación —en revisión → cerrada— una vez resuelto.

## 6. Matriz de permisos por módulo

Leyenda: **C** = Crea/Registra · **L** = Consulta (lectura) · **M** = Modifica/Edita · **Ap** = Aprueba o rechaza · **Ej** = Ejecuta · **—** = Sin acceso

| Módulo | Administrador | Gerente Financiero | Contador | Tesorero | Auditor |
|---|---|---|---|---|---|
| Usuarios y Roles (incl. historial de accesos) | C, L, M, Desactiva | — | — | — | L |
| Configuración del sistema | C, L, M | L | L | L | L |
| Presupuestos | — | L, Ap | C, L, M | — | L |
| Cuentas contables (plan de cuentas) | — | L | C, L, M | — | L |
| Cuentas bancarias / Caja | — | L | L | C, L, M | L |
| Pagos | — | L, Ap | C, L | L, Ej | L |
| Cobros | — | L | L | C, L | L |
| Balances y cierre de periodo | — | L, Ap, autoriza reapertura | C, L, M, cierra | L | L |
| Facturación / Comprobantes | — | L | C, L, M | L | L |
| Proveedores / Clientes | — | L, Ap altas grandes | C, L, M | L (datos bancarios) | L |
| Auditoría (trazabilidad y hallazgos) | — | L | — | — | C, L |
| Dashboard / Reportes | Uso del sistema | Financiero ejecutivo | Contable | Caja y bancos | Trazabilidad |
| Notificaciones y alertas | Configura reglas | Recibe | Recibe / Envía | Recibe / Envía | Recibe |
| Exportación de reportes | De sistema y accesos | Financieros consolidados | Contables | De caja/bancos | De auditoría |

## 7. Notas de implementación

- **Los 5 roles son fijos por diseño.** Se recomienda que estén precargados en el sistema (no como registros libremente editables), de forma que ni siquiera el Administrador pueda crear un sexto rol por error o mal uso.
- **Catálogo Áreas/Departamentos:** aunque ningún área tenga usuario propio, conviene mantenerlo como tabla base, para poder organizar presupuestos y gastos por área/centro de costo.
- **Todo registro con flujo de aprobación** (presupuesto, pago, alta de proveedor grande) debe tener un campo "estado" con historial de cambios. Esto no solo ordena el flujo: alimenta automáticamente el módulo de Auditoría, sin trabajo manual extra.
- **El monto límite de aprobación automática de pagos** debe ser un parámetro configurable por el Administrador, no un número fijo en el código, porque cambia con el tiempo y según la organización.
- **Arqueo de caja (Tesorero) vs. conciliación bancaria (Contador):** son controles distintos y complementarios. El arqueo es un conteo físico/diario de lo que hay en caja; la conciliación bancaria compara formalmente el registro contable contra el extracto oficial del banco. Que los haga la misma persona debilitaría el control cruzado — por eso quedan repartidos entre los dos roles.
- **Cierre de periodo:** una vez que un balance queda aprobado y cerrado, se bloquea la edición de esas transacciones para todos los roles, incluido el Contador, para que el módulo de Auditoría tenga datos que nadie pueda alterar después.
- **Proveedores y Clientes** son datos administrados íntegramente por el Contador, no usuarios del sistema — no existe portal externo en este diseño de 5 roles. Si en una fase futura se decide dar acceso directo a proveedores o clientes para consultar el estado de sus pagos, eso implicaría un tipo de acceso externo aparte (con su propio nivel de seguridad), no un sexto rol interno.
- **Si en algún momento el tiempo de desarrollo obliga a simplificar aún más,** la única fusión razonable sin perder el control esencial sería unir Contador y Tesorero en un solo rol operativo — pero se perdería la separación entre "quien prepara" y "quien ejecuta", que es precisamente el control más importante del sistema. No se recomienda salvo necesidad extrema.
