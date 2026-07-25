import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE presupuestos DROP CONSTRAINT IF EXISTS presupuestos_estado_check;
      ALTER TABLE presupuestos ADD CONSTRAINT presupuestos_estado_check
        CHECK (estado IN ('Borrador','Pendiente','Aprobado','Rechazado'))
    `);
    console.log("OK: CHECK constraint actualizado para incluir 'Borrador'");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
