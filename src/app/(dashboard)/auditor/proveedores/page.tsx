"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import EstadoBadge from "@/components/ui/EstadoBadge";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_proveedor: number;
  razon_social: string;
  nit: string;
  contacto: string | null;
  monto_contrato: string | null;
  estado: string;
}

const columns: Column<Row>[] = [
  { key: "razon_social", header: "Razón Social" },
  { key: "nit", header: "NIT" },
  { key: "contacto", header: "Contacto", render: (r) => r.contacto || "-" },
  { key: "monto_contrato", header: "Monto contrato", render: (r) => r.monto_contrato ? `$${Number(r.monto_contrato).toLocaleString()}` : "-" },
  { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Proveedores"
      apiPath="/api/proveedores"
      dataKey="proveedores"
      columns={columns}
      keyExtractor={(r) => r.id_proveedor}
    />
  );
}
