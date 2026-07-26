"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";

interface Observacion {
  id_observacion: number;
  modulo_afectado: string;
  referencia_id: number | null;
  tipo_transaccion: string | null;
  motivo: string;
  estado: string;
  respuesta_gerente: string | null;
  fecha_registro: string;
  fecha_cierre: string | null;
  nombre_auditor: string;
  nombre_gerente: string | null;
}

export default function GerenteAuditoriaPage() {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Observacion | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/auditor/observaciones");
    if (!res.ok) return;
    const data = await res.json();
    setObservaciones(data.observaciones || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (id: number) => {
    const res = await fetch(`/api/auditor/observaciones/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDetalle(data.observacion);
    setRespuesta(data.observacion.respuesta_gerente || "");
    setModal("detalle");
  };

  const enviarRespuesta = async () => {
    if (!detalle || !respuesta.trim()) {
      setError("La respuesta es requerida");
      return;
    }
    setError("");
    const res = await fetch(`/api/auditor/observaciones/${detalle.id_observacion}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ respuesta_gerente: respuesta }),
    });
    if (res.ok) {
      setDetalle(null);
      setModal(null);
      setRespuesta("");
      cargar();
    } else {
      const data = await res.json();
      setError(data.error || "Error al responder");
    }
  };

  const columns: Column<Observacion>[] = [
    { key: "id_observacion", header: "#" },
    { key: "modulo_afectado", header: "Módulo" },
    { key: "tipo_transaccion", header: "Tipo", render: (r) => r.tipo_transaccion || "-" },
    { key: "motivo", header: "Motivo", className: "max-w-xs truncate" },
    { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: "nombre_auditor", header: "Auditor" },
    { key: "respuesta_gerente", header: "Respuesta", className: "max-w-xs truncate", render: (r) => r.respuesta_gerente || <span className="text-gray-400">Sin respuesta</span> },
    { key: "acciones", header: "Acciones", align: "center", render: (r) => (
      <Button variant="primary" size="sm" onClick={() => verDetalle(r.id_observacion)}>Ver / Responder</Button>
    ) },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Observaciones de Auditoría" />

      <DataTable
        columns={columns}
        data={observaciones}
        keyExtractor={(r) => r.id_observacion}
        emptyMessage="Sin observaciones"
      />

      <Modal
        open={modal === "detalle"}
        onClose={() => { setDetalle(null); setModal(null); setError(""); }}
        title={detalle ? `Observación #${detalle.id_observacion}` : undefined}
        footer={
          <>
            {detalle?.estado !== "Cerrada" && (
              <Button variant="primary" onClick={enviarRespuesta}>Enviar Respuesta</Button>
            )}
            <Button variant="ghost" onClick={() => { setDetalle(null); setModal(null); setError(""); }}>Cerrar</Button>
          </>
        }
      >
        {detalle && (
          <>
            {error && <Alert variant="error" className="mb-3">{error}</Alert>}
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Módulo:</span> {detalle.modulo_afectado}</div>
              {detalle.tipo_transaccion && <div><span className="font-medium">Tipo:</span> {detalle.tipo_transaccion}</div>}
              {detalle.referencia_id && <div><span className="font-medium">Referencia ID:</span> {detalle.referencia_id}</div>}
              <div><span className="font-medium">Estado:</span> <EstadoBadge estado={detalle.estado} /></div>
              <div><span className="font-medium">Auditor:</span> {detalle.nombre_auditor}</div>
              <div><span className="font-medium">Fecha:</span> {detalle.fecha_registro}</div>
              <div className="mt-2"><span className="font-medium">Motivo:</span></div>
              <p className="rounded bg-gray-50 p-3 text-sm">{detalle.motivo}</p>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-text">Tu respuesta</label>
              <textarea
                value={respuesta}
                onChange={(e) => setRespuesta(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                placeholder="Justifique o responda la observación..."
              />
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
