"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_cobro: number;
  monto: string;
  fecha_cobro: string;
  numero_factura: string | null;
  nombre_cliente: string | null;
  nombre_cuenta_bancaria: string | null;
}

const columns: Column<Row>[] = [
  { key: "nombre_cliente", header: "Cliente", render: (r) => r.nombre_cliente || "-" },
  { key: "numero_factura", header: "Factura", render: (r) => r.numero_factura || "-" },
  { key: "monto", header: "Monto", render: (r) => `$${Number(r.monto).toLocaleString()}` },
  { key: "fecha_cobro", header: "Fecha", render: (r) => r.fecha_cobro?.split("T")[0] },
  { key: "nombre_cuenta_bancaria", header: "Cuenta", render: (r) => r.nombre_cuenta_bancaria || "-" },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Cobros"
      apiPath="/api/cobros"
      dataKey="cobros"
      columns={columns}
      keyExtractor={(r) => r.id_cobro}
    />
  );
}
