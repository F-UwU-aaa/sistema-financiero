"use client";

import { useEffect, useState, useCallback } from "react";
import type { CuentaContable } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import DataTable from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";

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

  const columns: Column<CuentaContable>[] = [
    { key: "codigo_cuenta", header: "Código", render: (row) => <span className="font-mono text-xs">{row.codigo_cuenta}</span> },
    { key: "nombre_cuenta", header: "Nombre" },
    { key: "tipo_cuenta", header: "Tipo" },
    { key: "id_cuenta_padre", header: "Padre", render: (row) => nombreCuenta(row.id_cuenta_padre) },
    { key: "activo", header: "Estado", render: (row) => <Badge variant={row.activo ? "success" : "danger"}>{row.activo ? "Activa" : "Inactiva"}</Badge> },
    { key: "id_cuenta", header: "Acciones", render: (row) => (
      <Button variant="ghost" size="sm" onClick={() => abrirEditar(row)}>Editar</Button>
    )},
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Plan de Cuentas"
        actions={<Button variant="primary" size="sm" onClick={abrirCrear}>+ Nueva cuenta</Button>}
      />

      <Card>
        <DataTable columns={columns} data={cuentas} keyExtractor={(c) => c.id_cuenta} emptyMessage="No hay cuentas registradas" />
      </Card>

      <Modal
        open={modal === "crear" || modal === "editar"}
        onClose={() => setModal(null)}
        title={modal === "crear" ? "Nueva cuenta" : "Editar cuenta"}
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" size="sm" onClick={guardar}>Guardar</Button>
          </>
        }
      >
        {error && <Alert variant="error">{error}</Alert>}
        <div className="mb-3">
          <Input label="Código" value={form.codigo_cuenta} onChange={e => setForm({ ...form, codigo_cuenta: e.target.value })} placeholder="Código" />
        </div>
        <div className="mb-3">
          <Input label="Nombre" value={form.nombre_cuenta} onChange={e => setForm({ ...form, nombre_cuenta: e.target.value })} placeholder="Nombre" />
        </div>
        <div className="mb-3">
          <Select
            label="Tipo de cuenta"
            options={[
              { value: "", label: "Tipo de cuenta" },
              ...TIPOS.map(t => ({ value: t, label: t })),
            ]}
            value={form.tipo_cuenta}
            onChange={e => setForm({ ...form, tipo_cuenta: e.target.value })}
          />
        </div>
        <div className="mb-4">
          <Select
            label="Cuenta padre"
            options={[
              { value: "", label: "Sin cuenta padre" },
              ...cuentas.filter(c => c.activo).map(c => ({ value: String(c.id_cuenta), label: `${c.codigo_cuenta} — ${c.nombre_cuenta}` })),
            ]}
            value={form.id_cuenta_padre}
            onChange={e => setForm({ ...form, id_cuenta_padre: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
