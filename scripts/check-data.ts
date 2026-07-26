import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  console.log("=== PERIODOS FISCALES ===");
  const periodos = await c.query("SELECT id_periodo, nombre_periodo, estado, balance_generado, balance_aprobado, id_usuario_autoriza_reapertura, motivo_reapertura FROM periodos_fiscales ORDER BY id_periodo");
  console.table(periodos.rows);

  console.log("\n=== USUARIOS ===");
  const usuarios = await c.query("SELECT id_usuario, nombre_completo, id_rol FROM usuarios ORDER BY id_usuario");
  console.table(usuarios.rows);

  console.log("\n=== PRESUPUESTOS ===");
  const presupuestos = await c.query("SELECT id_presupuesto, id_area, id_periodo, monto_total_propuesto, monto_total_aprobado, estado FROM presupuestos ORDER BY id_presupuesto");
  console.table(presupuestos.rows);

  console.log("\n=== PARTIDAS PRESUPUESTARIAS ===");
  const partidas = await c.query("SELECT id_partida, id_presupuesto, id_categoria, monto_asignado, monto_ejecutado FROM partidas_presupuestarias ORDER BY id_partida");
  console.table(partidas.rows);

  console.log("\n=== FACTURAS ===");
  const facturas = await c.query("SELECT id_factura, tipo, numero_factura, monto, fecha_emision, estado FROM facturas ORDER BY id_factura");
  console.table(facturas.rows);

  console.log("\n=== SOLICITUDES PAGO ===");
  const solicitudes = await c.query("SELECT id_solicitud, id_factura, monto, estado, tipo_aprobacion FROM solicitudes_pago ORDER BY id_solicitud");
  console.table(solicitudes.rows);

  console.log("\n=== PAGOS ===");
  const pagos = await c.query("SELECT id_pago, id_solicitud, id_cuenta_bancaria, monto, fecha_pago FROM pagos ORDER BY id_pago");
  console.table(pagos.rows);

  console.log("\n=== COBROS ===");
  const cobros = await c.query("SELECT id_cobro, id_factura, id_cuenta_bancaria, monto, fecha_cobro FROM cobros ORDER BY id_cobro");
  console.table(cobros.rows);

  console.log("\n=== CUENTAS BANCARIAS ===");
  const bancos = await c.query("SELECT id_cuenta_bancaria, nombre_cuenta, saldo_actual FROM cuentas_bancarias WHERE activo = TRUE");
  console.table(bancos.rows);

  console.log("\n=== AREAS ===");
  const areas = await c.query("SELECT id_area, nombre_area FROM areas_departamentos WHERE activo = TRUE");
  console.table(areas.rows);

  console.log("\n=== CATEGORIAS ===");
  const cats = await c.query("SELECT id_categoria, nombre_categoria, tipo FROM categorias");
  console.table(cats.rows);

  await c.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
