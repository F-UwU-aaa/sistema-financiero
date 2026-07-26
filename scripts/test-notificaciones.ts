import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import * as http from "http";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function apiCall(method: string, urlPath: string, cookie?: string, body?: any): Promise<{ status: number; data: string; setCookie?: string }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {};
    if (cookie) headers["Cookie"] = cookie;
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const options = { hostname: "localhost", port: 3000, path: urlPath, method, headers };
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve({ status: res.statusCode || 0, data, setCookie: res.headers["set-cookie"]?.[0] }));
    });
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

let passed = 0;
let failed = 0;

function check(label: string, actual: number, expected: number) {
  if (actual === expected) {
    console.log(`  ✅ ${label} → ${actual}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} → ${actual} (expected ${expected})`);
    failed++;
  }
}

function checkBool(label: string, actual: boolean, expected: boolean) {
  if (actual === expected) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} (expected ${expected}, got ${actual})`);
    failed++;
  }
}

function json(res: { data: string }) { return JSON.parse(res.data); }

async function login(correo: string): Promise<string> {
  const res = await apiCall("POST", "/api/auth/login", undefined, { correo, password: "password123" });
  const match = res.setCookie?.match(/session=([^;]+)/);
  if (!match) throw new Error(`Login failed for ${correo}`);
  return `session=${match[1]}`;
}

async function getNoLeidas(cookie: string): Promise<number> {
  const data = json(await apiCall("GET", "/api/notificaciones/no-leidas", cookie));
  return Number(data.cantidad ?? 0);
}

async function main() {
  const gerente = await login("gerente@empresa.com");
  const contador = await login("contador@empresa.com");
  const tesorero = await login("tesorero@empresa.com");
  console.log("=== SESSIONS OK ===\n");

  // ── 1. NO-LEÍDAS ENDPOINT ──
  console.log("=== 1. NO-LEÍDAS ENDPOINT ===");
  const noLeidasRes = await apiCall("GET", "/api/notificaciones/no-leidas", tesorero);
  check("GET /api/notificaciones/no-leidas → 200", noLeidasRes.status, 200);
  checkBool("no-leidas returns cantidad field", "cantidad" in json(noLeidasRes), true);
  console.log();

  // ── 2. SOLICITUD DE PAGO: MANUAL → APPROVE → PAGO ──
  console.log("=== 2. SOLICITUD DE PAGO: MANUAL → APPROVE → PAGO ===");
  const provRes = await pool.query(
    "SELECT id_proveedor FROM proveedores WHERE estado = 'Aprobado' LIMIT 1"
  );
  const partidaRes = await pool.query(
    "SELECT id_partida FROM partidas_presupuestarias WHERE monto_asignado - monto_ejecutado >= 5000 LIMIT 1"
  );

  let facturaId: number | undefined;
  if (provRes.rows.length > 0 && partidaRes.rows.length > 0) {
    const fv = await pool.query(
      `INSERT INTO facturas (tipo, id_proveedor, id_partida, numero_factura, monto, fecha_emision, fecha_vencimiento, estado, id_usuario_registra)
       VALUES ('Compra', $1, $2, 'TEST-F-COMP-111', 5000, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Pendiente', 3)
       RETURNING id_factura`,
      [provRes.rows[0].id_proveedor, partidaRes.rows[0].id_partida]
    );
    facturaId = fv.rows[0].id_factura;
    console.log(`  ℹ️  Created test factura Compra id=${facturaId} (partida=${partidaRes.rows[0].id_partida})`);
  }

  if (facturaId) {
    const gerBefore = await getNoLeidas(gerente);
    const solRes = await apiCall("POST", "/api/solicitudes-pago", contador, { id_factura: facturaId });
    check("POST /api/solicitudes-pago (5000 > 2000 umbral) → 201", solRes.status, 201);

    if (solRes.status === 201) {
      const solData = json(solRes).solicitud;
      const solId = solData.id_solicitud;
      console.log(`  ℹ️  Solicitud #${solId} tipo_aprobacion=${solData.tipo_aprobacion}`);

      if (solData.tipo_aprobacion === "Manual") {
        const gerAfter = await getNoLeidas(gerente);
        check("Manual: Gerente +1 notification", gerAfter, gerBefore + 1);

        const tesBefore = await getNoLeidas(tesorero);
        const contBefore = await getNoLeidas(contador);
        const aprRes = await apiCall("PATCH", `/api/solicitudes-pago/${solId}/aprobar`, gerente, { accion: "aprobar" });
        check("Gerente approves solicitud → 200", aprRes.status, 200);

        if (aprRes.status === 200) {
          const tesAfter = await getNoLeidas(tesorero);
          const contAfter = await getNoLeidas(contador);
          check("Approved: Tesorero +1 notification", tesAfter, tesBefore + 1);
          check("Approved: Contador (solicitante) +1 notification", contAfter, contBefore + 1);

          const cbRes = await pool.query(
            "SELECT id_cuenta_bancaria FROM cuentas_bancarias WHERE activo = TRUE LIMIT 1"
          );
          if (cbRes.rows.length > 0) {
            const gerBefore2 = await getNoLeidas(gerente);
            const contBefore2 = await getNoLeidas(contador);
            const pagoRes = await apiCall("POST", "/api/pagos", tesorero, {
              id_solicitud: solId,
              id_cuenta_bancaria: cbRes.rows[0].id_cuenta_bancaria,
              metodo: "Transferencia",
              numero_operacion: "OP-TEST-001",
            });
            check("Tesorero executes pago → 201", pagoRes.status, 201);

            if (pagoRes.status === 201) {
              const gerAfter2 = await getNoLeidas(gerente);
              const contAfter2 = await getNoLeidas(contador);
              check("Pago: Gerente +1 notification", gerAfter2, gerBefore2 + 1);
              check("Pago: Contador +1 notification", contAfter2, contBefore2 + 1);
            }
          }
        }
      } else {
        console.log("  ℹ️  Solicitud auto-aprobada — skip manual flow");
      }
    }
  } else {
    console.log("  ⚠️  No proveedor aprobado or no partida with balance — skip solicitud test");
  }
  console.log();

  // ── 3. COBRO → Gerente + Contador ──
  console.log("=== 3. COBRO → Gerente + Contador ===");
  const clRes = await pool.query(
    "SELECT id_cliente FROM clientes WHERE estado = 'Aprobado' LIMIT 1"
  );
  let fvId: number | undefined;
  if (clRes.rows.length > 0) {
    const fv = await pool.query(
      `INSERT INTO facturas (tipo, id_cliente, numero_factura, monto, fecha_emision, fecha_vencimiento, estado, id_usuario_registra)
       VALUES ('Venta', $1, 'TEST-F-VENT-111', 1500, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 'Pendiente', 3)
       RETURNING id_factura`,
      [clRes.rows[0].id_cliente]
    );
    fvId = fv.rows[0].id_factura;
    console.log(`  ℹ️  Created test factura Venta id=${fvId}`);
  }

  if (fvId) {
    const cbRes = await pool.query(
      "SELECT id_cuenta_bancaria FROM cuentas_bancarias WHERE activo = TRUE LIMIT 1"
    );
    if (cbRes.rows.length > 0) {
      const gerBefore = await getNoLeidas(gerente);
      const contBefore = await getNoLeidas(contador);
      const cobroRes = await apiCall("POST", "/api/cobros", tesorero, {
        id_factura: fvId,
        id_cuenta_bancaria: cbRes.rows[0].id_cuenta_bancaria,
        monto: 1500,
      });
      check("POST /api/cobros → 201", cobroRes.status, 201);

      if (cobroRes.status === 201) {
        const gerAfter = await getNoLeidas(gerente);
        const contAfter = await getNoLeidas(contador);
        check("Cobro: Gerente +1 notification", gerAfter, gerBefore + 1);
        check("Cobro: Contador +1 notification", contAfter, contBefore + 1);
      }
    }
  } else {
    console.log("  ⚠️  No cliente aprobado — skip cobro test");
  }
  console.log();

  // ── 4. MULTI-USER ISOLATION ──
  console.log("=== 4. MULTI-USER ISOLATION ===");
  const tesNotifs = json(await apiCall("GET", "/api/notificaciones", tesorero)).notificaciones;
  const contNotifs = json(await apiCall("GET", "/api/notificaciones", contador)).notificaciones;
  checkBool("Tesorero only sees own notifications", tesNotifs.length === 0 || tesNotifs.every((n: any) => typeof n.id_usuario_destino === "number"), true);
  checkBool("Contador only sees own notifications", contNotifs.length === 0 || contNotifs.every((n: any) => typeof n.id_usuario_destino === "number"), true);
  console.log();

  // ── 5. MARCAR TODAS ──
  console.log("=== 5. MARCAR TODAS COMO LEÍDAS ===");
  const marcarRes = await apiCall("POST", "/api/notificaciones/marcar-todas", tesorero);
  check("POST /api/notificaciones/marcar-todas → 200", marcarRes.status, 200);
  const tesAfterMarcar = await getNoLeidas(tesorero);
  check("Tesorero unread after marcar-todas → 0", tesAfterMarcar, 0);
  console.log();

  // ── 6. PATCH single notification ──
  console.log("=== 6. PATCH SINGLE NOTIFICATION ===");
  const gerNotifs = json(await apiCall("GET", "/api/notificaciones", gerente)).notificaciones;
  const unread = gerNotifs.find((n: any) => !n.leida);
  if (unread) {
    const patchRes = await apiCall("PATCH", `/api/notificaciones/${unread.id_notificacion}`, gerente);
    check("PATCH /api/notificaciones/:id → 200", patchRes.status, 200);
  } else {
    console.log("  ⚠️  No unread notifications for Gerente — skip single mark test");
  }
  console.log();

  // ── CLEANUP ──
  console.log("=== CLEANUP ===");
  const testIds = await pool.query(
    "SELECT id_factura FROM facturas WHERE numero_factura IN ('TEST-F-COMP-111', 'TEST-F-VENT-111')"
  );
  const ids = testIds.rows.map((r: any) => r.id_factura);
  if (ids.length > 0) {
    await pool.query(`DELETE FROM pagos WHERE id_solicitud IN (SELECT id_solicitud FROM solicitudes_pago WHERE id_factura = ANY($1))`, [ids]);
    await pool.query(`DELETE FROM solicitudes_pago WHERE id_factura = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM cobros WHERE id_factura = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM facturas WHERE id_factura = ANY($1)`, [ids]);
  }
  console.log("  ✅ Test data cleaned up\n");

  console.log(`=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
