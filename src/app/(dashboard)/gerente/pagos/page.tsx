"use client";

import { useEffect, useState, useCallback } from "react";
import type { SolicitudPago } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable, { type Column } from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";

export default function PagosGerentePage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<SolicitudPago | null>(null);
  const [motivo, setMotivo] = useState("");

  const cargar = useCallback(async () => {
    const params = new URLSearchParams({ tipo_aprobacion: "Manual", estado: "Pendiente" });
    const res = await fetch(`/api/solicitudes-pago?${params.toString()}`);
    const data = await res.json();
    setSolicitudes(data.solicitudes || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  function abrirRechazar(s: SolicitudPago) {
    setSeleccionada(s); setMotivo(""); setModal("rechazar");
  }

  async function aprobar(id: number) {
    const res = await fetch(`/api/solicitudes-pago/${id}/aprobar`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    cargar();
  }

  async function rechazar() {
    if (!seleccionada || !motivo.trim()) return;
    const res = await fetch(`/api/solicitudes-pago/${seleccionada.id_solicitud}/aprobar`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivo }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargar();
  }

  const columns: Column<SolicitudPago>[] = [
    { key: "id_solicitud", header: "# Solicitud" },
    { key: "numero_factura", header: "# Factura", render: (r) => r.numero_factura || "—" },
    { key: "razon_social_proveedor", header: "Proveedor", render: (r) => r.razon_social_proveedor || "—" },
    { key: "monto", header: "Monto", align: "right", render: (r) => `$${Number(r.monto).toLocaleString()}` },
    { key: "fecha_solicitud", header: "Fecha solicitud", render: (r) => new Date(r.fecha_solicitud).toLocaleDateString() },
    { key: "acciones", header: "Acciones", align: "center", render: (r) => (
      <div className="flex items-center justify-center gap-2">
        <Button variant="success" size="sm" onClick={() => aprobar(r.id_solicitud)}>Aprobar</Button>
        <Button variant="danger" size="sm" onClick={() => abrirRechazar(r)}>Rechazar</Button>
      </div>
    ) },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Aprobación de Pagos"
        description="Solicitudes de pago que requieren su aprobación manual (monto supera el límite configurado)."
      />

      <DataTable
        columns={columns}
        data={solicitudes}
        keyExtractor={(r) => r.id_solicitud}
        emptyMessage="No hay solicitudes pendientes de aprobación manual"
      />

      <Modal
        open={modal === "rechazar"}
        onClose={() => setModal(null)}
        title="Rechazar solicitud"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={rechazar} disabled={!motivo.trim()}>Rechazar</Button>
          </>
        }
      >
        {seleccionada && (
          <>
            <p className="mb-1 text-sm text-gray-600">Solicitud #{seleccionada.id_solicitud} — ${Number(seleccionada.monto).toLocaleString()}</p>
            <p className="mb-3 text-sm text-gray-600">Proveedor: {seleccionada.razon_social_proveedor || "—"}</p>
            <label className="mb-1 block text-sm font-medium text-text">Motivo del rechazo (requerido)</label>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="Motivo del rechazo"
            />
          </>
        )}
      </Modal>
    </div>
  );
}
