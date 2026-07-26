"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";

interface AreaEjecucion {
  nombre_area: string;
  aprobado: number;
  propuesto: number;
  ejecutado: number;
}

export default function DashboardGerentePage() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/gerente/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!datos) return <div className="p-6 text-red-500">Error al cargar datos</div>;

  const er = datos.estado_resultados;
  const bg = datos.balance_general;
  const kpi = datos.kpis;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Financiero Ejecutivo</h1>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const headers = ["Concepto", "Monto"];
              const rows = [
                ["Ingresos totales", er.ingresos],
                ["Egresos totales", er.gastos],
                ["Resultado neto", er.resultado_neto],
                ["", ""],
                ["Activo - Cuentas bancarias", bg.activo.cuentas_bancarias],
                ["Activo - Cuentas por cobrar", bg.activo.cuentas_por_cobrar],
                ["Activo total", bg.activo.total],
                ["Pasivo - Cuentas por pagar", bg.pasivo.cuentas_por_pagar],
                ["Patrimonio", bg.patrimonio],
              ];
              exportarCSV("dashboard_gerente.csv", headers, rows);
            }}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            CSV
          </button>
          <button
            onClick={() => {
              const headers = ["Concepto", "Monto"];
              const rows = [
                ["Ingresos totales", er.ingresos],
                ["Egresos totales", er.gastos],
                ["Resultado neto", er.resultado_neto],
                ["", ""],
                ["Activo - Cuentas bancarias", bg.activo.cuentas_bancarias],
                ["Activo - Cuentas por cobrar", bg.activo.cuentas_por_cobrar],
                ["Activo total", bg.activo.total],
                ["Pasivo - Cuentas por pagar", bg.pasivo.cuentas_por_pagar],
                ["Patrimonio", bg.patrimonio],
              ];
              exportarPDF("Dashboard Financiero Ejecutivo", headers, rows);
            }}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            PDF
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Resultado neto</div>
          <div className={`mt-1 text-xl font-bold ${er.resultado_neto >= 0 ? "text-green-600" : "text-red-600"}`}>
            ${er.resultado_neto.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Flujo de caja</div>
          <div className="mt-1 text-xl font-bold text-blue-600">${kpi.flujo_caja.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Solicitudes pendientes</div>
          <div className="mt-1 text-xl font-bold text-orange-600">{kpi.solicitudes_pendientes}</div>
          <div className="text-xs text-gray-400">${kpi.monto_pendiente.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Proveedores pendientes</div>
          <div className="mt-1 text-xl font-bold text-purple-600">{kpi.proveedores_pendientes}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Clientes pendientes</div>
          <div className="mt-1 text-xl font-bold text-indigo-600">{kpi.clientes_pendientes}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Facturas por vencer (7d)</div>
          <div className="mt-1 text-xl font-bold text-red-600">{kpi.facturas_por_vencer}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Estado de Resultados */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Estado de Resultados</h2>
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b"><td className="p-2 text-gray-600">Ingresos</td><td className="p-2 text-right font-medium text-green-600">${er.ingresos.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 text-gray-600">Egresos</td><td className="p-2 text-right font-medium text-red-600">${er.gastos.toLocaleString()}</td></tr>
              <tr><td className="p-2 font-semibold">Resultado Neto</td>
                <td className={`p-2 text-right font-bold ${er.resultado_neto >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${er.resultado_neto.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Balance General */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Balance General</h2>
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b"><td className="p-2 text-gray-600">Cuentas bancarias</td><td className="p-2 text-right">${bg.activo.cuentas_bancarias.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 text-gray-600">Cuentas por cobrar</td><td className="p-2 text-right">${bg.activo.cuentas_por_cobrar.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Total Activo</td><td className="p-2 text-right font-medium">${bg.activo.total.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 text-gray-600">Cuentas por pagar</td><td className="p-2 text-right text-red-600">${bg.pasivo.cuentas_por_pagar.toLocaleString()}</td></tr>
              <tr><td className="p-2 font-semibold">Patrimonio</td><td className="p-2 text-right font-bold">${bg.patrimonio.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Ejecución Presupuestaria por Área */}
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ejecución Presupuestaria por Área</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportarCSV("ejecucion_areas.csv", ["Área", "Propuesto", "Aprobado", "Ejecutado"],
                datos.ejecucion_presupuestaria.map((e: AreaEjecucion) => [e.nombre_area, e.propuesto, e.aprobado, e.ejecutado])
              )}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >CSV</button>
            <button
              onClick={() => exportarPDF("Ejecución Presupuestaria por Área", ["Área", "Propuesto", "Aprobado", "Ejecutado"],
                datos.ejecucion_presupuestaria.map((e: AreaEjecucion) => [e.nombre_area, e.propuesto, e.aprobado, e.ejecutado]),
                { orientacion: "landscape" }
              )}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >PDF</button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Área</th>
              <th className="p-3 text-right">Propuesto</th>
              <th className="p-3 text-right">Aprobado</th>
              <th className="p-3 text-right">Ejecutado</th>
              <th className="p-3 text-right">% Ejecución</th>
            </tr>
          </thead>
          <tbody>
            {datos.ejecucion_presupuestaria.length === 0 ? (
              <tr><td colSpan={5} className="p-3 text-center text-gray-400">Sin datos</td></tr>
            ) : datos.ejecucion_presupuestaria.map((e: AreaEjecucion) => (
              <tr key={e.nombre_area} className="border-b">
                <td className="p-3">{e.nombre_area}</td>
                <td className="p-3 text-right">${e.propuesto.toLocaleString()}</td>
                <td className="p-3 text-right">${e.aprobado.toLocaleString()}</td>
                <td className="p-3 text-right">${e.ejecutado.toLocaleString()}</td>
                <td className="p-3 text-right">
                  {e.aprobado > 0 ? `${((e.ejecutado / e.aprobado) * 100).toFixed(1)}%` : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
