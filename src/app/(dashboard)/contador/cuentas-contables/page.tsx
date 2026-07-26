"use client";

import { useEffect, useState, useCallback } from "react";
import type { CuentaContable } from "@/types";

const TIPOS = ["Activo", "Pasivo", "Patrimonio", "Ingreso", "Gasto"];

export default function CuentasContablesPage() {
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [cuentaActual, setCuentaActual] = useState<CuentaContable | null>(null);
  const [form, setForm] = useState({ codigo_cuenta: "", nombre_cuenta: "", tipo_cuenta: "", id_cuenta_padre: "" });
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/cuentas-contables");
    const data = await res.json();
    setCuentas(data.cuentas || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirCrear() {
    setForm({ codigo_cuenta: "", nombre_cuenta: "", tipo_cuenta: "", id_cuenta_padre: "" });
    setCuentaActual(null); setError(""); setModal("crear");
  }

  function abrirEditar(c: CuentaContable) {
    setForm({
      codigo_cuenta: c.codigo_cuenta, nombre_cuenta: c.nombre_cuenta,
      tipo_cuenta: c.tipo_cuenta, id_cuenta_padre: c.id_cuenta_padre ? String(c.id_cuenta_padre) : "",
    });
    setCuentaActual(c); setError(""); setModal("editar");
  }

  async function guardar() {
    setError("");
    const payload = {
      codigo_cuenta: form.codigo_cuenta, nombre_cuenta: form.nombre_cuenta,
      tipo_cuenta: form.tipo_cuenta, id_cuenta_padre: form.id_cuenta_padre ? Number(form.id_cuenta_padre) : null,
    };
    const url = cuentaActual ? `/api/cuentas-contables/${cuentaActual.id_cuenta}` : "/api/cuentas-contables";
    const method = cuentaActual ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setModal(null); cargar();
  }

  function nombreCuenta(id: number | null) {
    if (!id) return "—";
    return cuentas.find(c => c.id_cuenta === id)?.nombre_cuenta || `#${id}`;
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Plan de Cuentas</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Nueva cuenta</button>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Código</th><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">Padre</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {cuentas.map(c => (
            <tr key={c.id_cuenta} className="border-b">
              <td className="p-3 font-mono text-xs">{c.codigo_cuenta}</td>
              <td className="p-3">{c.nombre_cuenta}</td>
              <td className="p-3">{c.tipo_cuenta}</td>
              <td className="p-3">{nombreCuenta(c.id_cuenta_padre)}</td>
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
            <input placeholder="Código" value={form.codigo_cuenta} onChange={e => setForm({ ...form, codigo_cuenta: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Nombre" value={form.nombre_cuenta} onChange={e => setForm({ ...form, nombre_cuenta: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={form.tipo_cuenta} onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Tipo de cuenta</option>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={form.id_cuenta_padre} onChange={e => setForm({ ...form, id_cuenta_padre: e.target.value })} className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Sin cuenta padre</option>
              {cuentas.filter(c => c.activo).map(c => <option key={c.id_cuenta} value={c.id_cuenta}>{c.codigo_cuenta} — {c.nombre_cuenta}</option>)}
            </select>
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
