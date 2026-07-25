"use client";

import { useEffect, useState, useCallback } from "react";

interface Presupuesto {
  id_presupuesto: number;
  id_area: number;
  id_periodo: number;
  monto_total_propuesto: string;
  monto_total_aprobado: string | null;
  estado: string;
  motivo_rechazo: string | null;
  fecha_creacion: string;
  fecha_resolucion: string | null;
  nombre_area: string;
  nombre_periodo: string;
  elabora_nombre: string;
  aprueba_nombre: string | null;
}

interface Partida {
  id_partida: number;
  id_categoria: number;
  monto_asignado: string;
  monto_ejecutado: string;
  nombre_categoria: string;
  tipo: string;
}

interface Periodo { id_periodo: number; nombre_periodo: string; }
interface Area { id_area: number; nombre_area: string; }

export default function PresupuestosGerentePage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroArea, setFiltroArea] = useState("");
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [modal, setModal] = useState<string | null>(null);
  const [presupuestoActual, setPresupuestoActual] = useState<Presupuesto | null>(null);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [montosAjustados, setMontosAjustados] = useState<Record<number, number>>({});
  const [totalAprobado, setTotalAprobado] = useState(0);
  const [motivo, setMotivo] = useState("");

  const cargarPresupuestos = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroPeriodo) params.set("id_periodo", filtroPeriodo);
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroArea) params.set("id_area", filtroArea);
    const res = await fetch(`/api/presupuestos?${params.toString()}`);
    const data = await res.json();
    setPresupuestos(data.presupuestos || []);
  }, [filtroPeriodo, filtroEstado, filtroArea]);

  useEffect(() => { cargarPresupuestos(); }, [cargarPresupuestos]);

  useEffect(() => {
    fetch("/api/periodos").then(r => r.json()).then(d => setPeriodos(d.periodos || []));
    fetch("/api/areas").then(r => r.json()).then(d => setAreas(d.areas || []));
  }, []);

  async function verDetalle(p: Presupuesto) {
    const res = await fetch(`/api/presupuestos/${p.id_presupuesto}`);
    const data = await res.json();
    setPresupuestoActual(p);
    setPartidas(data.partidas || []);

    const montos: Record<number, number> = {};
    (data.partidas || []).forEach((pp: Partida) => {
      montos[pp.id_partida] = Number(pp.monto_asignado);
    });
    setMontosAjustados(montos);
    setTotalAprobado(Number(p.monto_total_propuesto));
    setMotivo("");
    setModal("detalle");
  }

  function actualizarMontoPartida(idPartida: number, valor: string) {
    const copia = { ...montosAjustados };
    copia[idPartida] = Number(valor) || 0;
    setMontosAjustados(copia);
    const nuevoTotal = Object.values(copia).reduce((s, v) => s + v, 0);
    setTotalAprobado(nuevoTotal);
  }

  async function aprobar() {
    if (!presupuestoActual) return;
    const partidasPayload = Object.entries(montosAjustados).map(([id, monto]) => ({
      id_partida: Number(id),
      monto_asignado: monto,
    }));

    const res = await fetch(`/api/presupuestos/${presupuestoActual.id_presupuesto}/aprobar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accion: "aprobar",
        monto_total_aprobado: totalAprobado,
        partidas: partidasPayload,
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarPresupuestos();
  }

  async function rechazar() {
    if (!presupuestoActual) return;
    if (!motivo.trim()) { alert("El motivo de rechazo es requerido"); return; }

    const res = await fetch(`/api/presupuestos/${presupuestoActual.id_presupuesto}/aprobar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar", motivo }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarPresupuestos();
  }

  const coloresEstado: Record<string, string> = {
    Borrador: "text-gray-600",
    Pendiente: "text-yellow-600",
    Aprobado: "text-green-600",
    Rechazado: "text-red-600",
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Aprobación de Presupuestos</h1>

      <div className="mb-4 flex gap-4">
        <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los períodos</option>
          {periodos.map(p => <option key={p.id_periodo} value={p.id_periodo}>{p.nombre_periodo}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
        </select>
        <select value={filtroArea} onChange={(e) => setFiltroArea(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">Área</th>
            <th className="p-3">Período</th>
            <th className="p-3">Propuesto</th>
            <th className="p-3">Elaborado por</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {presupuestos.map(p => (
            <tr key={p.id_presupuesto} className="border-b">
              <td className="p-3">{p.nombre_area}</td>
              <td className="p-3">{p.nombre_periodo}</td>
              <td className="p-3">${Number(p.monto_total_propuesto).toLocaleString()}</td>
              <td className="p-3">{p.elabora_nombre}</td>
              <td className={`p-3 font-medium ${coloresEstado[p.estado] || ""}`}>{p.estado}</td>
              <td className="p-3">
                <button onClick={() => verDetalle(p)} className="text-blue-600 hover:underline text-xs">Ver detalle</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "detalle" && presupuestoActual && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Detalle de propuesta</h2>
            <p className="mb-1 text-sm text-gray-600">Área: {presupuestoActual.nombre_area}</p>
            <p className="mb-1 text-sm text-gray-600">Período: {presupuestoActual.nombre_periodo}</p>
            <p className="mb-1 text-sm text-gray-600">Elaborado por: {presupuestoActual.elabora_nombre}</p>

            <div className="my-3">
              <table className="w-full text-left text-xs">
                <thead className="border-b"><tr><th className="p-2">Categoría</th><th className="p-2">Propuesto</th>{presupuestoActual.estado === "Pendiente" && <th className="p-2">Ajustar a</th>}</tr></thead>
                <tbody>
                  {partidas.map(pp => (
                    <tr key={pp.id_partida} className="border-b">
                      <td className="p-2">{pp.nombre_categoria}</td>
                      <td className="p-2">${Number(pp.monto_asignado).toLocaleString()}</td>
                      {presupuestoActual.estado === "Pendiente" && (
                        <td className="p-2">
                          <input
                            type="number"
                            value={montosAjustados[pp.id_partida] ?? pp.monto_asignado}
                            onChange={(e) => actualizarMontoPartida(pp.id_partida, e.target.value)}
                            className="w-28 rounded border border-gray-300 px-2 py-1 text-xs"
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mb-3 flex justify-between text-sm font-medium">
              <span>Total propuesto: ${Number(presupuestoActual.monto_total_propuesto).toLocaleString()}</span>
              {presupuestoActual.estado === "Pendiente" && (
                <span>Total aprobado: ${totalAprobado.toLocaleString()}</span>
              )}
            </div>

            {presupuestoActual.estado === "Rechazado" && presupuestoActual.motivo_rechazo && (
              <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">
                <strong>Motivo del rechazo:</strong> {presupuestoActual.motivo_rechazo}
              </div>
            )}

            {presupuestoActual.estado === "Pendiente" && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">Motivo del rechazo (requerido si rechaza)</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Indique el motivo si rechaza esta propuesta..."
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cerrar</button>
              {presupuestoActual.estado === "Pendiente" && (
                <>
                  <button onClick={rechazar} disabled={!motivo.trim()} className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50">Rechazar</button>
                  <button onClick={aprobar} className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">Aprobar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
