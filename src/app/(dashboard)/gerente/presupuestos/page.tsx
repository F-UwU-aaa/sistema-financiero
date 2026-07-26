"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";

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

  const columns: Column<Presupuesto>[] = [
    { key: "nombre_area", header: "Área" },
    { key: "nombre_periodo", header: "Período" },
    { key: "monto_total_propuesto", header: "Propuesto", align: "right", render: (r) => `$${Number(r.monto_total_propuesto).toLocaleString()}` },
    { key: "elabora_nombre", header: "Elaborado por" },
    { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: "acciones", header: "Acciones", align: "center", render: (r) => (
      <Button variant="primary" size="sm" onClick={() => verDetalle(r)}>Ver detalle</Button>
    ) },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Aprobación de Presupuestos" />

      <div className="mb-4 flex gap-4">
        <div className="w-48">
          <Select
            label="Período"
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            placeholder="Todos los períodos"
            options={periodos.map(p => ({ value: p.id_periodo, label: p.nombre_periodo }))}
          />
        </div>
        <div className="w-48">
          <Select
            label="Estado"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            placeholder="Todos los estados"
            options={[
              { value: "Pendiente", label: "Pendiente" },
              { value: "Aprobado", label: "Aprobado" },
              { value: "Rechazado", label: "Rechazado" },
            ]}
          />
        </div>
        <div className="w-48">
          <Select
            label="Área"
            value={filtroArea}
            onChange={(e) => setFiltroArea(e.target.value)}
            placeholder="Todas las áreas"
            options={areas.map(a => ({ value: a.id_area, label: a.nombre_area }))}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={presupuestos}
        keyExtractor={(r) => r.id_presupuesto}
        emptyMessage="No hay presupuestos para mostrar"
      />

      <Modal
        open={modal === "detalle" && !!presupuestoActual}
        onClose={() => setModal(null)}
        title="Detalle de propuesta"
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cerrar</Button>
            {presupuestoActual?.estado === "Pendiente" && (
              <>
                <Button variant="danger" onClick={rechazar} disabled={!motivo.trim()}>Rechazar</Button>
                <Button variant="success" onClick={aprobar}>Aprobar</Button>
              </>
            )}
          </>
        }
      >
        {presupuestoActual && (
          <>
            <div className="space-y-1 text-sm text-gray-600 mb-4">
              <p>Área: {presupuestoActual.nombre_area}</p>
              <p>Período: {presupuestoActual.nombre_periodo}</p>
              <p>Elaborado por: {presupuestoActual.elabora_nombre}</p>
            </div>

            <Card padding={false} className="mb-4">
              <table className="w-full text-left text-xs">
                <thead className="border-b bg-gray-50"><tr><th className="p-2">Categoría</th><th className="p-2 text-right">Propuesto</th>{presupuestoActual.estado === "Pendiente" && <th className="p-2 text-right">Ajustar a</th>}</tr></thead>
                <tbody>
                  {partidas.map(pp => (
                    <tr key={pp.id_partida} className="border-b">
                      <td className="p-2">{pp.nombre_categoria}</td>
                      <td className="p-2 text-right">${Number(pp.monto_asignado).toLocaleString()}</td>
                      {presupuestoActual.estado === "Pendiente" && (
                        <td className="p-2 text-right">
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
            </Card>

            <div className="mb-3 flex justify-between text-sm font-medium">
              <span>Total propuesto: ${Number(presupuestoActual.monto_total_propuesto).toLocaleString()}</span>
              {presupuestoActual.estado === "Pendiente" && (
                <span>Total aprobado: ${totalAprobado.toLocaleString()}</span>
              )}
            </div>

            {presupuestoActual.estado === "Rechazado" && presupuestoActual.motivo_rechazo && (
              <Alert variant="error" className="mb-3">
                <strong>Motivo del rechazo:</strong> {presupuestoActual.motivo_rechazo}
              </Alert>
            )}

            {presupuestoActual.estado === "Pendiente" && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium text-text">Motivo del rechazo (requerido si rechaza)</label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  placeholder="Indique el motivo si rechaza esta propuesta..."
                />
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
