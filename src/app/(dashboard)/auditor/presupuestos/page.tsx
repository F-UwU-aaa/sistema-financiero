"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import EstadoBadge from "@/components/ui/EstadoBadge";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_presupuesto: number;
  nombre_area: string;
  nombre_periodo: string;
  monto_total_propuesto: string;
  estado: string;
  elabora_nombre: string;
}

const columns: Column<Row>[] = [
  { key: "nombre_area", header: "Área" },
  { key: "nombre_periodo", header: "Período" },
  { key: "monto_total_propuesto", header: "Monto propuesto", render: (r) => `$${Number(r.monto_total_propuesto).toLocaleString()}` },
  { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
  { key: "elabora_nombre", header: "Elaborado por" },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Presupuestos"
      apiPath="/api/presupuestos"
      dataKey="presupuestos"
      columns={columns}
      keyExtractor={(r) => r.id_presupuesto}
    />
  );
}
