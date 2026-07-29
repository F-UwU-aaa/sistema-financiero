"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import EstadoBadge from "@/components/ui/EstadoBadge";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_pago: number;
  monto: string;
  metodo: string;
  numero_operacion: string | null;
  fecha_pago: string;
  numero_factura: string | null;
  razon_social_proveedor: string | null;
  nombre_cuenta_bancaria: string | null;
}

const columns: Column<Row>[] = [
  { key: "razon_social_proveedor", header: "Proveedor", render: (r) => r.razon_social_proveedor || "-" },
  { key: "numero_factura", header: "Factura", render: (r) => r.numero_factura || "-" },
  { key: "monto", header: "Monto", render: (r) => `$${Number(r.monto).toLocaleString()}` },
  { key: "metodo", header: "Método" },
  { key: "fecha_pago", header: "Fecha", render: (r) => r.fecha_pago?.split("T")[0] },
  { key: "nombre_cuenta_bancaria", header: "Cuenta", render: (r) => r.nombre_cuenta_bancaria || "-" },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Pagos"
      apiPath="/api/pagos"
      dataKey="pagos"
      columns={columns}
      keyExtractor={(r) => r.id_pago}
    />
  );
}
