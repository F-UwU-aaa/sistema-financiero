import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import pg from "pg";

async function main() {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  try {
    await c.query("ALTER TABLE observaciones_auditoria ADD COLUMN IF NOT EXISTS tipo_transaccion VARCHAR(50)");
    console.log("Added tipo_transaccion column to observaciones_auditoria");
  } finally {
    await c.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
