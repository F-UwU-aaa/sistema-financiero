"use client";

import { useEffect, useState, useCallback } from "react";
import type { Factura, Cobro, CuentaBancaria } from "@/types";

export default function CobrosPage() {
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<Factura | null>(null);
  const [formCuenta, setFormCuenta] = useState("");
  const [formMonto, setFormMonto] = useState("");

  const cargarFacturas = useCallback(async () => {
    const res = await fetch("/api/facturas?tipo=Venta&estado=Pendiente");
    const data = await res.json();
    setFacturasPendientes(data.facturas || []);
  }, []);

  const cargarCobros = useCallback(async () => {
    const res = await fetch("/api/cobros");
    const data = await res.json();
    setCobros(data.cobros || []);
  }, []);

  useEffect(() => { cargarFacturas(); cargarCobros(); }, [cargarFacturas, cargarCobros]);

  useEffect(() => {
    fetch("/api/cuentas-bancarias").then(r => r.json()).then(d => {
      setCuentas((d.cuentas || []).filter((c: CuentaBancaria) => c.activo));
    });
  }, []);

  function abrirRegistrar(f: Factura) {
    setSeleccionada(f); setFormCuenta(""); setFormMonto(f.monto); setModal("registrar");
  }

  async function registrarCobro() {
    if (!seleccionada || !formCuenta || !formMonto) return;
    const res = await fetch("/api/cobros", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_factura: seleccionada.id_factura,
        id_cuenta_bancaria: Number(formCuenta),
        monto: Number(formMonto),
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarFacturas();
    cargarCobros();
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cobros</h1>

      <h2 className="mb-3 text-lg font-semibold text-gray-800">Facturas de Venta pendientes</h2>
      <table className="mb-8 w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3"># Factura</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Monto</th>
            <th className="p-3">Emisión</th>
            <th className="p-3">Vencimiento</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturasPendientes.map(f => (
            <tr key={f.id_factura} className="border-b">
              <td className="p-3 font-medium">{f.numero_factura}</td>
              <td className="p-3">{f.nombre_cliente || "—"}</td>
              <td className="p-3">${Number(f.monto).toLocaleString()}</td>
              <td className="p-3">{f.fecha_emision}</td>
              <td className="p-3">{f.fecha_vencimiento || "—"}</td>
              <td className="p-3">
                <button onClick={() => abrirRegistrar(f)} className="text-green-600 hover:underline text-xs">Registrar cobro</button>
              </td>
            </tr>
          ))}
          {facturasPendientes.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-gray-500">No hay facturas de venta pendientes de cobro</td></tr>
          )}
        </tbody>
      </table>

      <h2 className="mb-3 text-lg font-semibold text-gray-800">Historial de cobros</h2>
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3"># Factura</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Cuenta destino</th>
            <th className="p-3">Monto</th>
            <th className="p-3">Fecha cobro</th>
          </tr>
        </thead>
        <tbody>
          {cobros.map(c => (
            <tr key={c.id_cobro} className="border-b">
              <td className="p-3">{c.numero_factura || "—"}</td>
              <td className="p-3">{c.nombre_cliente || "—"}</td>
              <td className="p-3">{c.nombre_cuenta_bancaria || "—"}</td>
              <td className="p-3">${Number(c.monto).toLocaleString()}</td>
              <td className="p-3">{new Date(c.fecha_cobro).toLocaleDateString()}</td>
            </tr>
          ))}
          {cobros.length === 0 && (
            <tr><td colSpan={5} className="p-6 text-center text-gray-500">No hay cobros registrados</td></tr>
          )}
        </tbody>
      </table>

      {modal === "registrar" && seleccionada && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Registrar cobro</h2>
            <p className="mb-1 text-sm text-gray-600">Factura: {seleccionada.numero_factura}</p>
            <p className="mb-1 text-sm text-gray-600">Cliente: {seleccionada.nombre_cliente || "—"}</p>
            <p className="mb-3 text-sm text-gray-600">Monto factura: ${Number(seleccionada.monto).toLocaleString()}</p>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Cuenta destino</label>
              <select value={formCuenta} onChange={e => setFormCuenta(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Seleccionar cuenta</option>
                {cuentas.map(c => (
                  <option key={c.id_cuenta_bancaria} value={c.id_cuenta_bancaria}>
                    {c.nombre_cuenta} — Saldo: ${Number(c.saldo_actual).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Monto a cobrar</label>
              <input type="number" value={formMonto} onChange={e => setFormMonto(e.target.value)} min="0" step="0.01" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={registrarCobro}
                disabled={!formCuenta || !formMonto || Number(formMonto) <= 0}
                className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                Registrar cobro
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
