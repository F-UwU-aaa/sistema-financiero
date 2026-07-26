"use client";

import { useEffect, useState, useCallback } from "react";
import type { Factura, SolicitudPago, Proveedor, Cliente, Categoria, PartidaPresupuestaria } from "@/types";

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

  const coloresEstado: Record<string, string> = {
    Pendiente: "text-yellow-600",
    Solicitada: "text-blue-600",
    Pagada: "text-green-600",
    Cobrada: "text-green-600",
    Anulada: "text-red-600",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Facturación</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          + Nueva factura
        </button>
      </div>

      {resultadoSolicitud && (
        <div className="mb-4 rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-800">
          {resultadoSolicitud}
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          <option value="Compra">Compra</option>
          <option value="Venta">Venta</option>
        </select>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Solicitada">Solicitada</option>
          <option value="Pagada">Pagada</option>
          <option value="Cobrada">Cobrada</option>
          <option value="Anulada">Anulada</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3"># Factura</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Proveedor / Cliente</th>
            <th className="p-3">Partida</th>
            <th className="p-3">Monto</th>
            <th className="p-3">Emisión</th>
            <th className="p-3">Vencimiento</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturas.map(f => (
            <tr key={f.id_factura} className="border-b">
              <td className="p-3 font-medium">{f.numero_factura}</td>
              <td className="p-3">{f.tipo}</td>
              <td className="p-3">{f.nombre_proveedor || f.nombre_cliente || "—"}</td>
              <td className="p-3">{f.categoria_partida || "—"}</td>
              <td className="p-3">${Number(f.monto).toLocaleString()}</td>
              <td className="p-3">{f.fecha_emision}</td>
              <td className="p-3">{f.fecha_vencimiento || "—"}</td>
              <td className={`p-3 font-medium ${coloresEstado[f.estado] || ""}`}>
                {f.estado}
                {f.estado === "Anulada" && f.motivo_anulacion && (
                  <span className="block text-xs text-red-500 mt-1" title={f.motivo_anulacion}>
                    {f.motivo_anulacion.length > 30 ? f.motivo_anulacion.slice(0, 30) + "..." : f.motivo_anulacion}
                  </span>
                )}
              </td>
              <td className="p-3">
                {f.estado === "Pendiente" && f.tipo === "Compra" && (
                  <button onClick={() => solicitarPago(f)} className="mr-3 text-blue-600 hover:underline text-xs">
                    Solicitar pago
                  </button>
                )}
                {(f.estado === "Pendiente" || f.estado === "Solicitada") && (
                  <button onClick={() => abrirAnular(f)} className="text-red-600 hover:underline text-xs">
                    Anular
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "crear" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Nueva factura</h2>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Tipo</label>
              <select value={formTipo} onChange={e => setFormTipo(e.target.value as "Compra" | "Venta")} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="Compra">Compra (proveedor)</option>
                <option value="Venta">Venta (cliente)</option>
              </select>
            </div>

            {formTipo === "Compra" ? (
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">Proveedor</label>
                <select value={formProveedor} onChange={e => setFormProveedor(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.razon_social}</option>)}
                </select>
              </div>
            ) : (
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">Cliente</label>
                <select value={formCliente} onChange={e => setFormCliente(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Seleccionar cliente</option>
                  {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.razon_social}</option>)}
                </select>
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Número de factura</label>
              <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: FAC-001" />
            </div>

            <div className="mb-3 flex gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Monto</label>
                <input type="number" value={formMonto} onChange={e => setFormMonto(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" min="0" step="0.01" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Fecha emisión</label>
                <input type="date" value={formFechaEmision} onChange={e => setFormFechaEmision(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Fecha vencimiento (opcional)</label>
              <input type="date" value={formFechaVencimiento} onChange={e => setFormFechaVencimiento(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            </div>

            {formTipo === "Compra" && (
              <div className="mb-3">
                <label className="mb-1 block text-sm font-medium text-gray-700">Partida presupuestaria (opcional)</label>
                <select value={formPartida} onChange={e => setFormPartida(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Sin partida</option>
                  {partidas.map(p => (
                    <option key={p.id_partida} value={p.id_partida}>
                      {nombreCategoria(p.id_categoria)} — Saldo: ${p.saldo_disponible.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={crearFactura}
                disabled={!formNumero || !formMonto || !formFechaEmision || (formTipo === "Compra" && !formProveedor) || (formTipo === "Venta" && !formCliente)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Registrar factura
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "anular" && facturaSeleccionada && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Anular factura</h2>
            <p className="mb-1 text-sm text-gray-600">Factura: {facturaSeleccionada.numero_factura}</p>
            <p className="mb-3 text-sm text-gray-600">Monto: ${Number(facturaSeleccionada.monto).toLocaleString()}</p>
            <textarea
              value={motivoAnulacion}
              onChange={e => setMotivoAnulacion(e.target.value)}
              rows={3}
              placeholder="Motivo de anulación (requerido)"
              className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={anularFactura}
                disabled={!motivoAnulacion.trim()}
                className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
              >
                Anular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
