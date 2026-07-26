"use client";

import { useEffect, useState, useCallback } from "react";
import type { PeriodoFiscalCompleto, BalanceResultado } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card, { CardHeader } from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Modal from "@/components/ui/Modal";
import Alert from "@/components/ui/Alert";
import { SkeletonTable } from "@/components/ui/Skeleton";

export default function BalancesGerentePage() {
  const [periodos, setPeriodos] = useState<PeriodoFiscalCompleto[]>([]);
  const [balance, setBalance] = useState<BalanceResultado | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<number | null>(null);
  const [cargando, setCargando] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [motivoReapertura, setMotivoReapertura] = useState("");

  const cargarPeriodos = useCallback(async () => {
    const res = await fetch("/api/periodos");
    const data = await res.json();
    setPeriodos(data.periodos || []);
  }, []);

  useEffect(() => { cargarPeriodos(); }, [cargarPeriodos]);

  async function verBalance(id_periodo: number) {
    setCargando(true);
    setPeriodoSeleccionado(id_periodo);
    const res = await fetch(`/api/balances?id_periodo=${id_periodo}`);
    const data = await res.json();
    setBalance(data.error ? null : data);
    setCargando(false);
  }

  async function aprobarBalance() {
    if (!periodoSeleccionado) return;
    const res = await fetch(`/api/balances/${periodoSeleccionado}/aprobar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "aprobar" }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    setBalance(null);
    setPeriodoSeleccionado(null);
    cargarPeriodos();
  }

  async function rechazarBalance() {
    if (!periodoSeleccionado) return;
    const res = await fetch(`/api/balances/${periodoSeleccionado}/aprobar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "rechazar" }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    setBalance(null);
    setPeriodoSeleccionado(null);
    cargarPeriodos();
  }

  async function reabrirPeriodo() {
    if (!periodoSeleccionado || !motivoReapertura.trim()) return;
    const res = await fetch("/api/balances/reabrir", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_periodo: periodoSeleccionado, motivo: motivoReapertura }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    setBalance(null);
    setPeriodoSeleccionado(null);
    setMotivoReapertura("");
    cargarPeriodos();
  }

  function fmt(n: number) { return `$${n.toLocaleString()}`; }

  const periodoActual = periodos.find(p => p.id_periodo === periodoSeleccionado);

  const periodoColumns: Column<PeriodoFiscalCompleto>[] = [
    { key: "nombre_periodo", header: "Período", render: (r) => <span className="font-medium">{r.nombre_periodo}</span> },
    { key: "fecha_inicio", header: "Desde" },
    { key: "fecha_fin", header: "Hasta" },
    { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
    { key: "balance_generado", header: "Balance", align: "center", render: (r) => r.balance_generado ? "✓" : "—" },
    { key: "balance_aprobado", header: "Aprobado", align: "center", render: (r) => r.balance_aprobado ? "✓" : "—" },
    { key: "acciones", header: "Acciones", align: "center", render: (r) => (
      <div className="flex items-center justify-center gap-2">
        <Button variant="primary" size="sm" onClick={() => verBalance(r.id_periodo)}>Ver balance</Button>
        {r.estado === "Cerrado" && (
          <Button variant="ghost" size="sm" onClick={() => { setPeriodoSeleccionado(r.id_periodo); setModal("reabrir"); setMotivoReapertura(""); }}>Reabrir</Button>
        )}
      </div>
    ) },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Balances y Cierre de Período" />

      <DataTable
        columns={periodoColumns}
        data={periodos}
        keyExtractor={(r) => r.id_periodo}
        emptyMessage="No hay períodos registrados"
        className="mb-6"
      />

      {cargando && <SkeletonTable rows={5} cols={4} />}

      {balance && !cargando && (
        <Card>
          <CardHeader>Balance de {balance.periodo.nombre_periodo}</CardHeader>

          <CardHeader className="text-sm">Estado de Resultados</CardHeader>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Concepto</th><th className="p-2">Monto</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2">Ingresos</td><td className="p-2 text-green-600">{fmt(balance.estado_resultados.ingresos)}</td></tr>
              <tr className="border-b"><td className="p-2">Gastos</td><td className="p-2 text-red-600">{fmt(balance.estado_resultados.gastos)}</td></tr>
              <tr className="border-b bg-gray-50 font-bold"><td className="p-2">Resultado Neto</td><td className={`p-2 ${balance.estado_resultados.resultado_neto >= 0 ? "text-green-600" : "text-red-600"}`}>{fmt(balance.estado_resultados.resultado_neto)}</td></tr>
            </tbody>
          </table>

          <CardHeader className="text-sm">Balance General</CardHeader>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Rubro</th><th className="p-2">Detalle</th><th className="p-2">Monto</th></tr>
            </thead>
            <tbody>
              <tr className="border-b"><td className="p-2 font-medium" rowSpan={2}>Activo</td><td className="p-2">Cuentas bancarias</td><td className="p-2">{fmt(balance.balance_general.activo.cuentas_bancarias)}</td></tr>
              <tr className="border-b"><td className="p-2">Cuentas por cobrar</td><td className="p-2">{fmt(balance.balance_general.activo.cuentas_por_cobrar)}</td></tr>
              <tr className="border-b bg-gray-50 font-medium"><td className="p-2"></td><td className="p-2">Total Activo</td><td className="p-2">{fmt(balance.balance_general.activo.total)}</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Pasivo</td><td className="p-2">Cuentas por pagar</td><td className="p-2">{fmt(balance.balance_general.pasivo.cuentas_por_pagar)}</td></tr>
              <tr className="border-b bg-gray-50 font-medium"><td className="p-2"></td><td className="p-2">Total Pasivo</td><td className="p-2">{fmt(balance.balance_general.pasivo.total)}</td></tr>
              <tr className="border-b bg-blue-50 font-bold"><td className="p-2"></td><td className="p-2">Patrimonio</td><td className="p-2">{fmt(balance.balance_general.patrimonio)}</td></tr>
            </tbody>
          </table>

          <CardHeader className="text-sm">Ejecución Presupuestaria</CardHeader>
          <table className="mb-4 w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Área</th><th className="p-2">Aprobado</th><th className="p-2">Ejecutado</th><th className="p-2">%</th></tr>
            </thead>
            <tbody>
              {balance.ejecucion_presupuestaria.por_area.map((a) => (
                <tr key={a.nombre_area} className="border-b">
                  <td className="p-2">{a.nombre_area}</td>
                  <td className="p-2">{fmt(a.aprobado)}</td>
                  <td className="p-2">{fmt(a.ejecutado)}</td>
                  <td className="p-2">{a.aprobado > 0 ? ((a.ejecutado / a.aprobado) * 100).toFixed(1) : "0"}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {periodoActual && periodoActual.estado === "Abierto" && (
            <div className="flex justify-end gap-3 mt-4">
              {periodoActual.balance_generado && !periodoActual.balance_aprobado && (
                <>
                  <Button variant="danger" size="sm" onClick={() => setModal("rechazar")}>Rechazar</Button>
                  <Button variant="success" size="sm" onClick={() => setModal("aprobar")}>Aprobar balance</Button>
                </>
              )}
              {periodoActual.balance_aprobado && (
                <Alert variant="success">Balance aprobado — listo para cierre</Alert>
              )}
              {!periodoActual.balance_generado && (
                <span className="text-sm text-gray-500">Esperando que el Contador genere el balance...</span>
              )}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={modal === "aprobar"}
        onClose={() => setModal(null)}
        title="Aprobar balance"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="success" onClick={aprobarBalance}>Aprobar</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">¿Está seguro de aprobar el balance del período {periodoActual?.nombre_periodo}?</p>
      </Modal>

      <Modal
        open={modal === "rechazar"}
        onClose={() => setModal(null)}
        title="Rechazar balance"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="danger" onClick={rechazarBalance}>Rechazar</Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">El balance será rechazado y el Contador deberá regenerarlo.</p>
      </Modal>

      <Modal
        open={modal === "reabrir"}
        onClose={() => setModal(null)}
        title="Reabrir período"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="primary" onClick={reabrirPeriodo} disabled={!motivoReapertura.trim()}>Reabrir</Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-gray-600">Período: {periodoActual?.nombre_periodo}</p>
        <label className="mb-1 block text-sm font-medium text-text">Motivo de reapertura (requerido)</label>
        <textarea
          value={motivoReapertura}
          onChange={(e) => setMotivoReapertura(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
          placeholder="Motivo de reapertura"
        />
      </Modal>
    </div>
  );
}
