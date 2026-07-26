"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";

interface CategoriaEjecucion {
  nombre_categoria: string;
  tipo: string;
  asignado: number;
  ejecutado: number;
}

interface FlujoCaja {
  nombre_cuenta: string;
  saldo: number;
  pagos_mes: number;
  cobros_mes: number;
}

export default function DashboardContadorPage() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/contador/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!datos) return <div className="p-6 text-red-500">Error al cargar datos</div>;

  const flujoTotal = datos.flujo_caja.reduce((s: number, f: FlujoCaja) => s + f.saldo, 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Contable</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCSV("dashboard_contador.csv", ["Concepto", "Monto"], [
              ["Cuentas por pagar", datos.cuentas_por_pagar],
              ["Cuentas por cobrar", datos.cuentas_por_cobrar],
              ["Flujo de caja total", flujoTotal],
              ["Pagos este mes", datos.pagos_mes.total],
              ["Cobros este mes", datos.cobros_mes.total],
            ])}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >CSV</button>
          <button
            onClick={() => exportarPDF("Dashboard Contable", ["Concepto", "Monto"], [
              ["Cuentas por pagar", datos.cuentas_por_pagar],
              ["Cuentas por cobrar", datos.cuentas_por_cobrar],
              ["Flujo de caja total", flujoTotal],
              ["Pagos este mes", datos.pagos_mes.total],
              ["Cobros este mes", datos.cobros_mes.total],
            ])}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >PDF</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Cuentas por pagar</div>
          <div className="mt-1 text-xl font-bold text-red-600">${datos.cuentas_por_pagar.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Cuentas por cobrar</div>
          <div className="mt-1 text-xl font-bold text-green-600">${datos.cuentas_por_cobrar.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Flujo de caja total</div>
          <div className="mt-1 text-xl font-bold text-blue-600">${flujoTotal.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Pagos este mes</div>
          <div className="mt-1 text-xl font-bold">{datos.pagos_mes.cantidad}</div>
          <div className="text-xs text-gray-400">${datos.pagos_mes.total.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Cobros este mes</div>
          <div className="mt-1 text-xl font-bold">{datos.cobros_mes.cantidad}</div>
          <div className="text-xs text-gray-400">${datos.cobros_mes.total.toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Flujo de caja por cuenta */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Flujo de Caja por Cuenta</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Cuenta</th>
                <th className="p-3 text-right">Saldo</th>
                <th className="p-3 text-right">Pagos (mes)</th>
                <th className="p-3 text-right">Cobros (mes)</th>
              </tr>
            </thead>
            <tbody>
              {datos.flujo_caja.map((f: FlujoCaja) => (
                <tr key={f.nombre_cuenta} className="border-b">
                  <td className="p-3">{f.nombre_cuenta}</td>
                  <td className="p-3 text-right font-medium">${f.saldo.toLocaleString()}</td>
                  <td className="p-3 text-right text-red-600">-${f.pagos_mes.toLocaleString()}</td>
                  <td className="p-3 text-right text-green-600">+${f.cobros_mes.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="p-3">Total</td>
                <td className="p-3 text-right">${flujoTotal.toLocaleString()}</td>
                <td className="p-3 text-right text-red-600">
                  -${datos.flujo_caja.reduce((s: number, f: FlujoCaja) => s + f.pagos_mes, 0).toLocaleString()}
                </td>
                <td className="p-3 text-right text-green-600">
                  +${datos.flujo_caja.reduce((s: number, f: FlujoCaja) => s + f.cobros_mes, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ejecución por categoría */}
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ejecución por Categoría</h2>
            <div className="flex gap-2">
              <button
                onClick={() => exportarCSV("ejecucion_categorias.csv",
                  ["Categoría", "Tipo", "Asignado", "Ejecutado"],
                  datos.ejecucion_presupuestaria.map((e: CategoriaEjecucion) =>
                    [e.nombre_categoria, e.tipo, e.asignado, e.ejecutado]
                  )
                )}
                className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
              >CSV</button>
              <button
                onClick={() => exportarPDF("Ejecución por Categoría",
                  ["Categoría", "Tipo", "Asignado", "Ejecutado"],
                  datos.ejecucion_presupuestaria.map((e: CategoriaEjecucion) =>
                    [e.nombre_categoria, e.tipo, e.asignado, e.ejecutado]
                  ), { orientacion: "landscape" }
                )}
                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
              >PDF</button>
            </div>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Categoría</th>
                <th className="p-3">Tipo</th>
                <th className="p-3 text-right">Asignado</th>
                <th className="p-3 text-right">Ejecutado</th>
              </tr>
            </thead>
            <tbody>
              {datos.ejecucion_presupuestaria.map((e: CategoriaEjecucion) => (
                <tr key={e.nombre_categoria} className="border-b">
                  <td className="p-3">{e.nombre_categoria}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      e.tipo === "Ingreso" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>{e.tipo}</span>
                  </td>
                  <td className="p-3 text-right">${e.asignado.toLocaleString()}</td>
                  <td className="p-3 text-right">${e.ejecutado.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Solicitudes y Facturas por estado */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Solicitudes de Pago por Estado</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-3">Estado</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody>
              {datos.solicitudes_por_estado.map((s: any) => (
                <tr key={s.estado} className="border-b">
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                      s.estado === "Pendiente" ? "bg-yellow-100 text-yellow-800" :
                      s.estado === "Aprobada" ? "bg-green-100 text-green-800" :
                      s.estado === "Ejecutada" ? "bg-blue-100 text-blue-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>{s.estado}</span>
                  </td>
                  <td className="p-3 text-right">{s.cantidad}</td>
                  <td className="p-3 text-right">${s.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Facturas por Tipo/Estado</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-3">Tipo</th><th className="p-3">Estado</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Total</th></tr>
            </thead>
            <tbody>
              {datos.facturas_por_estado.map((f: any, i: number) => (
                <tr key={i} className="border-b">
                  <td className="p-3">{f.tipo}</td>
                  <td className="p-3">{f.estado}</td>
                  <td className="p-3 text-right">{f.cantidad}</td>
                  <td className="p-3 text-right">${f.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        <strong>Nota:</strong> Los reportes de libro diario, libro mayor y balance de comprobación no están disponibles porque la tabla de asientos contables no tiene datos reales. Pendiente de implementar con el módulo de contabilidad general.
      </div>
    </div>
  );
}
