"use client";

import { useEffect, useState, useCallback } from "react";
import type { Cliente } from "@/types";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [clienteActual, setClienteActual] = useState<Cliente | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ razon_social: "", nit: "", contacto: "", datos_facturacion: "", monto_relacion: "" });

  const cargar = useCallback(async () => {
    const params = filtroEstado ? `?estado=${filtroEstado}` : "";
    const res = await fetch(`/api/clientes${params}`);
    const data = await res.json();
    setClientes(data.clientes || []);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirCrear() {
    setForm({ razon_social: "", nit: "", contacto: "", datos_facturacion: "", monto_relacion: "" });
    setClienteActual(null); setError(""); setModal("crear");
  }

  function abrirEditar(c: Cliente) {
    setForm({
      razon_social: c.razon_social, nit: c.nit || "", contacto: c.contacto || "",
      datos_facturacion: c.datos_facturacion || "", monto_relacion: c.monto_relacion || "",
    });
    setClienteActual(c); setError(""); setModal("editar");
  }

  async function guardar() {
    setError("");
    const payload = {
      razon_social: form.razon_social, nit: form.nit || null, contacto: form.contacto || null,
      datos_facturacion: form.datos_facturacion || null,
      monto_relacion: form.monto_relacion ? Number(form.monto_relacion) : null,
    };
    const url = clienteActual ? `/api/clientes/${clienteActual.id_cliente}` : "/api/clientes";
    const method = clienteActual ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setModal(null); cargar();
  }

  const colores: Record<string, string> = { Pendiente: "text-yellow-600", Aprobado: "text-green-600", Rechazado: "text-red-600" };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">+ Nuevo cliente</button>
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
          <tr><th className="p-3">Razón Social</th><th className="p-3">NIT</th><th className="p-3">Contacto</th><th className="p-3">Monto relación</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {clientes.map(c => (
            <tr key={c.id_cliente} className="border-b">
              <td className="p-3">{c.razon_social}</td>
              <td className="p-3">{c.nit || "—"}</td>
              <td className="p-3">{c.contacto || "—"}</td>
              <td className="p-3">{c.monto_relacion ? `$${Number(c.monto_relacion).toLocaleString()}` : "—"}</td>
              <td className={`p-3 font-medium ${colores[c.estado] || ""}`}>{c.estado}</td>
              <td className="p-3">
                {(c.estado === "Pendiente" || c.estado === "Rechazado") && (
                  <button onClick={() => abrirEditar(c)} className="text-blue-600 hover:underline text-xs">Editar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">{modal === "crear" ? "Nuevo cliente" : "Editar cliente"}</h2>
            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Razón social *" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="NIT" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
              <input placeholder="Monto relación comercial" type="number" value={form.monto_relacion} onChange={e => setForm({ ...form, monto_relacion: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <textarea placeholder="Datos de facturación" value={form.datos_facturacion} onChange={e => setForm({ ...form, datos_facturacion: e.target.value })} className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} />
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
