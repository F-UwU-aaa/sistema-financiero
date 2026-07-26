"use client";

import { useEffect, useState, useCallback } from "react";

interface Observacion {
  id_observacion: number;
  modulo_afectado: string;
  referencia_id: number | null;
  tipo_transaccion: string | null;
  motivo: string;
  estado: string;
  id_usuario_auditor: number;
  respuesta_gerente: string | null;
  fecha_registro: string;
  fecha_cierre: string | null;
  nombre_auditor: string;
  nombre_gerente: string | null;
}

const MODULOS = ["Presupuestos", "Facturación", "Pagos", "Cobros", "Balances", "Cuentas Contables", "Cuentas Bancarias", "Proveedores/Clientes", "Usuarios", "Configuración"];
const TIPOS_POR_MODULO: Record<string, string[]> = {
  Pagos: ["Transferencia", "Cheque", "Efectivo"],
  Cobros: ["Transferencia", "Cheque", "Efectivo"],
  Facturación: ["Compra", "Venta"],
  Presupuestos: ["Creación", "Aprobación"],
  Balances: ["Cierre", "Reapertura"],
  "Cuentas Contables": ["Creación", "Modificación"],
  "Cuentas Bancarias": ["Creación", "Modificación"],
  "Proveedores/Clientes": ["Registro", "Aprobación"],
  Usuarios: ["Creación", "Asignación de Rol"],
  Configuración: ["Modificación"],
};
const ESTADOS = ["Abierta", "En revisión", "Cerrada"];

export default function AuditoriaPage() {
  const [observaciones, setObservaciones] = useState<Observacion[]>([]);
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroFechaIni, setFiltroFechaIni] = useState("");
  const [filtroFechaFin, setFiltroFechaFin] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<Observacion | null>(null);

  const [formModulo, setFormModulo] = useState("");
  const [formTipo, setFormTipo] = useState("");
  const [formRefId, setFormRefId] = useState("");
  const [formMotivo, setFormMotivo] = useState("");
  const [formError, setFormError] = useState("");

  const cargar = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroModulo) params.set("modulo", filtroModulo);
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroTipo) params.set("tipo_transaccion", filtroTipo);
    if (filtroFechaIni) params.set("fecha_inicio", filtroFechaIni);
    if (filtroFechaFin) params.set("fecha_fin", filtroFechaFin);
    const res = await fetch(`/api/auditor/observaciones?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setObservaciones(data.observaciones || []);
  }, [filtroModulo, filtroEstado, filtroTipo, filtroFechaIni, filtroFechaFin]);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (id: number) => {
    const res = await fetch(`/api/auditor/observaciones/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDetalle(data.observacion);
    setModal("detalle");
  };

  const crearObservacion = async () => {
    setFormError("");
    if (!formModulo || !formMotivo) {
      setFormError("Módulo y motivo son requeridos");
      return;
    }
    const res = await fetch("/api/auditor/observaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        modulo_afectado: formModulo,
        tipo_transaccion: formTipo || null,
        referencia_id: formRefId ? Number(formRefId) : null,
        motivo: formMotivo,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setFormError(data.error || "Error al crear");
      return;
    }
    setModal(null);
    setFormModulo(""); setFormTipo(""); setFormRefId(""); setFormMotivo("");
    cargar();
  };

  const actualizarEstado = async (id: number, nuevoEstado: string) => {
    const res = await fetch(`/api/auditor/observaciones/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevoEstado }),
    });
    if (res.ok) {
      setDetalle(null);
      setModal(null);
      cargar();
    }
  };

  const coloresEstado: Record<string, string> = {
    Abierta: "bg-red-100 text-red-800",
    "En revisión": "bg-yellow-100 text-yellow-800",
    Cerrada: "bg-green-100 text-green-800",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Observaciones de Auditoría</h1>
        <button onClick={() => setModal("crear")} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          + Nueva Observación
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los módulos</option>
          {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPOS_POR_MODULO).flatMap(([mod, tipos]) =>
            tipos.map((t) => <option key={`${mod}-${t}`} value={t}>{t}</option>)
          )}
        </select>
        <input type="date" value={filtroFechaIni} onChange={(e) => setFiltroFechaIni(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Desde" />
        <input type="date" value={filtroFechaFin} onChange={(e) => setFiltroFechaFin(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Hasta" />
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">#</th>
            <th className="p-3">Módulo</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Motivo</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Auditor</th>
            <th className="p-3">Fecha</th>
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
              <td className="p-3 text-xs text-gray-500">{o.fecha_registro?.split("T")[0]}</td>
              <td className="p-3">
                <button onClick={() => verDetalle(o.id_observacion)} className="text-blue-600 hover:underline text-xs">Ver</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal === "crear" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Nueva Observación</h2>
            {formError && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{formError}</div>}
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Módulo afectado *</label>
                <select value={formModulo} onChange={(e) => { setFormModulo(e.target.value); setFormTipo(""); }} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                  <option value="">Seleccionar módulo</option>
                  {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {formModulo && TIPOS_POR_MODULO[formModulo] && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Tipo de transacción</label>
                  <select value={formTipo} onChange={(e) => setFormTipo(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                    <option value="">Seleccionar tipo</option>
                    {TIPOS_POR_MODULO[formModulo].map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Referencia ID</label>
                <input type="number" value={formRefId} onChange={(e) => setFormRefId(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="ID del registro (opcional)" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Motivo *</label>
                <textarea value={formMotivo} onChange={(e) => setFormMotivo(e.target.value)} rows={4} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Describa la irregularidad o hallazgo..." />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => { setModal(null); setFormError(""); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={crearObservacion} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {modal === "detalle" && detalle && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">Observación #{detalle.id_observacion}</h2>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Módulo:</span> {detalle.modulo_afectado}</div>
              {detalle.tipo_transaccion && <div><span className="font-medium">Tipo:</span> {detalle.tipo_transaccion}</div>}
              {detalle.referencia_id && <div><span className="font-medium">Referencia ID:</span> {detalle.referencia_id}</div>}
              <div><span className="font-medium">Estado:</span> <span className={`rounded-full px-2 py-1 text-xs font-medium ${coloresEstado[detalle.estado] || "bg-gray-100"}`}>{detalle.estado}</span></div>
              <div><span className="font-medium">Auditor:</span> {detalle.nombre_auditor}</div>
              <div><span className="font-medium">Fecha registro:</span> {detalle.fecha_registro}</div>
              {detalle.fecha_cierre && <div><span className="font-medium">Fecha cierre:</span> {detalle.fecha_cierre}</div>}
              <div className="mt-2"><span className="font-medium">Motivo:</span></div>
              <p className="rounded bg-gray-50 p-3 text-sm">{detalle.motivo}</p>
              {detalle.respuesta_gerente && (
                <>
                  <div className="mt-2"><span className="font-medium">Respuesta del Gerente ({detalle.nombre_gerente}):</span></div>
                  <p className="rounded bg-blue-50 p-3 text-sm">{detalle.respuesta_gerente}</p>
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              {detalle.estado === "Abierta" && (
                <button onClick={() => actualizarEstado(detalle.id_observacion, "En revisión")} className="rounded-md bg-yellow-500 px-4 py-2 text-sm text-white hover:bg-yellow-600">
                  Marcar En revisión
                </button>
              )}
              {detalle.estado === "En revisión" && (
                <button onClick={() => actualizarEstado(detalle.id_observacion, "Cerrada")} className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700">
                  Cerrar
                </button>
              )}
              <button onClick={() => { setDetalle(null); setModal(null); }} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
