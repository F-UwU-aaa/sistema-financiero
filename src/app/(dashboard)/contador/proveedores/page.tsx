"use client";

import { useEffect, useState, useCallback } from "react";
import type { Proveedor } from "@/types";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [proveedorActual, setProveedorActual] = useState<Proveedor | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ razon_social: "", nit: "", contacto: "", condiciones_pago: "", datos_cuenta_pago: "", monto_contrato: "" });

  const cargar = useCallback(async () => {
    const params = filtroEstado ? `?estado=${filtroEstado}` : "";
    const res = await fetch(`/api/proveedores${params}`);
    const data = await res.json();
    setProveedores(data.proveedores || []);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirCrear() {
    setForm({ razon_social: "", nit: "", contacto: "", condiciones_pago: "", datos_cuenta_pago: "", monto_contrato: "" });
    setProveedorActual(null); setError(""); setModal("crear");
  }

  function abrirEditar(p: Proveedor) {
    setForm({
      razon_social: p.razon_social, nit: p.nit, contacto: p.contacto || "",
      condiciones_pago: p.condiciones_pago || "", datos_cuenta_pago: p.datos_cuenta_pago || "",
      monto_contrato: p.monto_contrato || "",
    });
    setProveedorActual(p); setError(""); setModal("editar");
  }

  async function guardar() {
    setError("");
    const payload = {
      razon_social: form.razon_social, nit: form.nit, contacto: form.contacto || null,
      condiciones_pago: form.condiciones_pago || null, datos_cuenta_pago: form.datos_cuenta_pago || null,
      monto_contrato: form.monto_contrato ? Number(form.monto_contrato) : null,
    };
    const url = proveedorActual ? `/api/proveedores/${proveedorActual.id_proveedor}` : "/api/proveedores";
    const method = proveedorActual ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setModal(null); cargar();
  }

  const colores: Record<string, string> = { Pendiente: "text-yellow-600", Aprobado: "text-green-600", Rechazado: "text-red-600" };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Nuevo proveedor</button>
      </div>

      <div className="mb-4 flex gap-4">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Razón Social</th><th className="p-3">NIT</th><th className="p-3">Contacto</th><th className="p-3">Monto contrato</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {proveedores.map(p => (
            <tr key={p.id_proveedor} className="border-b">
              <td className="p-3">{p.razon_social}</td>
              <td className="p-3">{p.nit}</td>
              <td className="p-3">{p.contacto || "—"}</td>
              <td className="p-3">{p.monto_contrato ? `$${Number(p.monto_contrato).toLocaleString()}` : "—"}</td>
              <td className={`p-3 font-medium ${colores[p.estado] || ""}`}>{p.estado}</td>
              <td className="p-3">
                {(p.estado === "Pendiente" || p.estado === "Rechazado") && (
                  <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">{modal === "crear" ? "Nuevo proveedor" : "Editar proveedor"}</h2>
            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Razón social *" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="NIT *" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Monto contrato" type="number" value={form.monto_contrato} onChange={e => setForm({ ...form, monto_contrato: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Condiciones de pago" value={form.condiciones_pago} onChange={e => setForm({ ...form, condiciones_pago: e.target.value })} className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} />
            <input placeholder="Datos cuenta de pago" value={form.datos_cuenta_pago} onChange={e => setForm({ ...form, datos_cuenta_pago: e.target.value })} className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={guardar} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
