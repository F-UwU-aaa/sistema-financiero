import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  const fechaFin = "2026-12-31";

  console.log("=== Test INGRESOS ===");
  const ing = await c.query(
    `SELECT COALESCE(SUM(c.monto), 0)::text AS total
     FROM cobros c
     JOIN facturas f ON c.id_factura = f.id_factura
     WHERE f.tipo = 'Venta' AND f.estado != 'Anulada'
       AND c.fecha_cobro <= $1::timestamp`,
    [fechaFin + " 23:59:59"]
  );
  console.log(ing.rows);

  console.log("\n=== Test GASTOS ===");
  const gas = await c.query(
    `SELECT COALESCE(SUM(pg.monto), 0)::text AS total
     FROM pagos pg
     JOIN solicitudes_pago sp ON pg.id_solicitud = sp.id_solicitud
     WHERE sp.estado = 'Ejecutada'
       AND pg.fecha_pago <= $1::timestamp`,
    [fechaFin + " 23:59:59"]
  );
  console.log(gas.rows);

  console.log("\n=== Test BANCOS (historical) ===");
  const ban = await c.query(
    `SELECT COALESCE(
      SUM(cb.saldo_actual
        + COALESCE((SELECT SUM(pg2.monto) FROM pagos pg2 WHERE pg2.id_cuenta_bancaria = cb.id_cuenta_bancaria AND pg2.fecha_pago > $1::timestamp), 0)
        - COALESCE((SELECT SUM(c2.monto) FROM cobros c2 WHERE c2.id_cuenta_bancaria = cb.id_cuenta_bancaria AND c2.fecha_cobro > $1::timestamp), 0)
      ), 0)::text AS total
     FROM cuentas_bancarias cb
     WHERE cb.activo = TRUE`,
    [fechaFin]
  );
  console.log(ban.rows);

  console.log("\n=== Test CUENTAS POR COBRAR ===");
  const cobr = await c.query(
    `SELECT COALESCE(SUM(f.monto), 0)::text AS total
     FROM facturas f
     WHERE f.tipo = 'Venta'
       AND f.fecha_emision <= $1::date
       AND f.estado != 'Anulada'
       AND NOT EXISTS (
         SELECT 1 FROM cobros c WHERE c.id_factura = f.id_factura AND c.fecha_cobro <= $1::timestamp
       )`,
    [fechaFin]
  );
  console.log(cobr.rows);

  console.log("\n=== Test CUENTAS POR PAGAR ===");
  const pag = await c.query(
    `SELECT COALESCE(SUM(f.monto), 0)::text AS total
     FROM facturas f
     WHERE f.tipo = 'Compra'
       AND f.fecha_emision <= $1::date
       AND f.estado != 'Anulada'
       AND NOT EXISTS (
         SELECT 1 FROM solicitudes_pago sp
         JOIN pagos pg ON sp.id_solicitud = pg.id_solicitud
         WHERE sp.id_factura = f.id_factura
           AND sp.estado = 'Ejecutada'
           AND pg.fecha_pago <= $1::timestamp
       )`,
    [fechaFin]
  );
  console.log(pag.rows);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
