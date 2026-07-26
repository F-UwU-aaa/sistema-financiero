"use client";

import { useEffect, useState, useCallback } from "react";
import type { SolicitudPago } from "@/types";

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

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Aprobación de Pagos</h1>
      <p className="mb-4 text-sm text-gray-600">Solicitudes de pago que requieren su aprobación manual (monto supera el límite configurado).</p>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3"># Solicitud</th>
            <th className="p-3"># Factura</th>
            <th className="p-3">Proveedor</th>
            <th className="p-3">Monto</th>
            <th className="p-3">Fecha solicitud</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map(s => (
            <tr key={s.id_solicitud} className="border-b">
              <td className="p-3">{s.id_solicitud}</td>
              <td className="p-3">{s.numero_factura || "—"}</td>
              <td className="p-3">{s.razon_social_proveedor || "—"}</td>
              <td className="p-3">${Number(s.monto).toLocaleString()}</td>
              <td className="p-3">{new Date(s.fecha_solicitud).toLocaleDateString()}</td>
              <td className="p-3">
                <button onClick={() => aprobar(s.id_solicitud)} className="mr-3 text-green-600 hover:underline text-xs">Aprobar</button>
                <button onClick={() => abrirRechazar(s)} className="text-red-600 hover:underline text-xs">Rechazar</button>
              </td>
            </tr>
          ))}
          {solicitudes.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-gray-500">No hay solicitudes pendientes de aprobación manual</td></tr>
          )}
        </tbody>
      </table>

      {modal === "rechazar" && seleccionada && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Rechazar solicitud</h2>
            <p className="mb-1 text-sm text-gray-600">Solicitud #{seleccionada.id_solicitud} — ${Number(seleccionada.monto).toLocaleString()}</p>
            <p className="mb-3 text-sm text-gray-600">Proveedor: {seleccionada.razon_social_proveedor || "—"}</p>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)} rows={3} placeholder="Motivo del rechazo (requerido)" className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={rechazar} disabled={!motivo.trim()} className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
