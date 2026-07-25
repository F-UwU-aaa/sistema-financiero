"use client";

import { useEffect, useState, useCallback } from "react";

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

  const coloresEstado: Record<string, string> = {
    Borrador: "text-gray-600",
    Pendiente: "text-yellow-600",
    Aprobado: "text-green-600",
    Rechazado: "text-red-600",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Propuestas de Presupuesto</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          + Nueva propuesta
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los períodos</option>
          {periodos.map(p => <option key={p.id_periodo} value={p.id_periodo}>{p.nombre_periodo}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          <option value="Borrador">Borrador</option>
          <option value="Pendiente">Pendiente</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Rechazado">Rechazado</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">Área</th>
            <th className="p-3">Período</th>
            <th className="p-3">Monto propuesto</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Rechazado por</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {presupuestos.map(p => (
            <tr key={p.id_presupuesto} className="border-b">
              <td className="p-3">{p.nombre_area}</td>
              <td className="p-3">{p.nombre_periodo}</td>
              <td className="p-3">${Number(p.monto_total_propuesto).toLocaleString()}</td>
              <td className={`p-3 font-medium ${coloresEstado[p.estado] || ""}`}>{p.estado}</td>
              <td className="p-3">{p.estado === "Rechazado" ? (p.motivo_rechazo || "—") : "—"}</td>
              <td className="flex gap-2 p-3">
                <button onClick={() => verDetalle(p)} className="text-blue-600 hover:underline text-xs">Ver</button>
                {(p.estado === "Borrador" || p.estado === "Rechazado") && (
                  <button onClick={() => abrirEditar(p)} className="text-blue-600 hover:underline text-xs">Editar</button>
                )}
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
            <p className="mb-1 text-sm text-gray-600">Estado: <span className={`font-medium ${coloresEstado[presupuestoActual.estado]}`}>{presupuestoActual.estado}</span></p>
            {presupuestoActual.estado === "Rechazado" && presupuestoActual.motivo_rechazo && (
              <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">
                <strong>Motivo del rechazo:</strong> {presupuestoActual.motivo_rechazo}
              </div>
            )}
            <table className="mb-4 w-full text-left text-xs">
              <thead className="border-b"><tr><th className="p-2">Categoría</th><th className="p-2">Monto</th></tr></thead>
              <tbody>
                {partidasDetalle.map((pp, i) => (
                  <tr key={i} className="border-b"><td className="p-2">{pp.nombre_categoria}</td><td className="p-2">${Number(pp.monto_asignado).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mb-4 text-sm font-medium">Total: ${Number(presupuestoActual.monto_total_propuesto).toLocaleString()}</p>
            <button onClick={() => setModal(null)} className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm">Cerrar</button>
          </div>
        </div>
      )}

      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">{modal === "crear" ? "Nueva propuesta" : "Editar propuesta"}</h2>
            <div className="mb-3 flex gap-3">
              <select value={formArea} onChange={(e) => setFormArea(e.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Seleccionar área</option>
                {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
              </select>
              <select value={formPeriodo} onChange={(e) => setFormPeriodo(e.target.value)} disabled={modal === "editar"} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100">
                <option value="">Seleccionar período</option>
                {periodos.filter(p => p.estado === "Abierto").map(p => <option key={p.id_periodo} value={p.id_periodo}>{p.nombre_periodo}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Partidas presupuestarias</h3>
              {formPartidas.map((pp, i) => (
                <div key={i} className="mb-2 flex items-center gap-2">
                  <span className="flex-1 text-sm">{nombreCategoria(pp.id_categoria)}</span>
                  <input type="number" value={pp.monto_asignado} onChange={(e) => actualizarMonto(i, e.target.value)} className="w-32 rounded-md border border-gray-300 px-2 py-1 text-sm" />
                  <button onClick={() => eliminarPartida(i)} className="text-red-600 hover:underline text-xs">Quitar</button>
                </div>
              ))}
              <div className="mt-2 flex gap-2">
                <select value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Categoría</option>
                  {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre_categoria} ({c.tipo})</option>)}
                </select>
                <input type="number" placeholder="Monto" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm" />
                <button onClick={agregarPartida} className="rounded-md bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300">Agregar</button>
              </div>
            </div>

            <p className="mb-4 text-sm font-medium">Total propuesto: ${totalPropuesto.toLocaleString()}</p>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={() => guardar(false)} disabled={formPartidas.length === 0} className="rounded-md border border-gray-300 px-4 py-2 text-sm disabled:opacity-50">Guardar borrador</button>
              <button onClick={() => guardar(true)} disabled={formPartidas.length === 0 || !formArea || !formPeriodo} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">Enviar a aprobación</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
