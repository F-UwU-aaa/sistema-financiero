"use client";

import { useEffect, useState, useCallback } from "react";
import type { CuentaBancaria } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Alert from "@/components/ui/Alert";
import Badge from "@/components/ui/Badge";
import DataTable, { type Column } from "@/components/ui/DataTable";

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

  const columns: Column<CuentaBancaria>[] = [
    { key: "nombre_cuenta", header: "Nombre" },
    { key: "tipo", header: "Tipo" },
    { key: "numero_cuenta", header: "N° Cuenta", render: (r) => r.numero_cuenta || "—" },
    { key: "saldo_actual", header: "Saldo", render: (r) => `$${Number(r.saldo_actual).toLocaleString()}` },
    { key: "activo", header: "Estado", render: (r) => (
      <Badge variant={r.activo ? "success" : "danger"}>{r.activo ? "Activa" : "Inactiva"}</Badge>
    )},
    { key: "acciones", header: "Acciones", render: (r) => (
      <Button variant="ghost" size="sm" onClick={() => abrirEditar(r)}>Editar</Button>
    )},
  ];

  const tipoOptions = [
    { value: "Banco", label: "Banco" },
    { value: "Caja", label: "Caja" },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Cuentas Bancarias / Caja"
        actions={<Button onClick={abrirCrear}>+ Nueva cuenta</Button>}
      />

      <DataTable<CuentaBancaria>
        columns={columns}
        data={cuentas}
        keyExtractor={(c) => c.id_cuenta_bancaria}
        emptyMessage="No hay cuentas registradas"
      />

      <Modal
        open={modal === "crear" || modal === "editar"}
        onClose={() => setModal(null)}
        title={modal === "crear" ? "Nueva cuenta" : "Editar cuenta"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button onClick={guardar}>Guardar</Button>
          </>
        }
      >
        <div className="space-y-3">
          {error && <Alert variant="error">{error}</Alert>}
          <Input
            label="Nombre"
            placeholder="Nombre"
            value={form.nombre_cuenta}
            onChange={e => setForm({ ...form, nombre_cuenta: e.target.value })}
          />
          <Select
            label="Tipo"
            options={tipoOptions}
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value })}
          />
          <Input
            label="Número de cuenta"
            placeholder="Número de cuenta"
            value={form.numero_cuenta}
            onChange={e => setForm({ ...form, numero_cuenta: e.target.value })}
          />
          {modal === "crear" && (
            <Input
              label="Saldo inicial"
              type="number"
              placeholder="Saldo inicial"
              value={form.saldo_inicial}
              onChange={e => setForm({ ...form, saldo_inicial: e.target.value })}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}
