"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import KpiCard from "@/components/ui/KpiCard";
import Card, { CardHeader } from "@/components/ui/Card";
import EstadoBadge from "@/components/ui/EstadoBadge";
import DataTable from "@/components/ui/DataTable";
import Alert from "@/components/ui/Alert";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Banknote } from "lucide-react";
import type { Column } from "@/components/ui/DataTable";

interface CategoriaEjecucion {
  nombre_categoria: string;
  tipo: string;
  asignado: number;
  ejecutado: number;
}

interface FlujoCaja {
  nombre_cuenta: string;
  saldo: number;
  pagos_mes: number;
  cobros_mes: number;
}

export default function DashboardContadorPage() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/contador/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!datos) return <div className="p-6"><Alert variant="error">Error al cargar datos</Alert></div>;

  const flujoTotal = datos.flujo_caja.reduce((s: number, f: FlujoCaja) => s + f.saldo, 0);

  const flujoColumns: Column<FlujoCaja>[] = [
    { key: "nombre_cuenta", header: "Cuenta" },
    { key: "saldo", header: "Saldo", align: "right", className: "font-medium", render: (row) => `$${row.saldo.toLocaleString()}` },
    { key: "pagos_mes", header: "Pagos (mes)", align: "right", className: "text-red-600", render: (row) => `-$${row.pagos_mes.toLocaleString()}` },
    { key: "cobros_mes", header: "Cobros (mes)", align: "right", className: "text-green-600", render: (row) => `+$${row.cobros_mes.toLocaleString()}` },
  ];

  const ejecucionColumns: Column<CategoriaEjecucion>[] = [
    { key: "nombre_categoria", header: "Categoría" },
    { key: "tipo", header: "Tipo", render: (row) => <span className={row.tipo === "Ingreso" ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800" : "rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800"}>{row.tipo}</span> },
    { key: "asignado", header: "Asignado", align: "right", render: (row) => `$${row.asignado.toLocaleString()}` },
    { key: "ejecutado", header: "Ejecutado", align: "right", render: (row) => `$${row.ejecutado.toLocaleString()}` },
  ];

  const solicitudesColumns: Column<any>[] = [
    { key: "estado", header: "Estado", render: (row) => <EstadoBadge estado={row.estado} /> },
    { key: "cantidad", header: "Cantidad", align: "right" },
    { key: "total", header: "Total", align: "right", render: (row) => `$${row.total.toLocaleString()}` },
  ];

  const facturasColumns: Column<any>[] = [
    { key: "tipo", header: "Tipo" },
    { key: "estado", header: "Estado", render: (row) => <EstadoBadge estado={row.estado} /> },
    { key: "cantidad", header: "Cantidad", align: "right" },
    { key: "total", header: "Total", align: "right", render: (row) => `$${row.total.toLocaleString()}` },
  ];

  const totalPagos = datos.flujo_caja.reduce((s: number, f: FlujoCaja) => s + f.pagos_mes, 0);
  const totalCobros = datos.flujo_caja.reduce((s: number, f: FlujoCaja) => s + f.cobros_mes, 0);

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard Contable"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportarCSV("dashboard_contador.csv", ["Concepto", "Monto"], [
              ["Cuentas por pagar", datos.cuentas_por_pagar],
              ["Cuentas por cobrar", datos.cuentas_por_cobrar],
              ["Flujo de caja total", flujoTotal],
              ["Pagos este mes", datos.pagos_mes.total],
              ["Cobros este mes", datos.cobros_mes.total],
            ])}>CSV</Button>
            <Button variant="danger" size="sm" onClick={() => exportarPDF("Dashboard Contable", ["Concepto", "Monto"], [
              ["Cuentas por pagar", datos.cuentas_por_pagar],
              ["Cuentas por cobrar", datos.cuentas_por_cobrar],
              ["Flujo de caja total", flujoTotal],
              ["Pagos este mes", datos.pagos_mes.total],
              ["Cobros este mes", datos.cobros_mes.total],
            ])}>PDF</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard label="Cuentas por pagar" value={`$${datos.cuentas_por_pagar.toLocaleString()}`} icon={<TrendingDown size={20} />} color="danger" />
        <KpiCard label="Cuentas por cobrar" value={`$${datos.cuentas_por_cobrar.toLocaleString()}`} icon={<TrendingUp size={20} />} color="success" />
        <KpiCard label="Flujo de caja total" value={`$${flujoTotal.toLocaleString()}`} icon={<DollarSign size={20} />} color="primary" />
        <KpiCard label="Pagos este mes" value={String(datos.pagos_mes.cantidad)} subtext={`$${datos.pagos_mes.total.toLocaleString()}`} icon={<CreditCard size={20} />} color="warning" />
        <KpiCard label="Cobros este mes" value={String(datos.cobros_mes.cantidad)} subtext={`$${datos.cobros_mes.total.toLocaleString()}`} icon={<Banknote size={20} />} color="info" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Flujo de Caja por Cuenta</CardHeader>
          <DataTable columns={flujoColumns} data={datos.flujo_caja} keyExtractor={(f) => f.nombre_cuenta} />
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <span>Ejecución por Categoría</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => exportarCSV("ejecucion_categorias.csv",
                  ["Categoría", "Tipo", "Asignado", "Ejecutado"],
                  datos.ejecucion_presupuestaria.map((e: CategoriaEjecucion) =>
                    [e.nombre_categoria, e.tipo, e.asignado, e.ejecutado]
                  )
                )}>CSV</Button>
                <Button variant="danger" size="sm" onClick={() => exportarPDF("Ejecución por Categoría",
                  ["Categoría", "Tipo", "Asignado", "Ejecutado"],
                  datos.ejecucion_presupuestaria.map((e: CategoriaEjecucion) =>
                    [e.nombre_categoria, e.tipo, e.asignado, e.ejecutado]
                  ), { orientacion: "landscape" }
                )}>PDF</Button>
              </div>
            </div>
          </CardHeader>
          <DataTable columns={ejecucionColumns} data={datos.ejecucion_presupuestaria} keyExtractor={(e) => e.nombre_categoria} />
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Solicitudes de Pago por Estado</CardHeader>
          <DataTable columns={solicitudesColumns} data={datos.solicitudes_por_estado} keyExtractor={(s) => s.estado} />
        </Card>

        <Card>
          <CardHeader>Facturas por Tipo/Estado</CardHeader>
          <DataTable columns={facturasColumns} data={datos.facturas_por_estado} keyExtractor={(_f, i) => String(i)} />
        </Card>
      </div>

      <Alert variant="warning">
        <strong>Nota:</strong> Los reportes de libro diario, libro mayor y balance de comprobación no están disponibles porque la tabla de asientos contables no tiene datos reales. Pendiente de implementar con el módulo de contabilidad general.
      </Alert>
    </div>
  );
}
