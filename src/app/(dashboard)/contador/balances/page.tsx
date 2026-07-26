"use client";

import { useEffect, useState, useCallback } from "react";
import type { PeriodoFiscalCompleto, BalanceResultado } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Card, { CardHeader } from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import DataTable from "@/components/ui/DataTable";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import type { Column } from "@/components/ui/DataTable";

export default function BalancesPage() {
  const [periodos, setPeriodos] = useState<PeriodoFiscalCompleto[]>([]);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState("");
  const [balance, setBalance] = useState<BalanceResultado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmCerrar, setConfirmCerrar] = useState(false);

  const cargarPeriodos = useCallback(async () => {
    const res = await fetch("/api/periodos");
    const data = await res.json();
    setPeriodos(data.periodos || []);
  }, []);

  useEffect(() => { cargarPeriodos(); }, [cargarPeriodos]);

  async function generarBalance() {
    if (!periodoSeleccionado) return;
    setCargando(true);
    const res = await fetch(`/api/balances?id_periodo=${periodoSeleccionado}`);
    const data = await res.json();
    setBalance(data.error ? null : data);
    setCargando(false);
  }

  async function marcarGenerado() {
    if (!periodoSeleccionado) return;
    const res = await fetch("/api/balances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_periodo: Number(periodoSeleccionado) }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setBalance(null);
    setPeriodoSeleccionado("");
    cargarPeriodos();
  }

  async function cerrarPeriodo() {
    if (!periodoSeleccionado) return;
    const res = await fetch("/api/balances/cerrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_periodo: Number(periodoSeleccionado) }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setBalance(null);
    setPeriodoSeleccionado("");
    setConfirmCerrar(false);
    cargarPeriodos();
  }

  function fmt(n: number) { return `$${n.toLocaleString()}`; }

  const periodoActual = periodos.find(p => p.id_periodo === Number(periodoSeleccionado));

  const resultadoColumns: Column<{ concepto: string; monto: number; cls: string }>[] = [
    { key: "concepto", header: "Concepto" },
    { key: "monto", header: "Monto", align: "right", render: (row) => <span className={row.cls}>{fmt(row.monto)}</span> },
  ];

  const balanceGeneralColumns: Column<{ rubro: string; detalle: string; monto: number; highlight?: boolean; bold?: boolean }>[] = [
    { key: "rubro", header: "Rubro", render: (row) => <span className={row.bold ? "font-medium" : ""}>{row.rubro}</span> },
    { key: "detalle", header: "Detalle", render: (row) => <span className={row.bold ? "font-medium" : ""}>{row.detalle}</span> },
    { key: "monto", header: "Monto", align: "right", render: (row) => <span className={row.bold ? "font-medium" : ""}>{fmt(row.monto)}</span> },
  ];

  const porAreaColumns: Column<{ nombre_area: string; aprobado: number; ejecutado: number }>[] = [
    { key: "nombre_area", header: "Área" },
    { key: "aprobado", header: "Aprobado", render: (row) => fmt(row.aprobado) },
    { key: "ejecutado", header: "Ejecutado", render: (row) => fmt(row.ejecutado) },
    { key: "aprobado", header: "%", align: "right", render: (row) => row.aprobado > 0 ? `${((row.ejecutado / row.aprobado) * 100).toFixed(1)}%` : "0%" },
  ];

  const porCategoriaColumns: Column<{ nombre_categoria: string; tipo: string; asignado: number; ejecutado: number }>[] = [
    { key: "nombre_categoria", header: "Categoría" },
    { key: "tipo", header: "Tipo" },
    { key: "asignado", header: "Asignado", render: (row) => fmt(row.asignado) },
    { key: "ejecutado", header: "Ejecutado", render: (row) => fmt(row.ejecutado) },
    { key: "asignado", header: "%", align: "right", render: (row) => row.asignado > 0 ? `${((row.ejecutado / row.asignado) * 100).toFixed(1)}%` : "0%" },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Balances" />

      <div className="mb-4 flex gap-4 items-end">
        <div className="flex-1">
          <Select
            label="Período fiscal"
            options={[
              { value: "", label: "Seleccionar período" },
              ...periodos.map(p => ({ value: String(p.id_periodo), label: `${p.nombre_periodo} (${p.estado})` })),
            ]}
            value={periodoSeleccionado}
            onChange={(e) => { setPeriodoSeleccionado(e.target.value); setBalance(null); }}
          />
        </div>
        <Button variant="primary" size="sm" onClick={generarBalance} disabled={!periodoSeleccionado || cargando}>
          {cargando ? "Calculando..." : "Generar balances"}
        </Button>
        {periodoActual && periodoActual.estado === "Abierto" && (
          <>
            <Button variant="success" size="sm" onClick={marcarGenerado} disabled={!balance}>Marcar como generado</Button>
            {periodoActual.balance_aprobado && (
              <Button variant="danger" size="sm" onClick={() => setConfirmCerrar(true)}>Cerrar período</Button>
            )}
          </>
        )}
      </div>

      {periodoActual && (
        <div className="mb-4 flex gap-4 text-xs text-gray-600">
          <span>Estado: <strong>{periodoActual.estado}</strong></span>
          <span>Balance generado: <Badge variant={periodoActual.balance_generado ? "success" : "default"}>{periodoActual.balance_generado ? "Sí" : "No"}</Badge></span>
          <span>Balance aprobado: <Badge variant={periodoActual.balance_aprobado ? "success" : "default"}>{periodoActual.balance_aprobado ? "Sí" : "No"}</Badge></span>
        </div>
      )}

      {cargando && <div className="text-gray-500">Calculando balances...</div>}

      {balance && !cargando && (
        <div className="space-y-6">
          <Card>
            <CardHeader>Estado de Resultados — {balance.periodo.nombre_periodo}</CardHeader>
            <DataTable
              columns={resultadoColumns}
              data={[
                { concepto: "Ingresos (cobros de ventas)", monto: balance.estado_resultados.ingresos, cls: "text-green-600" },
                { concepto: "Gastos (pagos ejecutados)", monto: balance.estado_resultados.gastos, cls: "text-red-600" },
                { concepto: "Resultado Neto", monto: balance.estado_resultados.resultado_neto, cls: balance.estado_resultados.resultado_neto >= 0 ? "text-green-600 font-bold" : "text-red-600 font-bold" },
              ]}
              keyExtractor={(_r, i) => String(i)}
            />
          </Card>

          <Card>
            <CardHeader>Balance General — {balance.periodo.nombre_periodo}</CardHeader>
            <DataTable
              columns={balanceGeneralColumns}
              data={[
                { rubro: "Activo", detalle: "Cuentas bancarias (histórico al cierre)", monto: balance.balance_general.activo.cuentas_bancarias, bold: false },
                { rubro: "", detalle: "Cuentas por cobrar", monto: balance.balance_general.activo.cuentas_por_cobrar, bold: false },
                { rubro: "", detalle: "Total Activo", monto: balance.balance_general.activo.total, bold: true },
                { rubro: "Pasivo", detalle: "Cuentas por pagar", monto: balance.balance_general.pasivo.cuentas_por_pagar, bold: false },
                { rubro: "", detalle: "Total Pasivo", monto: balance.balance_general.pasivo.total, bold: true },
                { rubro: "", detalle: "Patrimonio (Activo − Pasivo)", monto: balance.balance_general.patrimonio, bold: true, highlight: true },
              ]}
              keyExtractor={(_r, i) => String(i)}
            />
          </Card>

          <Card>
            <CardHeader>Ejecución Presupuestaria</CardHeader>
            <h3 className="mb-2 px-6 text-sm font-semibold text-gray-700">Por área</h3>
            <div className="px-6">
              <DataTable columns={porAreaColumns} data={balance.ejecucion_presupuestaria.por_area} keyExtractor={(a) => a.nombre_area} emptyMessage="No hay presupuestos aprobados para este período" />
            </div>
            <h3 className="mb-2 mt-4 px-6 text-sm font-semibold text-gray-700">Por categoría</h3>
            <div className="px-6 pb-4">
              <DataTable columns={porCategoriaColumns} data={balance.ejecucion_presupuestaria.por_categoria} keyExtractor={(c) => c.nombre_categoria} emptyMessage="No hay partidas presupuestarias para este período" />
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={confirmCerrar}
        onClose={() => setConfirmCerrar(false)}
        title="Cerrar período"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setConfirmCerrar(false)}>Cancelar</Button>
            <Button variant="danger" size="sm" onClick={cerrarPeriodo}>Cerrar período</Button>
          </>
        }
      >
        <Alert variant="warning">¿Está seguro de cerrar este período? Esta acción bloquea todos los movimientos.</Alert>
      </Modal>
    </div>
  );
}
