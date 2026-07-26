"use client";

import { useEffect, useState, useCallback } from "react";
import type { PeriodoFiscalCompleto, BalanceResultado } from "@/types";

export default function BalancesPage() {
  const [periodos, setPeriodos] = useState<PeriodoFiscalCompleto[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [balance, setBalance] = useState<BalanceResultado | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarPeriodos = useCallback(async () => {
    const res = await fetch("/api/periodos");
    const data = await res.json();
    setPeriodos(data.periodos || []);
  }, []);

  useEffect(() => { cargarPeriodos(); }, [cargarPeriodos]);

  async function generarBalance() {
    if (!periodoSeleccionado) return;
    setCargando(true);
    const res = await fetch(`/api/balances?id_periodo=${periodoSeleccionado}`);
    const data = await res.json();
    setBalance(data.error ? null : data);
    setCargando(false);
  }

  async function marcarGenerado() {
    if (!periodoSeleccionado) return;
    const res = await fetch("/api/balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_periodo: Number(periodoSeleccionado) }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setBalance(null);
    setPeriodoSeleccionado("");
    cargarPeriodos();
  }

  async function cerrarPeriodo() {
    if (!periodoSeleccionado) return;
    if (!confirm("¿Está seguro de cerrar este período? Esta acción bloquea todos los movimientos.")) return;
    const res = await fetch("/api/balances/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_periodo: Number(periodoSeleccionado) }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setBalance(null);
    setPeriodoSeleccionado("");
    cargarPeriodos();
  }

  function fmt(n: number) { return `$${n.toLocaleString()}`; }

  const periodoActual = periodos.find(p => p.id_periodo === Number(periodoSeleccionado));

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Balances</h1>
      </div>

      <div className="mb-4 flex gap-4 items-end">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Período fiscal</label>
          <select value={periodoSeleccionado} onChange={(e) => { setPeriodoSeleccionado(e.target.value); setBalance(null); }} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
            <option value="">Seleccionar período</option>
            {periodos.map(p => <option key={p.id_periodo} value={p.id_periodo}>{p.nombre_periodo} ({p.estado})</option>)}
          </select>
        </div>
        <button onClick={generarBalance} disabled={!periodoSeleccionado || cargando} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
          {cargando ? "Calculando..." : "Generar balances"}
        </button>
        {periodoActual && periodoActual.estado === "Abierto" && (
          <>
            <button onClick={marcarGenerado} disabled={!balance} className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50">
              Marcar como generado
            </button>
            {periodoActual.balance_aprobado && (
              <button onClick={cerrarPeriodo} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700">
                Cerrar período
              </button>
            )}
          </>
        )}
      </div>

      {periodoActual && (
        <div className="mb-4 flex gap-4 text-xs text-gray-600">
          <span>Estado: <strong>{periodoActual.estado}</strong></span>
          <span>Balance generado: <strong>{periodoActual.balance_generado ? "Sí" : "No"}</strong></span>
          <span>Balance aprobado: <strong>{periodoActual.balance_aprobado ? "Sí" : "No"}</strong></span>
        </div>
      )}

      {cargando && <p className="text-gray-500">Calculando balances...</p>}

      {balance && !cargando && (
        <div className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Estado de Resultados — {balance.periodo.nombre_periodo}</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr><th className="p-2">Concepto</th><th className="p-2">Monto</th></tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-2">Ingresos (cobros de ventas)</td><td className="p-2 text-green-600">{fmt(balance.estado_resultados.ingresos)}</td></tr>
                <tr className="border-b"><td className="p-2">Gastos (pagos ejecutados)</td><td className="p-2 text-red-600">{fmt(balance.estado_resultados.gastos)}</td></tr>
                <tr className="border-b bg-gray-50 font-bold"><td className="p-2">Resultado Neto</td><td className={`p-2 ${balance.estado_resultados.resultado_neto >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(balance.estado_resultados.resultado_neto)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Balance General — {balance.periodo.nombre_periodo}</h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr><th className="p-2">Rubro</th><th className="p-2">Detalle</th><th className="p-2">Monto</th></tr>
              </thead>
              <tbody>
                <tr className="border-b"><td className="p-2 font-medium" rowSpan={2}>Activo</td><td className="p-2">Cuentas bancarias (histórico al cierre)</td><td className="p-2">{fmt(balance.balance_general.activo.cuentas_bancarias)}</td></tr>
                <tr className="border-b"><td className="p-2">Cuentas por cobrar</td><td className="p-2">{fmt(balance.balance_general.activo.cuentas_por_cobrar)}</td></tr>
                <tr className="border-b bg-gray-50 font-medium"><td className="p-2"></td><td className="p-2">Total Activo</td><td className="p-2">{fmt(balance.balance_general.activo.total)}</td></tr>
                <tr className="border-b"><td className="p-2 font-medium">Pasivo</td><td className="p-2">Cuentas por pagar</td><td className="p-2">{fmt(balance.balance_general.pasivo.cuentas_por_pagar)}</td></tr>
                <tr className="border-b bg-gray-50 font-medium"><td className="p-2"></td><td className="p-2">Total Pasivo</td><td className="p-2">{fmt(balance.balance_general.pasivo.total)}</td></tr>
                <tr className="border-b bg-blue-50 font-bold"><td className="p-2"></td><td className="p-2">Patrimonio (Activo − Pasivo)</td><td className="p-2">{fmt(balance.balance_general.patrimonio)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900">Ejecución Presupuestaria</h2>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Por área</h3>
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
                {balance.ejecucion_presupuestaria.por_area.length === 0 && (
                  <tr><td colSpan={4} className="p-2 text-gray-500">No hay presupuestos aprobados para este período</td></tr>
                )}
              </tbody>
            </table>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Por categoría</h3>
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50">
                <tr><th className="p-2">Categoría</th><th className="p-2">Tipo</th><th className="p-2">Asignado</th><th className="p-2">Ejecutado</th><th className="p-2">%</th></tr>
              </thead>
              <tbody>
                {balance.ejecucion_presupuestaria.por_categoria.map((c) => (
                  <tr key={c.nombre_categoria} className="border-b">
                    <td className="p-2">{c.nombre_categoria}</td>
                    <td className="p-2">{c.tipo}</td>
                    <td className="p-2">{fmt(c.asignado)}</td>
                    <td className="p-2">{fmt(c.ejecutado)}</td>
                    <td className="p-2">{c.asignado > 0 ? ((c.ejecutado / c.asignado) * 100).toFixed(1) : "0"}%</td>
                  </tr>
                ))}
                {balance.ejecucion_presupuestaria.por_categoria.length === 0 && (
                  <tr><td colSpan={5} className="p-2 text-gray-500">No hay partidas presupuestarias para este período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
