"use client";

import { useEffect, useState, useCallback } from "react";
import type { SolicitudPago, CuentaBancaria } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import DataTable, { type Column } from "@/components/ui/DataTable";

export default function PagosTesoreroPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<SolicitudPago | null>(null);

  const [formCuenta, setFormCuenta] = useState("");
  const [formMetodo, setFormMetodo] = useState("Transferencia");
  const [formOperacion, setFormOperacion] = useState("");
  const [observacion, setObservacion] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/solicitudes-pago?estado=Aprobada");
    const data = await res.json();
    setSolicitudes(data.solicitudes || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch("/api/cuentas-bancarias").then(r => r.json()).then(d => {
      setCuentas((d.cuentas || []).filter((c: CuentaBancaria) => c.activo));
    });
  }, []);

  function abrirEjecutar(s: SolicitudPago) {
    setSeleccionada(s); setFormCuenta(""); setFormMetodo("Transferencia"); setFormOperacion(""); setModal("ejecutar");
  }

  function abrirDevolver(s: SolicitudPago) {
    setSeleccionada(s); setObservacion(""); setModal("devolver");
  }

  async function ejecutar() {
    if (!seleccionada || !formCuenta || !formOperacion.trim()) return;
    const res = await fetch("/api/pagos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_solicitud: seleccionada.id_solicitud,
        id_cuenta_bancaria: Number(formCuenta),
        metodo: formMetodo,
        numero_operacion: formOperacion.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargar();
  }

  async function devolver() {
    if (!seleccionada || !observacion.trim()) return;
    const res = await fetch(`/api/pagos/${seleccionada.id_solicitud}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "devolver", observacion }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargar();
  }

  function saldoCuenta(id: number) {
    const c = cuentas.find(cc => cc.id_cuenta_bancaria === id);
    return c ? Number(c.saldo_actual) : 0;
  }

  const columns: Column<SolicitudPago>[] = [
    { key: "id_solicitud", header: "# Solicitud" },
    { key: "numero_factura", header: "# Factura", render: (r) => r.numero_factura || "—" },
    { key: "razon_social_proveedor", header: "Proveedor", render: (r) => r.razon_social_proveedor || "—" },
    { key: "monto", header: "Monto", render: (r) => `$${Number(r.monto).toLocaleString()}` },
    { key: "tipo_aprobacion", header: "Aprobación", render: (r) => (
      <Badge variant={r.tipo_aprobacion === "Automatica" ? "success" : "info"}>
        {r.tipo_aprobacion === "Automatica" ? "Automática" : "Manual"}
      </Badge>
    )},
    { key: "acciones", header: "Acciones", render: (r) => (
      <div className="flex gap-2">
        <Button variant="success" size="sm" onClick={() => abrirEjecutar(r)}>Ejecutar</Button>
        <Button variant="ghost" size="sm" onClick={() => abrirDevolver(r)}>Devolver</Button>
      </div>
    )},
  ];

  const cuentaOptions = cuentas.map(c => ({
    value: c.id_cuenta_bancaria,
    label: `${c.nombre_cuenta} — Saldo: $${Number(c.saldo_actual).toLocaleString()}`,
  }));

  const metodoOptions = [
    { value: "Transferencia", label: "Transferencia" },
    { value: "Cheque", label: "Cheque" },
    { value: "Efectivo", label: "Efectivo" },
  ];

  const ejecutarDisabled = !formCuenta || !formOperacion.trim() || (formCuenta ? saldoCuenta(Number(formCuenta)) < Number(seleccionada?.monto) : true);

  return (
    <div className="p-6">
      <PageHeader
        title="Cola de Pagos"
        description="Solicitudes aprobadas (automática o manualmente) listas para ejecución."
      />

      <DataTable<SolicitudPago>
        columns={columns}
        data={solicitudes}
        keyExtractor={(s) => s.id_solicitud}
        emptyMessage="No hay pagos pendientes de ejecución"
      />

      <Modal
        open={modal === "ejecutar" && !!seleccionada}
        onClose={() => setModal(null)}
        title="Ejecutar pago"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="success" onClick={ejecutar} disabled={ejecutarDisabled}>Ejecutar pago</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Solicitud #{seleccionada?.id_solicitud} — ${Number(seleccionada?.monto || 0).toLocaleString()}</p>
          <p className="text-sm text-text-secondary">Proveedor: {seleccionada?.razon_social_proveedor || "—"}</p>
          <Select
            label="Cuenta de origen"
            options={cuentaOptions}
            value={formCuenta}
            onChange={e => setFormCuenta(e.target.value)}
            placeholder="Seleccionar cuenta"
          />
          {formCuenta && saldoCuenta(Number(formCuenta)) < Number(seleccionada?.monto) && (
            <Alert variant="error">
              Saldo insuficiente: disponible ${saldoCuenta(Number(formCuenta)).toLocaleString()}, requerido ${Number(seleccionada?.monto).toLocaleString()}
            </Alert>
          )}
          <Select
            label="Método de pago"
            options={metodoOptions}
            value={formMetodo}
            onChange={e => setFormMetodo(e.target.value)}
          />
          <Input
            label="Nº de operación / comprobante"
            value={formOperacion}
            onChange={e => setFormOperacion(e.target.value)}
            placeholder="Ej: TRF-001234"
          />
        </div>
      </Modal>

      <Modal
        open={modal === "devolver" && !!seleccionada}
        onClose={() => setModal(null)}
        title="Devolver solicitud"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="ghost" onClick={devolver} disabled={!observacion.trim()}>Devolver</Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">Solicitud #{seleccionada?.id_solicitud} — ${Number(seleccionada?.monto || 0).toLocaleString()}</p>
          <p className="text-sm text-text-secondary">Proveedor: {seleccionada?.razon_social_proveedor || "—"}</p>
          <Alert variant="warning">La solicitud será devuelta al Contador con una observación.</Alert>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text">Observación (requerida)</label>
            <textarea
              value={observacion}
              onChange={e => setObservacion(e.target.value)}
              rows={3}
              placeholder="ej: datos bancarios incorrectos"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
