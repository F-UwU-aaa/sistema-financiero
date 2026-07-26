import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import * as http from "http";

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

function check(label: string, actual: number, expected: number, detail?: string) {
  if (actual === expected) {
    console.log(`  ✅ ${label} → ${actual}`);
    passed++;
  } else {
    console.log(`  ❌ ${label} → ${actual} (expected ${expected})${detail ? " — " + detail : ""}`);
    failed++;
  }
}

async function login(correo: string): Promise<string> {
  const res = await apiCall("POST", "/api/auth/login", undefined, { correo, password: "password123" });
  const match = res.setCookie?.match(/session=([^;]+)/);
  if (!match) throw new Error(`Login failed for ${correo}`);
  return `session=${match[1]}`;
}

async function main() {
  const auditor = await login("auditor@empresa.com");
  const gerente = await login("gerente@empresa.com");
  const admin = await login("admin@empresa.com");
  const contador = await login("contador@empresa.com");
  console.log("=== SESSIONS OK ===\n");

  // ── 1. AUDITOR READS FINANCIAL MODULES ──
  console.log("=== 1. AUDITOR READS FINANCIAL MODULES ===");
  const modulos = [
    ["Presupuestos", "/api/presupuestos"],
    ["Facturación", "/api/facturas"],
    ["Cobros", "/api/cobros"],
    ["Pagos", "/api/pagos"],
    ["Cuentas bancarias", "/api/cuentas-bancarias"],
    ["Cuentas contables", "/api/cuentas-contables"],
    ["Periodos", "/api/periodos"],
    ["Proveedores", "/api/proveedores"],
    ["Configuración", "/api/configuracion"],
  ];
  for (const [nombre, url] of modulos) {
    const res = await apiCall("GET", url, auditor);
    check(`Auditor GET ${nombre}`, res.status, 200);
  }

  // ── 2. ADMIN GETS 403 ON AUDITORIA API ──
  console.log("\n=== 2. ADMIN GETS 403 ON AUDITORIA ===");
  const a1 = await apiCall("GET", "/api/auditor/observaciones", admin);
  check("Admin GET /api/auditor/observaciones", a1.status, 403);

  const a2 = await apiCall("GET", "/api/auditor/dashboard", admin);
  check("Admin GET /api/auditor/dashboard", a2.status, 403);

  const a3 = await apiCall("GET", "/api/auditor/informe", admin);
  check("Admin GET /api/auditor/informe", a3.status, 403);

  // Contador also should not access auditoria
  const a4 = await apiCall("GET", "/api/auditor/observaciones", contador);
  check("Contador GET /api/auditor/observaciones", a4.status, 403);

  // ── 3. AUDITOR CREATES OBSERVATION ──
  console.log("\n=== 3. AUDITOR CREATES OBSERVATION ===");
  const c1 = await apiCall("POST", "/api/auditor/observaciones", auditor, {
    modulo_afectado: "Pagos",
    tipo_transaccion: "Transferencia",
    referencia_id: 1,
    motivo: "El pago #1 no tiene comprobante bancario adjunto que justifique la transferencia realizada",
  });
  check("POST observación (Pagos)", c1.status, 201, c1.data);
  const obs1 = c1.status === 201 ? JSON.parse(c1.data).observacion : null;
  const obs1Id = obs1?.id_observacion;

  const c2 = await apiCall("POST", "/api/auditor/observaciones", auditor, {
    modulo_afectado: "usuarios",
    motivo: "Se detectó un usuario con permisos de administrador que no debería tener acceso a módulos financieros",
  });
  check("POST observación (usuarios → triggers admin notification)", c2.status, 201);
  const obs2 = c2.status === 201 ? JSON.parse(c2.data).observacion : null;
  const obs2Id = obs2?.id_observacion;

  // ── 4. NOTIFICATIONS CREATED ──
  console.log("\n=== 4. NOTIFICATIONS CREATED ===");
  const n1 = await apiCall("GET", "/api/notificaciones", gerente);
  check("Gerente has notifications", n1.status, 200);
  if (n1.status === 200) {
    const notifs = JSON.parse(n1.data).notificaciones || [];
    const auditNotifs = notifs.filter((n: any) => n.tipo_evento === "observacion_auditoria");
    check("Gerente has audit notifications", auditNotifs.length >= 1 ? 1 : 0, 1, `${auditNotifs.length} notifications`);
  }

  const n2 = await apiCall("GET", "/api/notificaciones", admin);
  check("Admin has notifications", n2.status, 200);
  if (n2.status === 200) {
    const notifs = JSON.parse(n2.data).notificaciones || [];
    const accessNotifs = notifs.filter((n: any) => n.mensaje.includes("[Acceso/Usuarios]"));
    check("Admin has access-related notification", accessNotifs.length >= 1 ? 1 : 0, 1, `${accessNotifs.length} access notifications`);
  }

  // ── 5. AUDITOR READS OBSERVATIONS ──
  console.log("\n=== 5. AUDITOR READS OBSERVATIONS ===");
  const l1 = await apiCall("GET", "/api/auditor/observaciones", auditor);
  check("GET observaciones", l1.status, 200);
  if (l1.status === 200) {
    const obs = JSON.parse(l1.data).observaciones || [];
    check("Observaciones list not empty", obs.length > 0 ? 1 : 0, 1, `${obs.length} observations`);
  }

  // Filter by module
  const l2 = await apiCall("GET", "/api/auditor/observaciones?modulo=Pagos", auditor);
  check("GET observaciones filtered by Pagos", l2.status, 200);
  if (l2.status === 200) {
    const obs = JSON.parse(l2.data).observaciones || [];
    const allPagos = obs.every((o: any) => o.modulo_afectado === "Pagos");
    check("All filtered observations are Pagos", allPagos ? 1 : 0, 1);
  }

  // ── 6. AUDITOR DASHBOARD ──
  console.log("\n=== 6. AUDITOR DASHBOARD ===");
  const d1 = await apiCall("GET", "/api/auditor/dashboard", auditor);
  check("GET dashboard", d1.status, 200);
  if (d1.status === 200) {
    const d = JSON.parse(d1.data);
    check("Dashboard has total", d.total > 0 ? 1 : 0, 1, `total=${d.total}`);
    check("Dashboard has por_estado", d.por_estado?.length > 0 ? 1 : 0, 1);
    check("Dashboard has recientes", d.recientes?.length > 0 ? 1 : 0, 1);
  }

  // ── 7. AUDITOR INFORME ──
  console.log("\n=== 7. AUDITOR INFORME ===");
  const i1 = await apiCall("GET", "/api/auditor/informe", auditor);
  check("GET informe", i1.status, 200);
  if (i1.status === 200) {
    const inf = JSON.parse(i1.data).informe || [];
    check("Informe has data", inf.length > 0 ? 1 : 0, 1, `${inf.length} rows`);
  }

  const i2 = await apiCall("GET", "/api/auditor/informe?modulo=Pagos", auditor);
  check("GET informe filtered by Pagos", i2.status, 200);

  // ── 8. GERENTE CAN READ + RESPOND ──
  console.log("\n=== 8. GERENTE READS + RESPONDS ===");
  const g1 = await apiCall("GET", "/api/auditor/observaciones", gerente);
  check("Gerente GET observaciones", g1.status, 200);

  if (obs1Id) {
    const g2 = await apiCall("PATCH", `/api/auditor/observaciones/${obs1Id}`, gerente, {
      respuesta_gerente: "Se verificó con el área de Tesorería. El comprobante bancario fue generado correctamente y se encuentra archivado.",
    });
    check("Gerente adds respuesta", g2.status, 200);
  }

  // ── 9. AUDITOR UPDATES STATUS ──
  console.log("\n=== 9. AUDITOR UPDATES STATUS ===");
  if (obs1Id) {
    const s1 = await apiCall("PATCH", `/api/auditor/observaciones/${obs1Id}`, auditor, { estado: "En revisión" });
    check("Auditor: Abierta → En revisión", s1.status, 200);

    const s2 = await apiCall("PATCH", `/api/auditor/observaciones/${obs1Id}`, auditor, { estado: "Cerrada" });
    check("Auditor: En revisión → Cerrada", s2.status, 200);

    // Can't modify closed
    const s3 = await apiCall("PATCH", `/api/auditor/observaciones/${obs1Id}`, auditor, { estado: "En revisión" });
    check("Can't modify closed observation", s3.status, 409);
  }

  // ── 10. AUDITOR GET SINGLE OBSERVATION ──
  console.log("\n=== 10. AUDITOR GET SINGLE OBSERVATION ===");
  if (obs2Id) {
    const g = await apiCall("GET", `/api/auditor/observaciones/${obs2Id}`, auditor);
    check("GET single observation", g.status, 200);
    if (g.status === 200) {
      const o = JSON.parse(g.data).observacion;
      check("Observation has nombre_auditor", o.nombre_auditor ? 1 : 0, 1, o.nombre_auditor);
    }
  }

  // ── 11. VALIDATION ──
  console.log("\n=== 11. VALIDATION ===");
  const v1 = await apiCall("POST", "/api/auditor/observaciones", auditor, { modulo_afectado: "Pagos" });
  check("Missing motivo → 400", v1.status, 400);

  const v2 = await apiCall("POST", "/api/auditor/observaciones", auditor, { motivo: "test" });
  check("Missing modulo → 400", v2.status, 400);

  // ── SUMMARY ──
  console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
