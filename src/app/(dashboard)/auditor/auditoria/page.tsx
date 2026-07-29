"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Alert from "@/components/ui/Alert";
import EmptyState from "@/components/ui/EmptyState";

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

  const moduloOptions = MODULOS.map((m) => ({ value: m, label: m }));
  const estadoOptions = ESTADOS.map((e) => ({ value: e, label: e }));
  const allTipos = Object.values(TIPOS_POR_MODULO).flat();
  const tipoOptions = [...new Set(allTipos)].map((t) => ({ value: t, label: t }));

  const columns: Column<Observacion>[] = [
    { key: "id_observacion", header: "#" },
    { key: "modulo_afectado", header: "Módulo" },
    { key: "tipo_transaccion", header: "Tipo", render: (row) => row.tipo_transaccion || "-" },
    { key: "motivo", header: "Motivo", className: "max-w-xs truncate" },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <EstadoBadge estado={row.estado} />,
    },
    { key: "nombre_auditor", header: "Auditor" },
    {
      key: "fecha_registro",
      header: "Fecha",
      className: "text-xs text-text-muted",
      render: (row) => row.fecha_registro?.split("T")[0],
    },
    {
      key: "acciones",
      header: "Acciones",
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => verDetalle(row.id_observacion)}>
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Observaciones de Auditoría"
        actions={
          <Button onClick={() => setModal("crear")}>
            + Nueva Observación
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          options={moduloOptions}
          value={filtroModulo}
          onChange={(e) => setFiltroModulo(e.target.value)}
          placeholder="Todos los módulos"
        />
        <Select
          options={estadoOptions}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          placeholder="Todos los estados"
        />
        <Select
          options={tipoOptions}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          placeholder="Todos los tipos"
        />
        <Input
          type="date"
          value={filtroFechaIni}
          onChange={(e) => setFiltroFechaIni(e.target.value)}
          placeholder="Desde"
        />
        <Input
          type="date"
          value={filtroFechaFin}
          onChange={(e) => setFiltroFechaFin(e.target.value)}
          placeholder="Hasta"
        />
      </div>

      <DataTable
        columns={columns}
        data={observaciones}
        keyExtractor={(o) => o.id_observacion}
        emptyMessage="Sin observaciones"
      />

      <Modal open={modal === "crear"} onClose={() => { setModal(null); setFormError(""); }} title="Nueva Observación">
        {formError && <Alert variant="error" className="mb-3">{formError}</Alert>}
        <div className="space-y-3">
          <Select
            label="Módulo afectado *"
            options={moduloOptions}
            value={formModulo}
            onChange={(e) => { setFormModulo(e.target.value); setFormTipo(""); }}
            placeholder="Seleccionar módulo"
          />
          {formModulo && TIPOS_POR_MODULO[formModulo] && (
            <Select
              label="Tipo de transacción"
              options={TIPOS_POR_MODULO[formModulo].map((t) => ({ value: t, label: t }))}
              value={formTipo}
              onChange={(e) => setFormTipo(e.target.value)}
              placeholder="Seleccionar tipo"
            />
          )}
          <Input
            label="Referencia ID"
            type="number"
            value={formRefId}
            onChange={(e) => setFormRefId(e.target.value)}
            placeholder="ID del registro (opcional)"
          />
          <div className="space-y-1">
            <label className="block text-sm font-medium text-text">Motivo *</label>
            <textarea
              value={formMotivo}
              onChange={(e) => setFormMotivo(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="Describa la irregularidad o hallazgo..."
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => { setModal(null); setFormError(""); }}>
            Cancelar
          </Button>
          <Button onClick={crearObservacion}>
            Registrar
          </Button>
        </div>
      </Modal>

      <Modal open={modal === "detalle" && !!detalle} onClose={() => { setDetalle(null); setModal(null); }} title={detalle ? `Observación #${detalle.id_observacion}` : undefined}>
        {detalle && (
          <>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">Módulo:</span> {detalle.modulo_afectado}</div>
              {detalle.tipo_transaccion && <div><span className="font-medium">Tipo:</span> {detalle.tipo_transaccion}</div>}
              {detalle.referencia_id && <div><span className="font-medium">Referencia ID:</span> {detalle.referencia_id}</div>}
              <div><span className="font-medium">Estado:</span> <EstadoBadge estado={detalle.estado} /></div>
              <div><span className="font-medium">Auditor:</span> {detalle.nombre_auditor}</div>
              <div><span className="font-medium">Fecha registro:</span> {detalle.fecha_registro}</div>
              {detalle.fecha_cierre && <div><span className="font-medium">Fecha cierre:</span> {detalle.fecha_cierre}</div>}
              <div className="mt-2"><span className="font-medium">Motivo:</span></div>
              <p className="rounded bg-surface-alt p-3 text-sm">{detalle.motivo}</p>
              {detalle.respuesta_gerente && (
                <>
                  <div className="mt-2"><span className="font-medium">Respuesta del Gerente ({detalle.nombre_gerente}):</span></div>
                  <p className="rounded bg-blue-50 p-3 text-sm">{detalle.respuesta_gerente}</p>
                </>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-3">
              {detalle.estado === "Abierta" && (
                <Button variant="success" onClick={() => actualizarEstado(detalle.id_observacion, "En revisión")}>
                  Marcar En revisión
                </Button>
              )}
              {detalle.estado === "En revisión" && (
                <Button variant="success" onClick={() => actualizarEstado(detalle.id_observacion, "Cerrada")}>
                  Cerrar
                </Button>
              )}
              <Button variant="secondary" onClick={() => { setDetalle(null); setModal(null); }}>
                Cerrar
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
