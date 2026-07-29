"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_cuenta: number;
  codigo_cuenta: string;
  nombre_cuenta: string;
  tipo_cuenta: string;
  activo: boolean;
}

const columns: Column<Row>[] = [
  { key: "codigo_cuenta", header: "Código" },
  { key: "nombre_cuenta", header: "Nombre" },
  { key: "tipo_cuenta", header: "Tipo", render: (r) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${{
      Activo: "bg-blue-100 text-blue-800",
      Pasivo: "bg-orange-100 text-orange-800",
      Patrimonio: "bg-purple-100 text-purple-800",
      Ingreso: "bg-green-100 text-green-800",
      Gasto: "bg-red-100 text-red-800",
    }[r.tipo_cuenta] || "bg-gray-100 text-gray-800"}`}>
      {r.tipo_cuenta}
    </span>
  )},
  { key: "activo", header: "Activo", render: (r) => r.activo ? "Sí" : "No" },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Cuentas Contables"
      apiPath="/api/cuentas-contables"
      dataKey="cuentas"
      columns={columns}
      keyExtractor={(r) => r.id_cuenta}
    />
  );
}
