"use client";

import { useEffect, useState, useCallback } from "react";
import type { Factura, Cobro, CuentaBancaria } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

export default function CobrosPage() {
  const [facturasPendientes, setFacturasPendientes] = useState<Factura[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<Factura | null>(null);
  const [formCuenta, setFormCuenta] = useState("");
  const [formMonto, setFormMonto] = useState("");

  const cargarFacturas = useCallback(async () => {
    const res = await fetch("/api/facturas?tipo=Venta&estado=Pendiente");
    const data = await res.json();
    setFacturasPendientes(data.facturas || []);
  }, []);

  const cargarCobros = useCallback(async () => {
    const res = await fetch("/api/cobros");
    const data = await res.json();
    setCobros(data.cobros || []);
  }, []);

  useEffect(() => { cargarFacturas(); cargarCobros(); }, [cargarFacturas, cargarCobros]);

  useEffect(() => {
    fetch("/api/cuentas-bancarias").then(r => r.json()).then(d => {
      setCuentas((d.cuentas || []).filter((c: CuentaBancaria) => c.activo));
    });
  }, []);

  function abrirRegistrar(f: Factura) {
    setSeleccionada(f); setFormCuenta(""); setFormMonto(f.monto); setModal("registrar");
  }

  async function registrarCobro() {
    if (!seleccionada || !formCuenta || !formMonto) return;
    const res = await fetch("/api/cobros", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_factura: seleccionada.id_factura,
        id_cuenta_bancaria: Number(formCuenta),
        monto: Number(formMonto),
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarFacturas();
    cargarCobros();
  }

  const facturaColumns: Column<Factura>[] = [
    { key: "numero_factura", header: "# Factura", render: (r) => <span className="font-medium">{r.numero_factura}</span> },
    { key: "nombre_cliente", header: "Cliente", render: (r) => r.nombre_cliente || "—" },
    { key: "monto", header: "Monto", render: (r) => `$${Number(r.monto).toLocaleString()}` },
    { key: "fecha_emision", header: "Emisión" },
    { key: "fecha_vencimiento", header: "Vencimiento", render: (r) => r.fecha_vencimiento || "—" },
    { key: "acciones", header: "Acciones", render: (r) => (
      <Button variant="success" size="sm" onClick={() => abrirRegistrar(r)}>Registrar cobro</Button>
    )},
  ];

  const cobroColumns: Column<Cobro>[] = [
    { key: "numero_factura", header: "# Factura", render: (r) => r.numero_factura || "—" },
    { key: "nombre_cliente", header: "Cliente", render: (r) => r.nombre_cliente || "—" },
    { key: "nombre_cuenta_bancaria", header: "Cuenta destino", render: (r) => r.nombre_cuenta_bancaria || "—" },
    { key: "monto", header: "Monto", render: (r) => `$${Number(r.monto).toLocaleString()}` },
    { key: "fecha_cobro", header: "Fecha cobro", render: (r) => new Date(r.fecha_cobro).toLocaleDateString() },
  ];

  const cuentaOptions = cuentas.map(c => ({
    value: c.id_cuenta_bancaria,
    label: `${c.nombre_cuenta} — Saldo: $${Number(c.saldo_actual).toLocaleString()}`,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Cobros" />

      <h2 className="mb-3 text-lg font-semibold text-text">Facturas de Venta pendientes</h2>
      <DataTable<Factura>
        columns={facturaColumns}
        data={facturasPendientes}
        keyExtractor={(f) => f.id_factura}
        emptyMessage="No hay facturas de venta pendientes de cobro"
        className="mb-8"
      />

      <h2 className="mb-3 text-lg font-semibold text-text">Historial de cobros</h2>
      <DataTable<Cobro>
        columns={cobroColumns}
        data={cobros}
        keyExtractor={(c) => c.id_cobro}
        emptyMessage="No hay cobros registrados"
      />

      <Modal
        open={modal === "registrar" && !!seleccionada}
        onClose={() => setModal(null)}
        title="Registrar cobro"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="success"
              onClick={registrarCobro}
              disabled={!formCuenta || !formMonto || Number(formMonto) <= 0}
            >Registrar cobro</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Factura: {seleccionada?.numero_factura}</p>
          <p className="text-sm text-text-secondary">Cliente: {seleccionada?.nombre_cliente || "—"}</p>
          <p className="text-sm text-text-secondary">Monto factura: ${Number(seleccionada?.monto || 0).toLocaleString()}</p>
          <Select
            label="Cuenta destino"
            options={cuentaOptions}
            value={formCuenta}
            onChange={e => setFormCuenta(e.target.value)}
            placeholder="Seleccionar cuenta"
          />
          <Input
            label="Monto a cobrar"
            type="number"
            value={formMonto}
            onChange={e => setFormMonto(e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
      </Modal>
    </div>
  );
}
