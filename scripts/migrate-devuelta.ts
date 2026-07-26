import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE solicitudes_pago DROP CONSTRAINT IF EXISTS solicitudes_pago_estado_check;
    `);
    await client.query(`
      ALTER TABLE solicitudes_pago ADD CONSTRAINT solicitudes_pago_estado_check
        CHECK (estado IN ('Pendiente','Aprobada','Rechazada','Devuelta','Ejecutada'));
    `);
    console.log("OK: solicitudes_pago — estado 'Devuelta' agregado al CHECK constraint");

    await client.query("COMMIT");
    console.log("Migración completada exitosamente");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
