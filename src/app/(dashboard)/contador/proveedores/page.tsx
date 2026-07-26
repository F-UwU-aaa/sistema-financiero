"use client";

import { useEffect, useState, useCallback } from "react";
import type { Proveedor } from "@/types";
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

  const columns: Column<Proveedor>[] = [
    { key: "razon_social", header: "Razón Social" },
    { key: "nit", header: "NIT" },
    { key: "contacto", header: "Contacto", render: (row) => row.contacto || "—" },
    { key: "monto_contrato", header: "Monto contrato", render: (row) => row.monto_contrato ? `$${Number(row.monto_contrato).toLocaleString()}` : "—" },
    { key: "estado", header: "Estado", render: (row) => <EstadoBadge estado={row.estado} /> },
    { key: "id_proveedor", header: "Acciones", render: (row) => (
      (row.estado === "Pendiente" || row.estado === "Rechazado") ? (
        <Button variant="ghost" size="sm" onClick={() => abrirEditar(row)}>Editar</Button>
      ) : null
    )},
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Proveedores"
        actions={<Button variant="primary" size="sm" onClick={abrirCrear}>+ Nuevo proveedor</Button>}
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
        <DataTable columns={columns} data={proveedores} keyExtractor={(p) => p.id_proveedor} emptyMessage="No hay proveedores registrados" />
      </Card>

      <Modal
        open={modal === "crear" || modal === "editar"}
        onClose={() => setModal(null)}
        title={modal === "crear" ? "Nuevo proveedor" : "Editar proveedor"}
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
          <Input label="NIT *" value={form.nit} onChange={e => setForm({ ...form, nit: e.target.value })} placeholder="NIT" />
          <Input label="Contacto" value={form.contacto} onChange={e => setForm({ ...form, contacto: e.target.value })} placeholder="Contacto" />
          <Input label="Monto contrato" type="number" value={form.monto_contrato} onChange={e => setForm({ ...form, monto_contrato: e.target.value })} placeholder="Monto contrato" />
        </div>
        <div className="mt-3">
          <label className="mb-1 block text-sm font-medium text-gray-700">Condiciones de pago</label>
          <textarea placeholder="Condiciones de pago" value={form.condiciones_pago} onChange={e => setForm({ ...form, condiciones_pago: e.target.value })} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" rows={2} />
        </div>
        <div className="mt-3">
          <Input label="Datos cuenta de pago" value={form.datos_cuenta_pago} onChange={e => setForm({ ...form, datos_cuenta_pago: e.target.value })} placeholder="Datos cuenta de pago" />
        </div>
      </Modal>
    </div>
  );
}
