import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

const SEED_PASSWORD = "password123";

function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(Buffer.from(password, "utf8"), salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log("Conectando a la base de datos...");
    await pool.query("SELECT 1");
    console.log("Conexión exitosa.\n");

    // 1. Ejecutar schema.sql
    console.log("--- Ejecutando db/schema.sql ---");
    const schemaPath = path.join(__dirname, "../db/schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    await pool.query("BEGIN");
    try {
      await pool.query(schemaSQL);
      await pool.query("COMMIT");
      console.log("Schema creado correctamente (20 tablas).\n");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }

    // 2. Generar hashes de contraseñas
    console.log("--- Generando hashes con crypto.scrypt ---");
    const passwordHash = await hashPassword(SEED_PASSWORD);
    console.log(`Hash generado para "${SEED_PASSWORD}"\n`);

    // 3. Ejecutar inserts de seed
    console.log("--- Ejecutando inserts de seed ---");
    await pool.query("BEGIN");
    try {
      // Roles
      await pool.query(`
        INSERT INTO roles (nombre_rol, descripcion) VALUES
        ('Administrador del Sistema', 'Gestiona usuarios, accesos y configuración técnica'),
        ('Gerente Financiero', 'Define política financiera y aprueba presupuestos y pagos'),
        ('Contador', 'Registra la contabilidad, prepara presupuestos y factura'),
        ('Tesorero', 'Ejecuta pagos y cobros ya aprobados, custodia cuentas'),
        ('Auditor', 'Supervisa el sistema en modo solo lectura')
      `);
      console.log("  Roles: 5 insertados");

      // Usuarios (con hash real)
      await pool.query(
        `INSERT INTO usuarios (nombre_completo, correo, password_hash, id_rol, debe_cambiar_password) VALUES
        ($1, $2, $3, 1, FALSE),
        ($4, $5, $6, 2, FALSE),
        ($7, $8, $9, 3, FALSE),
        ($10, $11, $12, 4, FALSE),
        ($13, $14, $15, 5, FALSE)`,
        [
          "Ana Pérez", "admin@empresa.com", passwordHash,
          "Luis Gómez", "gerente@empresa.com", passwordHash,
          "Marta Ríos", "contador@empresa.com", passwordHash,
          "Jorge Salas", "tesorero@empresa.com", passwordHash,
          "Clara Vega", "auditor@empresa.com", passwordHash,
        ]
      );
      console.log("  Usuarios: 5 insertados");

      // Áreas / departamentos
      await pool.query(`
        INSERT INTO areas_departamentos (nombre_area, descripcion) VALUES
        ('Tecnología', 'Área de sistemas e infraestructura'),
        ('Operaciones', 'Área operativa general')
      `);
      console.log("  Áreas/Departamentos: 2 insertados");

      // Periodo fiscal
      await pool.query(`
        INSERT INTO periodos_fiscales (nombre_periodo, fecha_inicio, fecha_fin) VALUES
        ('2026', '2026-01-01', '2026-12-31')
      `);
      console.log("  Periodos fiscales: 1 insertado");

      // Categorías
      await pool.query(`
        INSERT INTO categorias (nombre_categoria, tipo) VALUES
        ('Servicios básicos', 'Egreso'),
        ('Suministros de oficina', 'Egreso'),
        ('Venta de servicios', 'Ingreso')
      `);
      console.log("  Categorías: 3 insertadas");

      // Presupuesto ya aprobado
      await pool.query(`
        INSERT INTO presupuestos
            (id_area, id_periodo, monto_total_propuesto, monto_total_aprobado, estado, id_usuario_elabora, id_usuario_aprueba, fecha_resolucion)
        VALUES (1, 1, 50000.00, 50000.00, 'Aprobado', 3, 2, NOW())
      `);
      console.log("  Presupuestos: 1 insertado");

      // Partidas presupuestarias
      await pool.query(`
        INSERT INTO partidas_presupuestarias (id_presupuesto, id_categoria, monto_asignado, monto_ejecutado) VALUES
        (1, 1, 30000.00, 0),
        (1, 2, 20000.00, 0)
      `);
      console.log("  Partidas presupuestarias: 2 insertadas");

      // Plan de cuentas
      await pool.query(`
        INSERT INTO cuentas_contables (codigo_cuenta, nombre_cuenta, tipo_cuenta) VALUES
        ('1101', 'Caja', 'Activo'),
        ('1102', 'Bancos', 'Activo'),
        ('2101', 'Cuentas por Pagar', 'Pasivo'),
        ('5101', 'Gastos de Servicios', 'Gasto')
      `);
      console.log("  Cuentas contables: 4 insertadas");

      // Cuentas bancarias / caja
      await pool.query(`
        INSERT INTO cuentas_bancarias (nombre_cuenta, tipo, numero_cuenta, saldo_actual) VALUES
        ('Banco Nacional - Cta. Corriente', 'Banco', '1234567890', 100000.00),
        ('Caja Chica', 'Caja', NULL, 2000.00)
      `);
      console.log("  Cuentas bancarias: 2 insertadas");

      // Proveedor
      await pool.query(`
        INSERT INTO proveedores (razon_social, nit, contacto, condiciones_pago, datos_cuenta_pago, id_usuario_registra) VALUES
        ('Suministros del Sur S.A.', '1234567890123', 'ventas@suministrossur.com', '30 días', 'Cta. 987654321 - Banco Nacional', 3)
      `);
      console.log("  Proveedores: 1 insertado");

      // Cliente
      await pool.query(`
        INSERT INTO clientes (razon_social, nit, contacto, datos_facturacion, id_usuario_registra) VALUES
        ('Comercial Andina S.R.L.', '9876543210987', 'facturacion@comercialandina.com', 'Facturación mensual', 3)
      `);
      console.log("  Clientes: 1 insertado");

      // Factura de compra
      await pool.query(`
        INSERT INTO facturas (tipo, id_proveedor, id_partida, numero_factura, monto, fecha_emision, estado, id_usuario_registra) VALUES
        ('Compra', 1, 1, 'FAC-001', 1500.00, '2026-02-10', 'Solicitada', 3)
      `);
      console.log("  Facturas (compra): 1 insertada");

      // Solicitud de pago
      await pool.query(`
        INSERT INTO solicitudes_pago (id_factura, monto, estado, tipo_aprobacion, id_usuario_solicita, fecha_resolucion) VALUES
        (1, 1500.00, 'Ejecutada', 'Automatica', 3, NOW())
      `);
      console.log("  Solicitudes de pago: 1 insertada");

      // Pago
      await pool.query(`
        INSERT INTO pagos (id_solicitud, id_cuenta_bancaria, metodo, numero_operacion, monto, id_usuario_ejecuta) VALUES
        (1, 1, 'Transferencia', 'OP-000123', 1500.00, 4)
      `);
      console.log("  Pagos: 1 insertado");

      // Factura de venta
      await pool.query(`
        INSERT INTO facturas (tipo, id_cliente, numero_factura, monto, fecha_emision, estado, id_usuario_registra) VALUES
        ('Venta', 1, 'FV-001', 3000.00, '2026-02-15', 'Cobrada', 3)
      `);
      console.log("  Facturas (venta): 1 insertada");

      // Cobro
      await pool.query(`
        INSERT INTO cobros (id_factura, id_cuenta_bancaria, monto, id_usuario_ejecuta) VALUES
        (2, 1, 3000.00, 4)
      `);
      console.log("  Cobros: 1 insertado");

      // Historial de accesos
      await pool.query(`
        INSERT INTO historial_accesos (id_usuario, ip_origen, resultado) VALUES
        (1, '192.168.1.10', 'Exitoso'),
        (3, '192.168.1.22', 'Exitoso')
      `);
      console.log("  Historial de accesos: 2 insertados");

      // Notificación
      await pool.query(`
        INSERT INTO notificaciones (id_usuario_destino, tipo_evento, mensaje) VALUES
        (2, 'presupuesto_pendiente', 'Hay un presupuesto del área Tecnología pendiente de tu aprobación')
      `);
      console.log("  Notificaciones: 1 insertada");

      // Observación de auditoría
      await pool.query(`
        INSERT INTO observaciones_auditoria (modulo_afectado, referencia_id, motivo, id_usuario_auditor) VALUES
        ('Pagos', 1, 'Verificar que el número de operación coincida con el comprobante bancario', 5)
      `);
      console.log("  Observaciones de auditoría: 1 insertada");

      // Asiento contable
      await pool.query(`
        INSERT INTO asientos_contables (id_cuenta, id_periodo, tipo_movimiento, monto, descripcion, referencia, id_usuario_registra) VALUES
        (4, 1, 'Debe', 1500.00, 'Gasto de servicios pagado a Suministros del Sur', 'FAC-001', 3)
      `);
      console.log("  Asientos contables: 1 insertado");

      // Configuración del sistema
      await pool.query(`
        INSERT INTO configuracion_sistema (clave, valor, descripcion) VALUES
        ('limite_aprobacion_automatica_pagos', '2000.00', 'Monto máximo que el sistema aprueba automáticamente sin pasar por el Gerente Financiero'),
        ('dias_expiracion_sesion', '1', 'Días antes de que expire la cookie de sesión de un usuario'),
        ('intentos_fallidos_alerta', '5', 'Intentos fallidos de acceso antes de generar alerta al Administrador')
      `);
      console.log("  Configuración del sistema: 3 registros insertados");

      await pool.query("COMMIT");
      console.log("\nSeed ejecutado correctamente.\n");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }

    // 4. Verificar conteo de filas
    console.log("--- Verificación de tablas ---");
    const tables = [
      "roles", "usuarios", "areas_departamentos", "periodos_fiscales",
      "categorias", "presupuestos", "partidas_presupuestarias",
      "cuentas_contables", "cuentas_bancarias", "proveedores", "clientes",
      "facturas", "solicitudes_pago", "pagos", "cobros",
      "asientos_contables", "observaciones_auditoria", "notificaciones",
      "historial_accesos", "configuracion_sistema",
    ];

    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      const count = result.rows[0].count;
      const status = count > 0 ? "OK" : "VACÍA";
      console.log(`  ${table.padEnd(30)} ${String(count).padStart(4)} filas  ${status}`);
    }

    console.log("\n--- Migración completada exitosamente ---");
  } catch (err) {
    console.error("\nError durante la migración:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
