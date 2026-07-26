import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // Re-check all the data in period 1
  console.log("=== FACTURAS with estado ===");
  const f = await c.query("SELECT id_factura, tipo, numero_factura, monto, fecha_emision::text, estado FROM facturas ORDER BY id_factura");
  console.table(f.rows);

  console.log("\n=== PAGOS with dates ===");
  const p = await c.query("SELECT id_pago, id_solicitud, id_cuenta_bancaria, monto, fecha_pago::text FROM pagos ORDER BY id_pago");
  console.table(p.rows);

  console.log("\n=== COBROS with dates ===");
  const cb = await c.query("SELECT id_cobro, id_factura, id_cuenta_bancaria, monto, fecha_cobro::text FROM cobros ORDER BY id_cobro");
  console.table(cb.rows);

  console.log("\n=== SOLICITUDES with estado ===");
  const s = await c.query("SELECT id_solicitud, id_factura, monto, estado FROM solicitudes_pago");
  console.table(s.rows);

  console.log("\n=== CUENTAS BANCARIAS ===");
  const b = await c.query("SELECT id_cuenta_bancaria, nombre_cuenta, saldo_actual::text FROM cuentas_bancarias WHERE activo = TRUE");
  console.table(b.rows);

  // Check if anulada facturas could be the issue
  console.log("\n=== Facturas with Anulada check ===");
  const an = await c.query("SELECT id_factura, estado, tipo FROM facturas WHERE estado = 'Anulada'");
  console.table(an.rows);

  await c.end();
}
main().catch(e => { console.error(e); process.exit(1); });
