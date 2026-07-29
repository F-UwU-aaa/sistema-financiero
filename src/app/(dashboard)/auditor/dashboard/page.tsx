"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import KpiCard from "@/components/ui/KpiCard";
import Card, { CardHeader } from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";
import ChartDonut from "@/components/dashboard/ChartDonut";
import ChartBarras from "@/components/dashboard/ChartBarras";
import ChartGauge from "@/components/dashboard/ChartGauge";
import { FileSpreadsheet, FileText, AlertTriangle, ShieldCheck } from "lucide-react";

interface ModuloCount {
  modulo: string;
  cantidad: number;
}

interface Reciente {
  id_observacion: number;
  modulo_afectado: string;
  motivo: string;
  estado: string;
  fecha_registro: string;
  nombre_auditor: string;
}

interface EstadoCount {
  estado: string;
  cantidad: number;
}

interface Alerta {
  tipo: string;
  descripcion: string;
  nivel?: string;
}

interface CumplimientoItem {
  concepto: string;
  valor: number;
  detalle: string;
}

export default function DashboardAuditorPage() {
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<EstadoCount[]>([]);
  const [porModulo, setPorModulo] = useState<ModuloCount[]>([]);
  const [recientes, setRecientes] = useState<Reciente[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cumplimiento, setCumplimiento] = useState<CumplimientoItem[]>([]);

  const cargar = useCallback(async () => {
    const [resDash, resAlertas] = await Promise.all([
      fetch("/api/auditor/dashboard"),
      fetch("/api/alertas/periodicas"),
    ]);

    if (resDash.ok) {
      const data = await resDash.json();
      setTotal(data.total || 0);
      setPorEstado(data.por_estado || []);
      setPorModulo(data.por_modulo || []);
      setRecientes(data.recientes || []);
    }

    if (resAlertas.ok) {
      const data = await resAlertas.json();
      setAlertas(data.alertas || []);
    }

    // Cumplimiento: ejecutar checks
    const resCumplimiento = await fetch("/api/auditor/cumplimiento");
    if (resCumplimiento.ok) {
      const data = await resCumplimiento.json();
      setCumplimiento(data.items || []);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const coloresEstado: Record<string, string> = {
    Abierta: "bg-red-100 text-red-800",
    "En revisión": "bg-yellow-100 text-yellow-800",
    Cerrada: "bg-green-100 text-green-800",
  };

  const itemsValidos = cumplimiento.filter((c) => c.valor === 1).length;
  const gaugeValue = cumplimiento.length > 0 ? (itemsValidos / cumplimiento.length) * 100 : 0;

  const moduloChartData = porModulo.map((m) => ({ name: m.modulo, Cantidad: m.cantidad }));

  const estadoDonutData = porEstado.map((e) => ({
    name: e.estado,
    value: e.cantidad,
    color:
      e.estado === "Abierta" ? "#d97706" :
      e.estado === "En revisión" ? "#2563eb" :
      e.estado === "Cerrada" ? "#16a34a" :
      undefined,
  }));

  const estadoColorMap: Record<string, "default" | "danger" | "warning" | "success"> = {
    Abierta: "danger",
    "En revisión": "warning",
    Cerrada: "success",
  };

  const moduloColumns: Column<ModuloCount>[] = [
    { key: "modulo", header: "Módulo" },
    { key: "cantidad", header: "Cantidad", align: "right" },
  ];

  const recientesColumns: Column<Reciente>[] = [
    { key: "modulo_afectado", header: "Módulo" },
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
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard de Auditoría"
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                exportarCSV(
                  "observaciones_auditoria.csv",
                  ["Módulo", "Estado", "Motivo", "Auditor", "Fecha"],
                  recientes.map((r) => [
                    r.modulo_afectado,
                    r.estado,
                    r.motivo,
                    r.nombre_auditor,
                    r.fecha_registro?.split("T")[0],
                  ])
                )
              }
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              CSV
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                exportarPDF(
                  "Observaciones de Auditoría",
                  ["Módulo", "Estado", "Motivo", "Auditor", "Fecha"],
                  recientes.map((r) => [
                    r.modulo_afectado,
                    r.estado,
                    r.motivo,
                    r.nombre_auditor,
                    r.fecha_registro?.split("T")[0],
                  ])
                )
              }
            >
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>
          </>
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {porEstado.map((e) => (
          <KpiCard
            key={e.estado}
            label={e.estado}
            value={e.cantidad}
            color={estadoColorMap[e.estado] || "default"}
          />
        ))}
        <KpiCard
          label="Total observaciones"
          value={total}
          color="primary"
        />
        {cumplimiento.length > 0 && (
          <Card className="flex flex-col items-center justify-center p-3">
            <ChartGauge value={gaugeValue} size={100} label="Cumplimiento" />
          </Card>
        )}
      </div>

      {/* Alertas activas */}
      {alertas.length > 0 && (
        <Alert variant="warning" className="mb-6">
          <div>
            <div className="font-semibold mb-2">Alertas Activas ({alertas.length})</div>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              {alertas.map((a, i) => (
                <div key={i} className="flex items-start gap-2 rounded bg-white/60 p-3 text-sm">
                  <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                    a.nivel === "alto" ? "bg-red-500" : a.nivel === "medio" ? "bg-yellow-500" : "bg-blue-500"
                  }`} />
                  <div>
                    <div className="font-medium">{a.tipo}</div>
                    <div className="text-xs text-gray-500">{a.descripcion}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {/* Cumplimiento de políticas */}
      {cumplimiento.length > 0 && (
        <Card className="mb-6">
          <CardHeader>Cumplimiento de Políticas</CardHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cumplimiento.map((c, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.concepto}</span>
                  <Badge variant={c.valor === 1 ? "success" : "danger"}>
                    {c.valor === 1 ? "OK" : "FALLA"}
                  </Badge>
                </div>
                <div className="mt-1 text-xs text-text-muted">{c.detalle}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Por Módulo</CardHeader>
          {moduloChartData.length > 0 ? (
            <ChartBarras
              data={moduloChartData}
              bars={[{ key: "Cantidad", color: "#2563eb" }]}
              height={250}
              horizontal
            />
          ) : (
            <p className="p-4 text-center text-sm text-text-muted">Sin datos</p>
          )}
        </Card>

        <Card>
          <CardHeader>Estado de Observaciones</CardHeader>
          {estadoDonutData.length > 0 ? (
            <ChartDonut data={estadoDonutData} height={250} />
          ) : (
            <p className="p-4 text-center text-sm text-text-muted">Sin datos</p>
          )}
        </Card>
      </div>
    </div>
  );
}
