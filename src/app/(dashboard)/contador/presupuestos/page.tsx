"use client";

import { useEffect, useState, useCallback } from "react";
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

interface Presupuesto {
  id_presupuesto: number;
  id_area: number;
  id_periodo: number;
  monto_total_propuesto: string;
  estado: string;
  motivo_rechazo: string | null;
  fecha_creacion: string;
  nombre_area: string;
  nombre_periodo: string;
  aprueba_nombre: string | null;
  fecha_resolucion: string | null;
}

interface Partida {
  id_partida?: number;
  id_categoria: number;
  monto_asignado: number;
  nombre_categoria?: string;
}

interface Area { id_area: number; nombre_area: string; }
interface Periodo { id_periodo: number; nombre_periodo: string; estado: string; }
interface Categoria { id_categoria: number; nombre_categoria: string; tipo: string; }

export default function PresupuestosContadorPage() {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [presupuestoActual, setPresupuestoActual] = useState<Presupuesto | null>(null);
  const [partidasDetalle, setPartidasDetalle] = useState<Partida[]>([]);

  const [areas, setAreas] = useState<Area[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const [formArea, setFormArea] = useState("");
  const [formPeriodo, setFormPeriodo] = useState("");
  const [formPartidas, setFormPartidas] = useState<Partida[]>([]);
  const [nuevaCat, setNuevaCat] = useState("");
  const [nuevoMonto, setNuevoMonto] = useState("");

  const cargarPresupuestos = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroPeriodo) params.set("id_periodo", filtroPeriodo);
    if (filtroEstado) params.set("estado", filtroEstado);
    const res = await fetch(`/api/presupuestos?${params.toString()}`);
    const data = await res.json();
    setPresupuestos(data.presupuestos || []);
  }, [filtroPeriodo, filtroEstado]);

  useEffect(() => { cargarPresupuestos(); }, [cargarPresupuestos]);

  useEffect(() => {
    fetch("/api/areas").then(r => r.json()).then(d => setAreas(d.areas || []));
    fetch("/api/periodos").then(r => r.json()).then(d => setPeriodos(d.periodos || []));
    fetch("/api/categorias").then(r => r.json()).then(d => setCategorias(d.categorias || []));
  }, []);

  async function verDetalle(p: Presupuesto) {
    const res = await fetch(`/api/presupuestos/${p.id_presupuesto}`);
    const data = await res.json();
    setPresupuestoActual(p);
    setPartidasDetalle(data.partidas || []);
    setModal("detalle");
  }

  function abrirCrear() {
    setFormArea("");
    setFormPeriodo("");
    setFormPartidas([]);
    setNuevaCat("");
    setNuevoMonto("");
    setModal("crear");
  }

  function abrirEditar(p: Presupuesto) {
    setFormArea(String(p.id_area));
    setFormPeriodo(String(p.id_periodo));
    setNuevaCat("");
    setNuevoMonto("");
    fetch(`/api/presupuestos/${p.id_presupuesto}`)
      .then(r => r.json())
      .then(d => {
        setFormPartidas(d.partidas?.map((pp: Partida) => ({
          id_categoria: pp.id_categoria,
          monto_asignado: Number(pp.monto_asignado),
        })) || []);
      });
    setModal("editar");
  }

  function agregarPartida() {
    if (!nuevaCat || !nuevoMonto) return;
    setFormPartidas([...formPartidas, { id_categoria: Number(nuevaCat), monto_asignado: Number(nuevoMonto) }]);
    setNuevaCat("");
    setNuevoMonto("");
  }

  function eliminarPartida(idx: number) {
    setFormPartidas(formPartidas.filter((_, i) => i !== idx));
  }

  function actualizarMonto(idx: number, valor: string) {
    const copia = [...formPartidas];
    copia[idx].monto_asignado = Number(valor) || 0;
    setFormPartidas(copia);
  }

  const totalPropuesto = formPartidas.reduce((s, p) => s + p.monto_asignado, 0);

  async function guardar(enviar: boolean) {
    const payload = {
      id_area: Number(formArea),
      id_periodo: Number(formPeriodo),
      partidas: formPartidas,
      enviar,
    };

    const url = modal === "editar" && presupuestoActual
      ? `/api/presupuestos/${presupuestoActual.id_presupuesto}`
      : "/api/presupuestos";

    const method = modal === "editar" ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargarPresupuestos();
  }

  function nombreCategoria(id: number) {
    return categorias.find(c => c.id_categoria === id)?.nombre_categoria || `Cat #${id}`;
  }

  const columns: Column<Presupuesto>[] = [
    { key: "nombre_area", header: "Área" },
    { key: "nombre_periodo", header: "Período" },
    { key: "monto_total_propuesto", header: "Monto propuesto", render: (row) => `$${Number(row.monto_total_propuesto).toLocaleString()}` },
    { key: "estado", header: "Estado", render: (row) => <EstadoBadge estado={row.estado} /> },
    { key: "motivo_rechazo", header: "Rechazado por", render: (row) => row.estado === "Rechazado" ? (row.motivo_rechazo || "—") : "—" },
    { key: "id_presupuesto", header: "Acciones", render: (row) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => verDetalle(row)}>Ver</Button>
        {(row.estado === "Borrador" || row.estado === "Rechazado") && (
          <Button variant="ghost" size="sm" onClick={() => abrirEditar(row)}>Editar</Button>
        )}
      </div>
    )},
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Propuestas de Presupuesto"
        actions={<Button variant="primary" size="sm" onClick={abrirCrear}>+ Nueva propuesta</Button>}
      />

      <div className="mb-4 flex gap-4">
        <Select
          options={[
            { value: "", label: "Todos los períodos" },
            ...periodos.map(p => ({ value: String(p.id_periodo), label: p.nombre_periodo })),
          ]}
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
        />
        <Select
          options={[
            { value: "", label: "Todos los estados" },
            { value: "Borrador", label: "Borrador" },
            { value: "Pendiente", label: "Pendiente" },
            { value: "Aprobado", label: "Aprobado" },
            { value: "Rechazado", label: "Rechazado" },
          ]}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        />
      </div>

      <Card>
        <DataTable columns={columns} data={presupuestos} keyExtractor={(p) => p.id_presupuesto} emptyMessage="No hay presupuestos registrados" />
      </Card>

      <Modal
        open={modal === "detalle"}
        onClose={() => setModal(null)}
        title="Detalle de propuesta"
        size="lg"
        footer={<Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cerrar</Button>}
      >
        {presupuestoActual && (
          <>
            <p className="mb-1 text-sm text-gray-600">Área: {presupuestoActual.nombre_area}</p>
            <p className="mb-1 text-sm text-gray-600">Período: {presupuestoActual.nombre_periodo}</p>
            <p className="mb-1 text-sm text-gray-600">Estado: <EstadoBadge estado={presupuestoActual.estado} /></p>
            {presupuestoActual.estado === "Rechazado" && presupuestoActual.motivo_rechazo && (
              <Alert variant="error" className="mt-2"><strong>Motivo del rechazo:</strong> {presupuestoActual.motivo_rechazo}</Alert>
            )}
            <table className="mb-4 w-full text-left text-xs">
              <thead className="border-b"><tr><th className="p-2">Categoría</th><th className="p-2">Monto</th></tr></thead>
              <tbody>
                {partidasDetalle.map((pp, i) => (
                  <tr key={i} className="border-b"><td className="p-2">{pp.nombre_categoria}</td><td className="p-2">${Number(pp.monto_asignado).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm font-medium">Total: ${Number(presupuestoActual.monto_total_propuesto).toLocaleString()}</p>
          </>
        )}
      </Modal>

      <Modal
        open={modal === "crear" || modal === "editar"}
        onClose={() => setModal(null)}
        title={modal === "crear" ? "Nueva propuesta" : "Editar propuesta"}
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="secondary" size="sm" onClick={() => guardar(false)} disabled={formPartidas.length === 0}>Guardar borrador</Button>
            <Button variant="primary" size="sm" onClick={() => guardar(true)} disabled={formPartidas.length === 0 || !formArea || !formPeriodo}>Enviar a aprobación</Button>
          </>
        }
      >
        <div className="mb-3 flex gap-3">
          <Select
            options={[
              { value: "", label: "Seleccionar área" },
              ...areas.map(a => ({ value: String(a.id_area), label: a.nombre_area })),
            ]}
            value={formArea}
            onChange={(e) => setFormArea(e.target.value)}
          />
          <Select
            options={[
              { value: "", label: "Seleccionar período" },
              ...periodos.filter(p => p.estado === "Abierto").map(p => ({ value: String(p.id_periodo), label: p.nombre_periodo })),
            ]}
            value={formPeriodo}
            onChange={(e) => setFormPeriodo(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Partidas presupuestarias</h3>
          {formPartidas.map((pp, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <span className="flex-1 text-sm">{nombreCategoria(pp.id_categoria)}</span>
              <Input type="number" value={String(pp.monto_asignado)} onChange={(e) => actualizarMonto(i, e.target.value)} className="w-32" />
              <Button variant="ghost" size="sm" onClick={() => eliminarPartida(i)}>Quitar</Button>
            </div>
          ))}
          <div className="mt-2 flex gap-2">
            <Select
              options={[
                { value: "", label: "Categoría" },
                ...categorias.map(c => ({ value: String(c.id_categoria), label: `${c.nombre_categoria} (${c.tipo})` })),
              ]}
              value={nuevaCat}
              onChange={(e) => setNuevaCat(e.target.value)}
            />
            <Input type="number" placeholder="Monto" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} className="w-32" />
            <Button variant="secondary" size="sm" onClick={agregarPartida}>Agregar</Button>
          </div>
        </div>

        <p className="text-sm font-medium">Total propuesto: ${totalPropuesto.toLocaleString()}</p>
      </Modal>
    </div>
  );
}
