"use client";

import { useEffect, useState, useCallback } from "react";
import type { Proveedor, Cliente } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Modal from "@/components/ui/Modal";

export default function AprobacionEntidadesPage() {
  const [pestaña, setPestaña] = useState<"proveedores" | "clientes">("proveedores");

  return (
    <div className="p-6">
      <PageHeader title="Aprobación de Proveedores y Clientes" />

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

  const columns: Column<Proveedor>[] = [
    { key: "razon_social", header: "Razón Social" },
    { key: "nit", header: "NIT" },
    { key: "monto_contrato", header: "Monto contrato", align: "right", render: (r) => r.monto_contrato ? `$${Number(r.monto_contrato).toLocaleString()}` : "—" },
    { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: "acciones", header: "Acciones", align: "center", render: (r) => r.estado === "Pendiente" ? (
      <div className="flex items-center justify-center gap-2">
        <Button variant="success" size="sm" onClick={() => aprobar(r.id_proveedor)}>Aprobar</Button>
        <Button variant="danger" size="sm" onClick={() => abrirRechazar(r)}>Rechazar</Button>
      </div>
    ) : null },
  ];

  return (
    <>
      <div className="mb-4 w-48">
        <Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          placeholder="Todos"
          options={[
            { value: "Pendiente", label: "Pendientes" },
            { value: "Aprobado", label: "Aprobados" },
            { value: "Rechazado", label: "Rechazados" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={proveedores}
        keyExtractor={(r) => r.id_proveedor}
        emptyMessage="No hay proveedores registrados"
      />

      <Modal
        open={modal === "rechazar"}
        onClose={() => setModal(null)}
        title="Rechazar proveedor"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={rechazar} disabled={!motivo.trim()}>Rechazar</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">{seleccionado?.razon_social}</p>
        <label className="mb-1 block text-sm font-medium text-text">Motivo del rechazo (requerido)</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          placeholder="Motivo del rechazo"
        />
      </Modal>
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

  const columns: Column<Cliente>[] = [
    { key: "razon_social", header: "Razón Social" },
    { key: "nit", header: "NIT", render: (r) => r.nit || "—" },
    { key: "monto_relacion", header: "Monto relación", align: "right", render: (r) => r.monto_relacion ? `$${Number(r.monto_relacion).toLocaleString()}` : "—" },
    { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: "acciones", header: "Acciones", align: "center", render: (r) => r.estado === "Pendiente" ? (
      <div className="flex items-center justify-center gap-2">
        <Button variant="success" size="sm" onClick={() => aprobar(r.id_cliente)}>Aprobar</Button>
        <Button variant="danger" size="sm" onClick={() => abrirRechazar(r)}>Rechazar</Button>
      </div>
    ) : null },
  ];

  return (
    <>
      <div className="mb-4 w-48">
        <Select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          placeholder="Todos"
          options={[
            { value: "Pendiente", label: "Pendientes" },
            { value: "Aprobado", label: "Aprobados" },
            { value: "Rechazado", label: "Rechazados" },
          ]}
        />
      </div>

      <DataTable
        columns={columns}
        data={clientes}
        keyExtractor={(r) => r.id_cliente}
        emptyMessage="No hay clientes registrados"
      />

      <Modal
        open={modal === "rechazar"}
        onClose={() => setModal(null)}
        title="Rechazar cliente"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={rechazar} disabled={!motivo.trim()}>Rechazar</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">{seleccionado?.razon_social}</p>
        <label className="mb-1 block text-sm font-medium text-text">Motivo del rechazo (requerido)</label>
        <textarea
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          placeholder="Motivo del rechazo"
        />
      </Modal>
    </>
  );
}
