"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import EstadoBadge from "@/components/ui/EstadoBadge";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_factura: number;
  tipo: string;
  nombre_proveedor: string | null;
  nombre_cliente: string | null;
  monto: string;
  numero_factura: string;
  fecha_emision: string;
  estado: string;
}

const columns: Column<Row>[] = [
  { key: "numero_factura", header: "N° Factura" },
  { key: "tipo", header: "Tipo", render: (r) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.tipo === "Compra" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
      {r.tipo}
    </span>
  )},
  { key: "nombre_proveedor", header: "Proveedor", render: (r) => r.nombre_proveedor || r.nombre_cliente || "-" },
  { key: "monto", header: "Monto", render: (r) => `$${Number(r.monto).toLocaleString()}` },
  { key: "fecha_emision", header: "Emisión", render: (r) => r.fecha_emision?.split("T")[0] },
  { key: "estado", header: "Estado", render: (r) => <EstadoBadge estado={r.estado} /> },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Facturación"
      apiPath="/api/facturas"
      dataKey="facturas"
      columns={columns}
      keyExtractor={(r) => r.id_factura}
    />
  );
}
