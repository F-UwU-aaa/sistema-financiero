"use client";

import { useEffect, useState, useCallback } from "react";
import type { Factura, SolicitudPago, Proveedor, Cliente, Categoria, PartidaPresupuestaria } from "@/types";
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

interface PartidaConSaldo extends PartidaPresupuestaria {
  saldo_disponible: number;
}

export default function FacturacionPage() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const [modal, setModal] = useState<string | null>(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [partidas, setPartidas] = useState<PartidaConSaldo[]>([]);

  const [formTipo, setFormTipo] = useState<"Compra" | "Venta">("Compra");
  const [formProveedor, setFormProveedor] = useState("");
  const [formCliente, setFormCliente] = useState("");
  const [formNumero, setFormNumero] = useState("");
  const [formMonto, setFormMonto] = useState("");
  const [formFechaEmision, setFormFechaEmision] = useState("");
  const [formFechaVencimiento, setFormFechaVencimiento] = useState("");
  const [formPartida, setFormPartida] = useState("");

  const [motivoAnulacion, setMotivoAnulacion] = useState("");
  const [resultadoSolicitud, setResultadoSolicitud] = useState<string | null>(null);

  const cargarFacturas = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroTipo) params.set("tipo", filtroTipo);
    if (filtroEstado) params.set("estado", filtroEstado);
    const res = await fetch(`/api/facturas?${params.toString()}`);
    const data = await res.json();
    setFacturas(data.facturas || []);
  }, [filtroTipo, filtroEstado]);

  useEffect(() => { cargarFacturas(); }, [cargarFacturas]);

  useEffect(() => {
    fetch("/api/proveedores?estado=Aprobado").then(r => r.json()).then(d => setProveedores(d.proveedores || []));
    fetch("/api/clientes?estado=Aprobado").then(r => r.json()).then(d => setClientes(d.clientes || []));
    fetch("/api/categorias").then(r => r.json()).then(d => setCategorias(d.categorias || []));
  }, []);

  useEffect(() => {
    if (modal === "crear" && formTipo === "Compra") {
      fetch("/api/solicitudes-pago").catch(() => {});
    }
  }, [modal, formTipo]);

  function abrirCrear() {
    setFormTipo("Compra"); setFormProveedor(""); setFormCliente("");
    setFormNumero(""); setFormMonto(""); setFormFechaEmision("");
    setFormFechaVencimiento(""); setFormPartida(""); setPartidas([]);
    setModal("crear");
  }

  async function cargarPartidas() {
    const res = await fetch("/api/presupuestos");
    const data = await res.json();
    const presupuestos = data.presupuestos || [];
    const todas: PartidaConSaldo[] = [];
    for (const p of presupuestos) {
      if (p.estado !== "Aprobado") continue;
      const det = await fetch(`/api/presupuestos/${p.id_presupuesto}`);
      const detData = await det.json();
      for (const pp of detData.partidas || []) {
        const asignado = Number(pp.monto_asignado);
        const ejecutado = Number(pp.monto_ejecutado);
        todas.push({
          ...pp,
          saldo_disponible: asignado - ejecutado,
        });
      }
    }
    setPartidas(todas.filter(p => p.saldo_disponible > 0));
  }

  useEffect(() => {
    if (modal === "crear" && formTipo === "Compra") {
      cargarPartidas();
    }
  }, [modal, formTipo]);

  async function crearFactura() {
    const payload: Record<string, unknown> = {
      tipo: formTipo,
      numero_factura: formNumero,
      monto: Number(formMonto),
      fecha_emision: formFechaEmision,
      fecha_vencimiento: formFechaVencimiento || null,
    };
    if (formTipo === "Compra") {
      payload.id_proveedor = Number(formProveedor);
      if (formPartida) payload.id_partida = Number(formPartida);
    } else {
      payload.id_cliente = Number(formCliente);
    }

    const res = await fetch("/api/facturas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarFacturas();
  }

  function abrirAnular(f: Factura) {
    setFacturaSeleccionada(f); setMotivoAnulacion(""); setModal("anular");
  }

  async function anularFactura() {
    if (!facturaSeleccionada || !motivoAnulacion.trim()) return;
    const res = await fetch(`/api/facturas/${facturaSeleccionada.id_factura}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "anular", motivo_anulacion: motivoAnulacion }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarFacturas();
  }

  async function solicitarPago(f: Factura) {
    if (!confirm(`¿Generar solicitud de pago para factura ${f.numero_factura}?`)) return;
    const res = await fetch("/api/solicitudes-pago", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_factura: f.id_factura }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setResultadoSolicitud(data.mensaje);
    cargarFacturas();
    setTimeout(() => setResultadoSolicitud(null), 5000);
  }

  function nombreCategoria(id: number) {
    return categorias.find(c => c.id_categoria === id)?.nombre_categoria || `Cat #${id}`;
  }

  const columns: Column<Factura>[] = [
    { key: "numero_factura", header: "# Factura", render: (row) => <span className="font-medium">{row.numero_factura}</span> },
    { key: "tipo", header: "Tipo" },
    { key: "nombre_proveedor", header: "Proveedor / Cliente", render: (row) => row.nombre_proveedor || row.nombre_cliente || "—" },
    { key: "categoria_partida", header: "Partida", render: (row) => row.categoria_partida || "—" },
    { key: "monto", header: "Monto", render: (row) => `$${Number(row.monto).toLocaleString()}` },
    { key: "fecha_emision", header: "Emisión" },
    { key: "fecha_vencimiento", header: "Vencimiento", render: (row) => row.fecha_vencimiento || "—" },
    { key: "estado", header: "Estado", render: (row) => (
      <div>
        <EstadoBadge estado={row.estado} />
        {row.estado === "Anulada" && row.motivo_anulacion && (
          <span className="mt-1 block text-xs text-red-500" title={row.motivo_anulacion}>
            {row.motivo_anulacion.length > 30 ? row.motivo_anulacion.slice(0, 30) + "..." : row.motivo_anulacion}
          </span>
        )}
      </div>
    )},
    { key: "id_factura", header: "Acciones", render: (row) => (
      <div className="flex gap-2">
        {row.estado === "Pendiente" && row.tipo === "Compra" && (
          <Button variant="ghost" size="sm" onClick={() => solicitarPago(row)}>Solicitar pago</Button>
        )}
        {(row.estado === "Pendiente" || row.estado === "Solicitada") && (
          <Button variant="danger" size="sm" onClick={() => abrirAnular(row)}>Anular</Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Facturación"
        actions={<Button variant="primary" size="sm" onClick={abrirCrear}>+ Nueva factura</Button>}
      />

      {resultadoSolicitud && <Alert variant="success">{resultadoSolicitud}</Alert>}

      <div className="mb-4 flex gap-4">
        <Select
          options={[
            { value: "", label: "Todos los tipos" },
            { value: "Compra", label: "Compra" },
            { value: "Venta", label: "Venta" },
          ]}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        />
        <Select
          options={[
            { value: "", label: "Todos los estados" },
            { value: "Pendiente", label: "Pendiente" },
            { value: "Solicitada", label: "Solicitada" },
            { value: "Pagada", label: "Pagada" },
            { value: "Cobrada", label: "Cobrada" },
            { value: "Anulada", label: "Anulada" },
          ]}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        />
      </div>

      <Card>
        <DataTable columns={columns} data={facturas} keyExtractor={(f) => f.id_factura} emptyMessage="No hay facturas registradas" />
      </Card>

      <Modal
        open={modal === "crear"}
        onClose={() => setModal(null)}
        title="Nueva factura"
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button
              variant="primary"
              size="sm"
              onClick={crearFactura}
              disabled={!formNumero || !formMonto || !formFechaEmision || (formTipo === "Compra" && !formProveedor) || (formTipo === "Venta" && !formCliente)}
            >Registrar factura</Button>
          </>
        }
      >
        <div className="mb-3">
          <Select
            label="Tipo"
            options={[
              { value: "Compra", label: "Compra (proveedor)" },
              { value: "Venta", label: "Venta (cliente)" },
            ]}
            value={formTipo}
            onChange={(e) => setFormTipo(e.target.value as "Compra" | "Venta")}
          />
        </div>

        {formTipo === "Compra" ? (
          <div className="mb-3">
            <Select
              label="Proveedor"
              options={[
                { value: "", label: "Seleccionar proveedor" },
                ...proveedores.map(p => ({ value: String(p.id_proveedor), label: p.razon_social })),
              ]}
              value={formProveedor}
              onChange={(e) => setFormProveedor(e.target.value)}
            />
          </div>
        ) : (
          <div className="mb-3">
            <Select
              label="Cliente"
              options={[
                { value: "", label: "Seleccionar cliente" },
                ...clientes.map(c => ({ value: String(c.id_cliente), label: c.razon_social })),
              ]}
              value={formCliente}
              onChange={(e) => setFormCliente(e.target.value)}
            />
          </div>
        )}

        <div className="mb-3">
          <Input label="Número de factura" value={formNumero} onChange={e => setFormNumero(e.target.value)} placeholder="Ej: FAC-001" />
        </div>

        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <Input label="Monto" type="number" value={formMonto} onChange={e => setFormMonto(e.target.value)} />
          </div>
          <div className="flex-1">
            <Input label="Fecha emisión" type="date" value={formFechaEmision} onChange={e => setFormFechaEmision(e.target.value)} />
          </div>
        </div>

        <div className="mb-3">
          <Input label="Fecha vencimiento (opcional)" type="date" value={formFechaVencimiento} onChange={e => setFormFechaVencimiento(e.target.value)} />
        </div>

        {formTipo === "Compra" && (
          <div className="mb-3">
            <Select
              label="Partida presupuestaria (opcional)"
              options={[
                { value: "", label: "Sin partida" },
                ...partidas.map(p => ({
                  value: String(p.id_partida),
                  label: `${nombreCategoria(p.id_categoria)} — Saldo: $${p.saldo_disponible.toLocaleString()}`,
                })),
              ]}
              value={formPartida}
              onChange={(e) => setFormPartida(e.target.value)}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={modal === "anular"}
        onClose={() => setModal(null)}
        title="Anular factura"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={anularFactura} disabled={!motivoAnulacion.trim()}>Anular</Button>
          </>
        }
      >
        {facturaSeleccionada && (
          <>
            <p className="mb-1 text-sm text-gray-600">Factura: {facturaSeleccionada.numero_factura}</p>
            <p className="mb-3 text-sm text-gray-600">Monto: ${Number(facturaSeleccionada.monto).toLocaleString()}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Motivo de anulación (requerido)</label>
              <textarea
                value={motivoAnulacion}
                onChange={e => setMotivoAnulacion(e.target.value)}
                rows={3}
                placeholder="Motivo de anulación"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
