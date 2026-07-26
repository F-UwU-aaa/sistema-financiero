"use client";

import { useEffect, useState, useCallback } from "react";

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

const coloresEstado: Record<string, string> = {
  Abierta: "bg-red-100 text-red-800",
  "En revisión": "bg-yellow-100 text-yellow-800",
  Cerrada: "bg-green-100 text-green-800",
};

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

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Observaciones de Auditoría</h1>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Módulo</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Motivo</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Auditor</th>
            <th className="p-3">Respuesta</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {observaciones.length === 0 ? (
            <tr><td colSpan={8} className="p-3 text-center text-gray-400">Sin observaciones</td></tr>
          ) : observaciones.map((o) => (
            <tr key={o.id_observacion} className="border-b">
              <td className="p-3">{o.id_observacion}</td>
              <td className="p-3">{o.modulo_afectado}</td>
              <td className="p-3">{o.tipo_transaccion || "-"}</td>
              <td className="p-3 max-w-xs truncate">{o.motivo}</td>
              <td className="p-3">
                <span className={`rounded-full px-2 py-1 text-xs font-medium ${coloresEstado[o.estado] || "bg-gray-100"}`}>
                  {o.estado}
                </span>
              </td>
              <td className="p-3">{o.nombre_auditor}</td>
              <td className="p-3 max-w-xs truncate">{o.respuesta_gerente || <span className="text-gray-400">Sin respuesta</span>}</td>
              <td className="p-3">
                <button onClick={() => verDetalle(o.id_observacion)} className="text-blue-600 hover:underline text-xs">Ver / Responder</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "detalle" && detalle && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Observación #{detalle.id_observacion}</h2>
            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Módulo:</span> {detalle.modulo_afectado}</div>
              {detalle.tipo_transaccion && <div><span className="font-medium">Tipo:</span> {detalle.tipo_transaccion}</div>}
              {detalle.referencia_id && <div><span className="font-medium">Referencia ID:</span> {detalle.referencia_id}</div>}
              <div><span className="font-medium">Estado:</span> <span className={`rounded-full px-2 py-1 text-xs font-medium ${coloresEstado[detalle.estado] || "bg-gray-100"}`}>{detalle.estado}</span></div>
              <div><span className="font-medium">Auditor:</span> {detalle.nombre_auditor}</div>
              <div><span className="font-medium">Fecha:</span> {detalle.fecha_registro}</div>
              <div className="mt-2"><span className="font-medium">Motivo:</span></div>
              <p className="rounded bg-gray-50 p-3 text-sm">{detalle.motivo}</p>

              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Tu respuesta</label>
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Justifique o responda la observación..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              {detalle.estado !== "Cerrada" && (
                <button onClick={enviarRespuesta} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                  Enviar Respuesta
                </button>
              )}
              <button onClick={() => { setDetalle(null); setModal(null); setError(""); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
