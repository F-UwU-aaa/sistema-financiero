"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, UserCheck, FileWarning } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card, { CardHeader } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { SkeletonTable } from "@/components/ui/Skeleton";
import ChartBarras from "@/components/dashboard/ChartBarras";
import ChartDonut from "@/components/dashboard/ChartDonut";

interface AreaEjecucion {
  nombre_area: string;
  aprobado: number;
  propuesto: number;
  ejecutado: number;
}

export default function DashboardGerentePage() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/gerente/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <SkeletonTable rows={6} cols={4} className="m-6" />;
  if (!datos) return <div className="p-6 text-red-500">Error al cargar datos</div>;

  const er = datos.estado_resultados;
  const bg = datos.balance_general;
  const kpi = datos.kpis;

  const exportHeaders = ["Concepto", "Monto"];
  const exportRows = [
    ["Ingresos totales", er.ingresos],
    ["Egresos totales", er.gastos],
    ["Resultado neto", er.resultado_neto],
    ["", ""],
    ["Activo - Cuentas bancarias", bg.activo.cuentas_bancarias],
    ["Activo - Cuentas por cobrar", bg.activo.cuentas_por_cobrar],
    ["Activo total", bg.activo.total],
    ["Pasivo - Cuentas por pagar", bg.pasivo.cuentas_por_pagar],
    ["Patrimonio", bg.patrimonio],
  ];

  const ejecucionColumns: Column<AreaEjecucion>[] = [
    { key: "nombre_area", header: "Área" },
    { key: "propuesto", header: "Propuesto", align: "right", render: (r) => `$${r.propuesto.toLocaleString()}` },
    { key: "aprobado", header: "Aprobado", align: "right", render: (r) => `$${r.aprobado.toLocaleString()}` },
    { key: "ejecutado", header: "Ejecutado", align: "right", render: (r) => `$${r.ejecutado.toLocaleString()}` },
    { key: "pct", header: "% Ejecución", align: "right", render: (r) => r.aprobado > 0 ? `${((r.ejecutado / r.aprobado) * 100).toFixed(1)}%` : "-" },
  ];

  const chartData = datos.ejecucion_presupuestaria.map((e: AreaEjecucion) => ({
    name: e.nombre_area,
    Aprobado: e.aprobado,
    Ejecutado: e.ejecutado,
  }));

  const donutData = [
    { name: "Ingresos", value: er.ingresos },
    { name: "Egresos", value: er.gastos },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard Financiero Ejecutivo"
        actions={
          <>
            <Button variant="primary" size="sm" onClick={() => exportarCSV("dashboard_gerente.csv", exportHeaders, exportRows)}>
              CSV
            </Button>
            <Button variant="danger" size="sm" onClick={() => exportarPDF("Dashboard Financiero Ejecutivo", exportHeaders, exportRows)}>
              PDF
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Resultado neto"
          value={`$${er.resultado_neto.toLocaleString()}`}
          icon={er.resultado_neto >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
          color={er.resultado_neto >= 0 ? "success" : "danger"}
        />
        <KpiCard
          label="Flujo de caja"
          value={`$${kpi.flujo_caja.toLocaleString()}`}
          icon={<DollarSign className="h-5 w-5" />}
          color="primary"
        />
        <KpiCard
          label="Solicitudes pendientes"
          value={kpi.solicitudes_pendientes}
          subtext={`$${kpi.monto_pendiente.toLocaleString()}`}
          icon={<Clock className="h-5 w-5" />}
          color="warning"
        />
        <KpiCard
          label="Proveedores pendientes"
          value={kpi.proveedores_pendientes}
          icon={<Users className="h-5 w-5" />}
          color="info"
        />
        <KpiCard
          label="Clientes pendientes"
          value={kpi.clientes_pendientes}
          icon={<UserCheck className="h-5 w-5" />}
          color="info"
        />
        <KpiCard
          label="Facturas por vencer (7d)"
          value={kpi.facturas_por_vencer}
          icon={<FileWarning className="h-5 w-5" />}
          color="danger"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Estado de Resultados</CardHeader>
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b"><td className="p-2 text-gray-600">Ingresos</td><td className="p-2 text-right font-medium text-green-600">${er.ingresos.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 text-gray-600">Egresos</td><td className="p-2 text-right font-medium text-red-600">${er.gastos.toLocaleString()}</td></tr>
              <tr><td className="p-2 font-semibold">Resultado Neto</td>
                <td className={`p-2 text-right font-bold ${er.resultado_neto >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ${er.resultado_neto.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader>Balance General</CardHeader>
          <table className="w-full text-left text-sm">
            <tbody>
              <tr className="border-b"><td className="p-2 text-gray-600">Cuentas bancarias</td><td className="p-2 text-right">${bg.activo.cuentas_bancarias.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 text-gray-600">Cuentas por cobrar</td><td className="p-2 text-right">${bg.activo.cuentas_por_cobrar.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 font-medium">Total Activo</td><td className="p-2 text-right font-medium">${bg.activo.total.toLocaleString()}</td></tr>
              <tr className="border-b"><td className="p-2 text-gray-600">Cuentas por pagar</td><td className="p-2 text-right text-red-600">${bg.pasivo.cuentas_por_pagar.toLocaleString()}</td></tr>
              <tr><td className="p-2 font-semibold">Patrimonio</td><td className="p-2 text-right font-bold">${bg.patrimonio.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardHeader>Ejecución Presupuestaria por Área</CardHeader>
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => exportarCSV("ejecucion_areas.csv", ["Área", "Propuesto", "Aprobado", "Ejecutado"],
                datos.ejecucion_presupuestaria.map((e: AreaEjecucion) => [e.nombre_area, e.propuesto, e.aprobado, e.ejecutado])
              )}
            >CSV</Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => exportarPDF("Ejecución Presupuestaria por Área", ["Área", "Propuesto", "Aprobado", "Ejecutado"],
                datos.ejecucion_presupuestaria.map((e: AreaEjecucion) => [e.nombre_area, e.propuesto, e.aprobado, e.ejecutado]),
                { orientacion: "landscape" }
              )}
            >PDF</Button>
          </div>
        </div>
        <DataTable
          columns={ejecucionColumns}
          data={datos.ejecucion_presupuestaria}
          keyExtractor={(r) => r.nombre_area}
          emptyMessage="Sin datos"
        />
      </Card>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Gráfico de Ejecución por Área</CardHeader>
          <ChartBarras data={chartData} bars={[{ key: "Aprobado", color: "#2563eb" }, { key: "Ejecutado", color: "#16a34a" }]} height={280} />
        </Card>
        <Card>
          <CardHeader>Composición Ingresos vs Egresos</CardHeader>
          <ChartDonut data={donutData} height={280} />
        </Card>
      </div>
    </div>
  );
}
