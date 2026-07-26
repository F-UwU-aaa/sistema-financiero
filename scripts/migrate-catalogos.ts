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
      ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS monto_contrato NUMERIC(14,2);
      ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
    `);
    console.log("OK: proveedores — monto_contrato y motivo_rechazo agregados");

    await client.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS monto_relacion NUMERIC(14,2);
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS motivo_rechazo TEXT;
    `);

    await client.query(`
      DO $$ BEGIN
        ALTER TABLE clientes ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'Aprobado'
          CHECK (estado IN ('Pendiente','Aprobado','Rechazado'));
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$;
    `);
    console.log("OK: clientes — monto_relacion, estado y motivo_rechazo agregados");

    await client.query(`
      INSERT INTO configuracion_sistema (clave, valor, descripcion)
      VALUES ('umbral_aprobacion_proveedores', '50000',
              'Monto mínimo de contrato/relación para requerir aprobación del Gerente Financiero (aplica a proveedores y clientes)')
      ON CONFLICT (clave) DO NOTHING;
    `);
    console.log("OK: umbral_aprobacion_proveedores seed");

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
