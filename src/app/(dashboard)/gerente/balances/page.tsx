"use client";

import { useEffect, useState, useCallback } from "react";
import type { PeriodoFiscalCompleto, BalanceResultado } from "@/types";

export default function BalancesGerentePage() {
  const [periodos, setPeriodos] = useState<PeriodoFiscalCompleto[]>([]);
  const [balance, setBalance] = useState<BalanceResultado | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [motivoReapertura, setMotivoReapertura] = useState("");

  const cargarPeriodos = useCallback(async () => {
    const res = await fetch("/api/periodos");
    const data = await res.json();
    setPeriodos(data.periodos || []);
  }, []);

  useEffect(() => { cargarPeriodos(); }, [cargarPeriodos]);

  async function verBalance(id_periodo: number) {
    setCargando(true);
    setPeriodoSeleccionado(id_periodo);
    const res = await fetch(`/api/balances?id_periodo=${id_periodo}`);
    const data = await res.json();
    setBalance(data.error ? null : data);
    setCargando(false);
  }

  async function aprobarBalance() {
    if (!periodoSeleccionado) return;
    const res = await fetch(`/api/balances/${periodoSeleccionado}/aprobar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    setBalance(null);
    setPeriodoSeleccionado(null);
    cargarPeriodos();
  }

  async function rechazarBalance() {
    if (!periodoSeleccionado) return;
    const res = await fetch(`/api/balances/${periodoSeleccionado}/aprobar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar" }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    setBalance(null);
    setPeriodoSeleccionado(null);
    cargarPeriodos();
  }

  async function reabrirPeriodo() {
    if (!periodoSeleccionado || !motivoReapertura.trim()) return;
    const res = await fetch("/api/balances/reabrir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_periodo: periodoSeleccionado, motivo: motivoReapertura }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    setBalance(null);
    setPeriodoSeleccionado(null);
    setMotivoReapertura("");
    cargarPeriodos();
  }

  function fmt(n: number) { return `$${n.toLocaleString()}`; }

  const coloresEstado: Record<string, string> = {
    Abierto: "text-green-600",
    Cerrado: "text-red-600",
  };

  const periodoActual = periodos.find(p => p.id_periodo === periodoSeleccionado);

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Balances y Cierre de Período</h1>

      <table className="mb-6 w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">Período</th>
            <th className="p-3">Desde</th>
            <th className="p-3">Hasta</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Balance</th>
            <th className="p-3">Aprobado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {periodos.map(p => (
            <tr key={p.id_periodo} className="border-b">
              <td className="p-3 font-medium">{p.nombre_periodo}</td>
              <td className="p-3">{p.fecha_inicio}</td>
              <td className="p-3">{p.fecha_fin}</td>
              <td className={`p-3 font-medium ${coloresEstado[p.estado] || ""}`}>{p.estado}</td>
              <td className="p-3">{p.balance_generado ? "✓" : "—"}</td>
              <td className="p-3">{p.balance_aprobado ? "✓" : "—"}</td>
              <td className="p-3">
                <button onClick={() => verBalance(p.id_periodo)} className="text-blue-600 hover:underline text-xs">
                  Ver balance
                </button>
                {p.estado === "Cerrado" && (
                  <button onClick={() => { setPeriodoSeleccionado(p.id_periodo); setModal("reabrir"); setMotivoReapertura(""); }} className="ml-3 text-orange-600 hover:underline text-xs">
                    Reabrir
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {cargando && <p className="text-gray-500">Cargando balances...</p>}

      {balance && !cargando && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Balance de {balance.periodo.nombre_periodo}
          </h2>

          <h3 className="mb-2 text-md font-semibold text-gray-800">Estado de Resultados</h3>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Concepto</th><th className="p-2">Monto</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2">Ingresos</td><td className="p-2 text-green-600">{fmt(balance.estado_resultados.ingresos)}</td></tr>
              <tr className="border-b"><td className="p-2">Gastos</td><td className="p-2 text-red-600">{fmt(balance.estado_resultados.gastos)}</td></tr>
              <tr className="border-b bg-gray-50 font-bold"><td className="p-2">Resultado Neto</td><td className={`p-2 ${balance.estado_resultados.resultado_neto >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(balance.estado_resultados.resultado_neto)}</td></tr>
            </tbody>
          </table>

          <h3 className="mb-2 text-md font-semibold text-gray-800">Balance General</h3>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Rubro</th><th className="p-2">Detalle</th><th className="p-2">Monto</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2 font-medium" rowSpan={2}>Activo</td><td className="p-2">Cuentas bancarias</td><td className="p-2">{fmt(balance.balance_general.activo.cuentas_bancarias)}</td></tr>
              <tr className="border-b"><td className="p-2">Cuentas por cobrar</td><td className="p-2">{fmt(balance.balance_general.activo.cuentas_por_cobrar)}</td></tr>
              <tr className="border-b bg-gray-50 font-medium"><td className="p-2"></td><td className="p-2">Total Activo</td><td className="p-2">{fmt(balance.balance_general.activo.total)}</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Pasivo</td><td className="p-2">Cuentas por pagar</td><td className="p-2">{fmt(balance.balance_general.pasivo.cuentas_por_pagar)}</td></tr>
              <tr className="border-b bg-gray-50 font-medium"><td className="p-2"></td><td className="p-2">Total Pasivo</td><td className="p-2">{fmt(balance.balance_general.pasivo.total)}</td></tr>
              <tr className="border-b bg-blue-50 font-bold"><td className="p-2"></td><td className="p-2">Patrimonio</td><td className="p-2">{fmt(balance.balance_general.patrimonio)}</td></tr>
            </tbody>
          </table>

          <h3 className="mb-2 text-md font-semibold text-gray-800">Ejecución Presupuestaria</h3>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Área</th><th className="p-2">Aprobado</th><th className="p-2">Ejecutado</th><th className="p-2">%</th></tr>
            </thead>
            <tbody>
              {balance.ejecucion_presupuestaria.por_area.map((a) => (
                <tr key={a.nombre_area} className="border-b">
                  <td className="p-2">{a.nombre_area}</td>
                  <td className="p-2">{fmt(a.aprobado)}</td>
                  <td className="p-2">{fmt(a.ejecutado)}</td>
                  <td className="p-2">{a.aprobado > 0 ? ((a.ejecutado / a.aprobado) * 100).toFixed(1) : "0"}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {periodoActual && periodoActual.estado === "Abierto" && (
            <div className="flex justify-end gap-3 mt-4">
              {periodoActual.balance_generado && !periodoActual.balance_aprobado && (
                <>
                  <button onClick={() => setModal("rechazar")} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">Rechazar</button>
                  <button onClick={() => setModal("aprobar")} className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">Aprobar balance</button>
                </>
              )}
              {periodoActual.balance_aprobado && (
                <span className="rounded-md bg-green-50 px-4 py-2 text-sm text-green-700 border border-green-200">Balance aprobado — listo para cierre</span>
              )}
              {!periodoActual.balance_generado && (
                <span className="text-sm text-gray-500">Esperando que el Contador genere el balance...</span>
              )}
            </div>
          )}
        </div>
      )}

      {modal === "aprobar" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Aprobar balance</h2>
            <p className="mb-4 text-sm text-gray-600">¿Está seguro de aprobar el balance del período {periodoActual?.nombre_periodo}?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={aprobarBalance} className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">Aprobar</button>
            </div>
          </div>
        </div>
      )}

      {modal === "rechazar" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Rechazar balance</h2>
            <p className="mb-4 text-sm text-gray-600">El balance será rechazado y el Contador deberá regenerarlo.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={rechazarBalance} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {modal === "reabrir" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Reabrir período</h2>
            <p className="mb-3 text-sm text-gray-600">Período: {periodoActual?.nombre_periodo}</p>
            <textarea
              value={motivoReapertura}
              onChange={(e) => setMotivoReapertura(e.target.value)}
              rows={3}
              placeholder="Motivo de reapertura (requerido)"
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={reabrirPeriodo} disabled={!motivoReapertura.trim()} className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50">Reabrir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
