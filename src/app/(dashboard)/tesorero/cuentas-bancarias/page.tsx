"use client";

import { useEffect, useState, useCallback } from "react";
import type { CuentaBancaria } from "@/types";

export default function CuentasBancariasPage() {
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [cuentaActual, setCuentaActual] = useState<CuentaBancaria | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ nombre_cuenta: "", tipo: "Banco", numero_cuenta: "", saldo_inicial: "" });

  const cargar = useCallback(async () => {
    const res = await fetch("/api/cuentas-bancarias");
    const data = await res.json();
    setCuentas(data.cuentas || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirCrear() {
    setForm({ nombre_cuenta: "", tipo: "Banco", numero_cuenta: "", saldo_inicial: "" });
    setCuentaActual(null); setError(""); setModal("crear");
  }

  function abrirEditar(c: CuentaBancaria) {
    setForm({ nombre_cuenta: c.nombre_cuenta, tipo: c.tipo, numero_cuenta: c.numero_cuenta || "", saldo_inicial: "" });
    setCuentaActual(c); setError(""); setModal("editar");
  }

  async function guardar() {
    setError("");
    const payload: Record<string, unknown> = {
      nombre_cuenta: form.nombre_cuenta, tipo: form.tipo,
      numero_cuenta: form.numero_cuenta || null,
    };
    if (modal === "crear") {
      payload.saldo_inicial = form.saldo_inicial ? Number(form.saldo_inicial) : 0;
    }
    const url = cuentaActual ? `/api/cuentas-bancarias/${cuentaActual.id_cuenta_bancaria}` : "/api/cuentas-bancarias";
    const method = cuentaActual ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setModal(null); cargar();
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Cuentas Bancarias / Caja</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Nueva cuenta</button>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">N° Cuenta</th><th className="p-3">Saldo</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {cuentas.map(c => (
            <tr key={c.id_cuenta_bancaria} className="border-b">
              <td className="p-3">{c.nombre_cuenta}</td>
              <td className="p-3">{c.tipo}</td>
              <td className="p-3">{c.numero_cuenta || "—"}</td>
              <td className="p-3">${Number(c.saldo_actual).toLocaleString()}</td>
              <td className="p-3"><span className={c.activo ? "text-green-600" : "text-red-600"}>{c.activo ? "Activa" : "Inactiva"}</span></td>
              <td className="p-3"><button onClick={() => abrirEditar(c)} className="text-blue-600 hover:underline text-xs">Editar</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">{modal === "crear" ? "Nueva cuenta" : "Editar cuenta"}</h2>
            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <input placeholder="Nombre" value={form.nombre_cuenta} onChange={e => setForm({ ...form, nombre_cuenta: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="Banco">Banco</option>
              <option value="Caja">Caja</option>
            </select>
            <input placeholder="Número de cuenta" value={form.numero_cuenta} onChange={e => setForm({ ...form, numero_cuenta: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            {modal === "crear" && (
              <input placeholder="Saldo inicial" type="number" value={form.saldo_inicial} onChange={e => setForm({ ...form, saldo_inicial: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={guardar} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
