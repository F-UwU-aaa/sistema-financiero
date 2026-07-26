"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";
import { DollarSign, TrendingUp, Clock, ArrowDownLeft } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card, { CardHeader } from "@/components/ui/Card";
import KpiCard from "@/components/ui/KpiCard";
import Badge from "@/components/ui/Badge";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EmptyState from "@/components/ui/EmptyState";

interface Cuenta {
  id_cuenta_bancaria: number;
  nombre_cuenta: string;
  tipo: string;
  numero_cuenta: string | null;
  saldo_actual: number;
}

interface Pago {
  id_pago: number;
  monto: number;
  metodo: string;
  numero_operacion: string | null;
  fecha_pago: string;
  razon_social: string | null;
  numero_factura: string | null;
}

const cuentaColumns: Column<Cuenta>[] = [
  { key: "nombre_cuenta", header: "Cuenta" },
  { key: "tipo", header: "Tipo", render: (row) => (
    <Badge variant={row.tipo === "Banco" ? "info" : "success"}>{row.tipo}</Badge>
  )},
  { key: "numero_cuenta", header: "N Cuenta", render: (row) => row.numero_cuenta || "-" },
  { key: "saldo_actual", header: "Saldo", align: "right", render: (row) => (
    <span className="font-medium">${row.saldo_actual.toLocaleString()}</span>
  )},
];

const pagoColumns: Column<Pago>[] = [
  { key: "id_pago", header: "ID", render: (row) => `#${row.id_pago}` },
  { key: "monto", header: "Monto", align: "right", render: (row) => (
    <span className="font-medium">${row.monto.toLocaleString()}</span>
  )},
  { key: "metodo", header: "Metodo" },
  { key: "numero_operacion", header: "N Operacion", render: (row) => row.numero_operacion || "-" },
  { key: "fecha_pago", header: "Fecha", render: (row) => row.fecha_pago?.split("T")[0] },
  { key: "razon_social", header: "Proveedor", render: (row) => row.razon_social || "-" },
  { key: "numero_factura", header: "Factura", render: (row) => row.numero_factura || "-" },
];

export default function DashboardTesoreroPage() {
  const [datos, setDatos] = useState<any>(null);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/tesorero/dashboard");
    if (res.ok) setDatos(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (cargando) return <div className="p-6 text-gray-500">Cargando...</div>;
  if (!datos) return <div className="p-6 text-red-500">Error al cargar datos</div>;

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard de Caja y Bancos"
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportarCSV("saldos_cuentas.csv",
              ["Cuenta", "Tipo", "N Cuenta", "Saldo"],
              datos.cuentas.map((c: Cuenta) => [c.nombre_cuenta, c.tipo, c.numero_cuenta || "", c.saldo_actual])
            )}>CSV</Button>
            <Button variant="danger" size="sm" onClick={() => exportarPDF("Saldos por Cuenta",
              ["Cuenta", "Tipo", "N Cuenta", "Saldo"],
              datos.cuentas.map((c: Cuenta) => [c.nombre_cuenta, c.tipo, c.numero_cuenta || "", c.saldo_actual])
            )}>PDF</Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Saldo total" value={`$${datos.saldo_total.toLocaleString()}`} color="primary" icon={<DollarSign className="h-5 w-5" />} />
        <KpiCard
          label="Pagos ejecutados (mes)"
          value={datos.pagos_mes.cantidad}
          subtext={`$${datos.pagos_mes.total.toLocaleString()}`}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          label="Pagos pendientes"
          value={datos.pagos_pendientes.cantidad}
          subtext={`$${datos.pagos_pendientes.total.toLocaleString()}`}
          color="warning"
          icon={<Clock className="h-5 w-5" />}
        />
        <KpiCard
          label="Cobros este mes"
          value={datos.cobros_mes.cantidad}
          subtext={`$${datos.cobros_mes.total.toLocaleString()}`}
          color="success"
          icon={<ArrowDownLeft className="h-5 w-5" />}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>Saldo por Cuenta en Tiempo Real</CardHeader>
        <DataTable<Cuenta>
          columns={cuentaColumns}
          data={datos.cuentas}
          keyExtractor={(c) => c.id_cuenta_bancaria}
          emptyMessage="No hay cuentas registradas"
        />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardHeader className="mb-0">Ultimos 20 Pagos Ejecutados</CardHeader>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => exportarCSV("pagos_ejecutados.csv",
              ["ID", "Monto", "Metodo", "N Operacion", "Fecha", "Proveedor", "Factura"],
              datos.ultimos_pagos.map((p: Pago) => [
                p.id_pago, p.monto, p.metodo, p.numero_operacion || "",
                p.fecha_pago, p.razon_social || "", p.numero_factura || ""
              ])
            )}>CSV</Button>
            <Button variant="danger" size="sm" onClick={() => exportarPDF("Pagos Ejecutados",
              ["ID", "Monto", "Metodo", "N Operacion", "Fecha", "Proveedor", "Factura"],
              datos.ultimos_pagos.map((p: Pago) => [
                p.id_pago, p.monto, p.metodo, p.numero_operacion || "",
                p.fecha_pago, p.razon_social || "", p.numero_factura || ""
              ]),
              { orientacion: "landscape" }
            )}>PDF</Button>
          </div>
        </div>
        <DataTable<Pago>
          columns={pagoColumns}
          data={datos.ultimos_pagos}
          keyExtractor={(p) => p.id_pago}
          emptyMessage="Sin pagos registrados"
        />
      </Card>
    </div>
  );
}
