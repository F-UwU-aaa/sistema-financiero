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
      ALTER TABLE periodos_fiscales
        ADD COLUMN IF NOT EXISTS balance_generado BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS fecha_balance TIMESTAMP,
        ADD COLUMN IF NOT EXISTS id_usuario_genera_balance INTEGER REFERENCES usuarios(id_usuario),
        ADD COLUMN IF NOT EXISTS balance_aprobado BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS id_usuario_aprueba_balance INTEGER REFERENCES usuarios(id_usuario),
        ADD COLUMN IF NOT EXISTS fecha_aprobacion_balance TIMESTAMP,
        ADD COLUMN IF NOT EXISTS id_usuario_autoriza_reapertura INTEGER REFERENCES usuarios(id_usuario);
    `);

    console.log("OK: periodos_fiscales — columnas de balances agregadas");

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
