"use client";

import { useEffect, useState, useCallback } from "react";
import type { Proveedor, Cliente } from "@/types";

export default function AprobacionEntidadesPage() {
  const [pestaña, setPestaña] = useState<"proveedores" | "clientes">("proveedores");

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Aprobación de Proveedores y Clientes</h1>

      <div className="mb-6 flex gap-2 border-b">
        <button onClick={() => setPestaña("proveedores")} className={`px-4 py-2 text-sm ${pestaña === "proveedores" ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
          Proveedores
        </button>
        <button onClick={() => setPestaña("clientes")} className={`px-4 py-2 text-sm ${pestaña === "clientes" ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-gray-600 hover:text-gray-900"}`}>
          Clientes
        </button>
      </div>

      {pestaña === "proveedores" ? <TablaProveedores /> : <TablaClientes />}
    </div>
  );
}

function TablaProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<Proveedor | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    const params = filtroEstado ? `?estado=${filtroEstado}` : "";
    const res = await fetch(`/api/proveedores${params}`);
    const data = await res.json();
    setProveedores(data.proveedores || []);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirRechazar(p: Proveedor) {
    setSeleccionado(p); setMotivo(""); setModal("rechazar");
  }

  async function aprobar(id: number) {
    const res = await fetch(`/api/proveedores/${id}/aprobar`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    if (res.ok) cargar();
  }

  async function rechazar() {
    if (!seleccionado || !motivo.trim()) return;
    const res = await fetch(`/api/proveedores/${seleccionado.id_proveedor}/aprobar`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivo }),
    });
    if (res.ok) { setModal(null); cargar(); }
  }

  return (
    <>
      <div className="mb-4">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="Pendiente">Pendientes</option>
          <option value="Aprobado">Aprobados</option>
          <option value="Rechazado">Rechazados</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Razón Social</th><th className="p-3">NIT</th><th className="p-3">Monto contrato</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {proveedores.map(p => (
            <tr key={p.id_proveedor} className="border-b">
              <td className="p-3">{p.razon_social}</td>
              <td className="p-3">{p.nit}</td>
              <td className="p-3">{p.monto_contrato ? `$${Number(p.monto_contrato).toLocaleString()}` : "—"}</td>
              <td className={`p-3 font-medium ${p.estado === "Pendiente" ? "text-yellow-600" : p.estado === "Aprobado" ? "text-green-600" : "text-red-600"}`}>{p.estado}</td>
              <td className="p-3">
                {p.estado === "Pendiente" && (
                  <>
                    <button onClick={() => aprobar(p.id_proveedor)} className="mr-3 text-green-600 hover:underline text-xs">Aprobar</button>
                    <button onClick={() => abrirRechazar(p)} className="text-red-600 hover:underline text-xs">Rechazar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "rechazar" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Rechazar proveedor</h2>
            <p className="mb-3 text-sm text-gray-600">{seleccionado?.razon_social}</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Motivo del rechazo (requerido)" className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={rechazar} disabled={!motivo.trim()} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TablaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionado, setSeleccionado] = useState<Cliente | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    const params = filtroEstado ? `?estado=${filtroEstado}` : "";
    const res = await fetch(`/api/clientes${params}`);
    const data = await res.json();
    setClientes(data.clientes || []);
  }, [filtroEstado]);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirRechazar(c: Cliente) {
    setSeleccionado(c); setMotivo(""); setModal("rechazar");
  }

  async function aprobar(id: number) {
    const res = await fetch(`/api/clientes/${id}/aprobar`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    if (res.ok) cargar();
  }

  async function rechazar() {
    if (!seleccionado || !motivo.trim()) return;
    const res = await fetch(`/api/clientes/${seleccionado.id_cliente}/aprobar`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivo }),
    });
    if (res.ok) { setModal(null); cargar(); }
  }

  return (
    <>
      <div className="mb-4">
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="Pendiente">Pendientes</option>
          <option value="Aprobado">Aprobados</option>
          <option value="Rechazado">Rechazados</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Razón Social</th><th className="p-3">NIT</th><th className="p-3">Monto relación</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {clientes.map(c => (
            <tr key={c.id_cliente} className="border-b">
              <td className="p-3">{c.razon_social}</td>
              <td className="p-3">{c.nit || "—"}</td>
              <td className="p-3">{c.monto_relacion ? `$${Number(c.monto_relacion).toLocaleString()}` : "—"}</td>
              <td className={`p-3 font-medium ${c.estado === "Pendiente" ? "text-yellow-600" : c.estado === "Aprobado" ? "text-green-600" : "text-red-600"}`}>{c.estado}</td>
              <td className="p-3">
                {c.estado === "Pendiente" && (
                  <>
                    <button onClick={() => aprobar(c.id_cliente)} className="mr-3 text-green-600 hover:underline text-xs">Aprobar</button>
                    <button onClick={() => abrirRechazar(c)} className="text-red-600 hover:underline text-xs">Rechazar</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "rechazar" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Rechazar cliente</h2>
            <p className="mb-3 text-sm text-gray-600">{seleccionado?.razon_social}</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Motivo del rechazo (requerido)" className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={rechazar} disabled={!motivo.trim()} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
