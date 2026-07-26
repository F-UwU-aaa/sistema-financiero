"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";

interface Cuenta {
  id_cuenta_bancaria: number;
  nombre_cuenta: string;
  tipo: string;
  numero_cuenta: string | null;
  saldo_actual: number;
}

interface Pago {
  id_pago: number;
  monto: number;
  metodo: string;
  numero_operacion: string | null;
  fecha_pago: string;
  razon_social: string | null;
  numero_factura: string | null;
}

export default function DashboardTesoreroPage() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/tesorero/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!datos) return <div className="p-6 text-red-500">Error al cargar datos</div>;

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Caja y Bancos</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCSV("saldos_cuentas.csv",
              ["Cuenta", "Tipo", "N Cuenta", "Saldo"],
              datos.cuentas.map((c: Cuenta) => [c.nombre_cuenta, c.tipo, c.numero_cuenta || "", c.saldo_actual])
            )}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >CSV</button>
          <button
            onClick={() => exportarPDF("Saldos por Cuenta",
              ["Cuenta", "Tipo", "N Cuenta", "Saldo"],
              datos.cuentas.map((c: Cuenta) => [c.nombre_cuenta, c.tipo, c.numero_cuenta || "", c.saldo_actual])
            )}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >PDF</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Saldo total</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">${datos.saldo_total.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Pagos ejecutados (mes)</div>
          <div className="mt-1 text-2xl font-bold">{datos.pagos_mes.cantidad}</div>
          <div className="text-xs text-gray-400">${datos.pagos_mes.total.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Pagos pendientes</div>
          <div className="mt-1 text-2xl font-bold text-orange-600">{datos.pagos_pendientes.cantidad}</div>
          <div className="text-xs text-gray-400">${datos.pagos_pendientes.total.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-xs text-gray-500">Cobros este mes</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{datos.cobros_mes.cantidad}</div>
          <div className="text-xs text-gray-400">${datos.cobros_mes.total.toLocaleString()}</div>
        </div>
      </div>

      <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">Saldo por Cuenta en Tiempo Real</h2>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Cuenta</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">N Cuenta</th>
              <th className="p-3 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {datos.cuentas.map((c: Cuenta) => (
              <tr key={c.id_cuenta_bancaria} className="border-b">
                <td className="p-3">{c.nombre_cuenta}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    c.tipo === "Banco" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                  }`}>{c.tipo}</span>
                </td>
                <td className="p-3 text-gray-500">{c.numero_cuenta || "-"}</td>
                <td className="p-3 text-right font-medium">${c.saldo_actual.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Ultimos 20 Pagos Ejecutados</h2>
          <div className="flex gap-2">
            <button
              onClick={() => exportarCSV("pagos_ejecutados.csv",
                ["ID", "Monto", "Metodo", "N Operacion", "Fecha", "Proveedor", "Factura"],
                datos.ultimos_pagos.map((p: Pago) => [
                  p.id_pago, p.monto, p.metodo, p.numero_operacion || "",
                  p.fecha_pago, p.razon_social || "", p.numero_factura || ""
                ])
              )}
              className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
            >CSV</button>
            <button
              onClick={() => exportarPDF("Pagos Ejecutados",
                ["ID", "Monto", "Metodo", "N Operacion", "Fecha", "Proveedor", "Factura"],
                datos.ultimos_pagos.map((p: Pago) => [
                  p.id_pago, p.monto, p.metodo, p.numero_operacion || "",
                  p.fecha_pago, p.razon_social || "", p.numero_factura || ""
                ]),
                { orientacion: "landscape" }
              )}
              className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
            >PDF</button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3 text-right">Monto</th>
              <th className="p-3">Metodo</th>
              <th className="p-3">N Operacion</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Proveedor</th>
              <th className="p-3">Factura</th>
            </tr>
          </thead>
          <tbody>
            {datos.ultimos_pagos.length === 0 ? (
              <tr><td colSpan={7} className="p-3 text-center text-gray-400">Sin pagos registrados</td></tr>
            ) : datos.ultimos_pagos.map((p: Pago) => (
              <tr key={p.id_pago} className="border-b">
                <td className="p-3">#{p.id_pago}</td>
                <td className="p-3 text-right font-medium">${p.monto.toLocaleString()}</td>
                <td className="p-3">{p.metodo}</td>
                <td className="p-3 text-gray-500">{p.numero_operacion || "-"}</td>
                <td className="p-3 text-xs">{p.fecha_pago?.split("T")[0]}</td>
                <td className="p-3">{p.razon_social || "-"}</td>
                <td className="p-3 text-gray-500">{p.numero_factura || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
