"use client";

import { useEffect, useState, useCallback } from "react";
import type { Cliente } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import EstadoBadge from "@/components/ui/EstadoBadge";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

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

  const columns: Column<Cliente>[] = [
    { key: "razon_social", header: "Razón Social" },
    { key: "nit", header: "NIT", render: (row) => row.nit || "—" },
    { key: "contacto", header: "Contacto", render: (row) => row.contacto || "—" },
    { key: "monto_relacion", header: "Monto relación", render: (row) => row.monto_relacion ? `$${Number(row.monto_relacion).toLocaleString()}` : "—" },
    { key: "estado", header: "Estado", render: (row) => <EstadoBadge estado={row.estado} /> },
    { key: "id_cliente", header: "Acciones", render: (row) => (
      (row.estado === "Pendiente" || row.estado === "Rechazado") ? (
        <Button variant="ghost" size="sm" onClick={() => abrirEditar(row)}>Editar</Button>
      ) : null
    )},
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Clientes"
        actions={<Button variant="primary" size="sm" onClick={abrirCrear}>+ Nuevo cliente</Button>}
      />

      <div className="mb-4">
        <Select
          options={[
            { value: "", label: "Todos los estados" },
            { value: "Pendiente", label: "Pendiente" },
            { value: "Aprobado", label: "Aprobado" },
            { value: "Rechazado", label: "Rechazado" },
          ]}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        />
      </div>

      <Card>
        <DataTable columns={columns} data={clientes} keyExtractor={(c) => c.id_cliente} emptyMessage="No hay clientes registrados" />
      </Card>

      <Modal
        open={modal === "crear" || modal === "editar"}
        onClose={() => setModal(null)}
        title={modal === "crear" ? "Nuevo cliente" : "Editar cliente"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={guardar}>Guardar</Button>
          </>
        }
      >
        {error && <Alert variant="error">{error}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Razón social *" value={form.razon_social} onChange={e => setForm({ ...form, razon_social: e.target.value })} placeholder="Razón social" />
          <Input label="NIT" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="NIT" />
          <Input label="Contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Contacto" />
          <Input label="Monto relación comercial" type="number" value={form.monto_relacion} onChange={e => setForm({ ...form, monto_relacion: e.target.value })} placeholder="Monto relación" />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Datos de facturación</label>
          <textarea placeholder="Datos de facturación" value={form.datos_facturacion} onChange={e => setForm({ ...form, datos_facturacion: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} />
        </div>
      </Modal>
    </div>
  );
}
