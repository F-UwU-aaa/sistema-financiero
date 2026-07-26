import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  try {
    await c.query("BEGIN");

    // Check if period 2027 already exists
    const existing = await c.query("SELECT 1 FROM periodos_fiscales WHERE nombre_periodo = '2027'");
    if (existing.rows.length === 0) {
      await c.query(
        "INSERT INTO periodos_fiscales (nombre_periodo, fecha_inicio, fecha_fin) VALUES ('2027', '2027-01-01', '2027-12-31')"
      );
      console.log("Created period 2027");
    }

    // Check if test proveedor exists
    const prov = await c.query("SELECT 1 FROM proveedores WHERE nit = 'TEST-PROV-001'");
    if (prov.rows.length === 0) {
      await c.query(
        "INSERT INTO proveedores (razon_social, nit, estado, id_usuario_registra) VALUES ('Proveedor Test', 'TEST-PROV-001', 'Aprobado', 3)"
      );
      console.log("Created test proveedor");
    }

    const proveedor = await c.query("SELECT id_proveedor FROM proveedores WHERE nit = 'TEST-PROV-001'");
    const idProveedor = proveedor.rows[0].id_proveedor;

    // Create a factura de Compra in 2026 (within period 1)
    const fac2026 = await c.query("SELECT 1 FROM facturas WHERE numero_factura = 'FAC-TEST-2026'");
    if (fac2026.rows.length === 0) {
      await c.query(
        `INSERT INTO facturas (tipo, id_proveedor, numero_factura, monto, fecha_emision, estado, id_usuario_registra)
         VALUES ('Compra', $1, 'FAC-TEST-2026', 2000, '2026-06-15', 'Pendiente', 3)`,
        [idProveedor]
      );
      console.log("Created FAC-TEST-2026 (Compra, June 2026, $2000)");
    }

    // Create a factura de Venta in 2026 (within period 1)
    const fv2026 = await c.query("SELECT 1 FROM facturas WHERE numero_factura = 'FV-TEST-2026'");
    if (fv2026.rows.length === 0) {
      await c.query(
        `INSERT INTO facturas (tipo, id_cliente, numero_factura, monto, fecha_emision, estado, id_usuario_registra)
         VALUES ('Venta', 1, 'FV-TEST-2026', 5000, '2026-08-20', 'Pendiente', 3)`
      );
      console.log("Created FV-TEST-2026 (Venta, August 2026, $5000)");
    }

    // Record current bank balance BEFORE we add post-period transactions
    const bankBefore = await c.query("SELECT saldo_actual FROM cuentas_bancarias WHERE id_cuenta_bancaria = 1");
    const saldoBefore = Number(bankBefore.rows[0].saldo_actual);
    console.log(`\nBank balance BEFORE post-period transactions: $${saldoBefore}`);

    // Now create a cobro in 2027 (AFTER period 1 ends)
    // This cobro adds $10,000 to the bank account
    const fvTest = await c.query("SELECT id_factura FROM facturas WHERE numero_factura = 'FV-TEST-2026'");
    const cobroExist = await c.query("SELECT 1 FROM cobros WHERE id_factura = $1", [fvTest.rows[0].id_factura]);
    if (cobroExist.rows.length === 0) {
      // First change the factura estado to allow cobro
      await c.query("UPDATE facturas SET estado = 'Pendiente' WHERE numero_factura = 'FV-TEST-2026'");

      // Need to create a client for the venta
      const cliExist = await c.query("SELECT 1 FROM clientes WHERE nit = 'TEST-CLI-001'");
      if (cliExist.rows.length === 0) {
        await c.query(
          "INSERT INTO clientes (razon_social, nit, id_usuario_registra) VALUES ('Cliente Test', 'TEST-CLI-001', 3)"
        );
        console.log("Created test cliente");
      }
      const cliente = await c.query("SELECT id_cliente FROM clientes WHERE nit = 'TEST-CLI-001'");

      // Update the venta to use the test client
      await c.query("UPDATE facturas SET id_cliente = $1 WHERE numero_factura = 'FV-TEST-2026'", [cliente.rows[0].id_cliente]);
      await c.query("UPDATE facturas SET estado = 'Pendiente' WHERE numero_factura = 'FV-TEST-2026'");

      // Register cobro in 2027 with explicit fecha
      await c.query(
        `INSERT INTO cobros (id_factura, id_cuenta_bancaria, monto, fecha_cobro, id_usuario_ejecuta)
         VALUES ($1, 1, 10000, '2027-03-15 10:00:00', 4)`,
        [fvTest.rows[0].id_factura]
      );
      await c.query("UPDATE facturas SET estado = 'Cobrada' WHERE numero_factura = 'FV-TEST-2026'");
      console.log("Created cobro of $10,000 in March 2027 (AFTER period 1 ends)");
    }

    // Now create a pago in 2027 (AFTER period 1 ends)
    // This pago deducts $3,000 from the bank account
    const facTest = await c.query("SELECT id_factura FROM facturas WHERE numero_factura = 'FAC-TEST-2026'");
    const solicitudExist = await c.query(
      "SELECT 1 FROM solicitudes_pago sp JOIN facturas f ON sp.id_factura = f.id_factura WHERE f.numero_factura = 'FAC-TEST-2026'"
    );
    if (solicitudExist.rows.length === 0) {
      // Need a partida for this factura
      const partida = await c.query(
        "INSERT INTO partidas_presupuestarias (id_presupuesto, id_categoria, monto_asignado) VALUES (1, 1, 10000) RETURNING id_partida"
      );
      await c.query("UPDATE facturas SET id_partida = $1, estado = 'Pendiente' WHERE numero_factura = 'FAC-TEST-2026'", [partida.rows[0].id_partida]);

      const solicitud = await c.query(
        `INSERT INTO solicitudes_pago (id_factura, monto, estado, tipo_aprobacion, id_usuario_solicita)
         VALUES ($1, 2000, 'Aprobada', 'Automatica', 3) RETURNING id_solicitud`,
        [facTest.rows[0].id_factura]
      );
      await c.query("UPDATE facturas SET estado = 'Solicitada' WHERE numero_factura = 'FAC-TEST-2026'");

      await c.query(
        `INSERT INTO pagos (id_solicitud, id_cuenta_bancaria, metodo, numero_operacion, monto, fecha_pago, id_usuario_ejecuta)
         VALUES ($1, 1, 'Transferencia', 'OP-TEST-2027', 3000, '2027-04-10 14:00:00', 4)`,
        [solicitud.rows[0].id_solicitud]
      );
      await c.query("UPDATE cuentas_bancarias SET saldo_actual = saldo_actual - 3000 WHERE id_cuenta_bancaria = 1");
      await c.query("UPDATE solicitudes_pago SET estado = 'Ejecutada' WHERE id_solicitud = $1", [solicitud.rows[0].id_solicitud]);
      await c.query("UPDATE facturas SET estado = 'Pagada' WHERE numero_factura = 'FAC-TEST-2026'");
      console.log("Created pago of $3,000 in April 2027 (AFTER period 1 ends)");
    }

    // Show current bank balance AFTER post-period transactions
    const saldoAfter = (await c.query("SELECT saldo_actual FROM cuentas_bancarias WHERE id_cuenta_bancaria = 1")).rows[0].saldo_actual;
    console.log(`\nBank balance AFTER post-period transactions: $${saldoAfter}`);
    console.log(`Expected historical balance at end of 2026: $${saldoBefore} + 10000 (cobro) - 3000 (pago) = $${Number(saldoBefore) + 10000 - 3000}`);
    console.log(`Current (live) balance: $${saldoAfter}`);
    console.log(`Historical balance should be: $${Number(saldoAfter) - 10000 + 3000} (saldo_actual - cobro_after + pago_after)`);

    await c.query("COMMIT");
    console.log("\nTest data seeded successfully");
  } catch (error) {
    await c.query("ROLLBACK");
    throw error;
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
