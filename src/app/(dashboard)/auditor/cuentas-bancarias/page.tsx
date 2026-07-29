"use client";

import AuditorDataView from "@/components/auditor/AuditorDataView";
import type { Column } from "@/components/ui/DataTable";

interface Row {
  id_cuenta_bancaria: number;
  nombre_cuenta: string;
  tipo: string;
  numero_cuenta: string | null;
  saldo_actual: string;
  activo: boolean;
}

const columns: Column<Row>[] = [
  { key: "nombre_cuenta", header: "Cuenta" },
  { key: "tipo", header: "Tipo", render: (r) => (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.tipo === "Banco" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
      {r.tipo}
    </span>
  )},
  { key: "numero_cuenta", header: "N° Cuenta", render: (r) => r.numero_cuenta || "-" },
  { key: "saldo_actual", header: "Saldo", align: "right", render: (r) => {
    const saldo = Number(r.saldo_actual);
    return <span className={saldo < 0 ? "text-red-600" : ""}>${saldo.toLocaleString()}</span>;
  }},
  { key: "activo", header: "Activo", render: (r) => r.activo ? "Sí" : "No" },
];

export default function Page() {
  return (
    <AuditorDataView
      title="Cuentas Bancarias"
      apiPath="/api/cuentas-bancarias"
      dataKey="cuentas"
      columns={columns}
      keyExtractor={(r) => r.id_cuenta_bancaria}
    />
  );
}
