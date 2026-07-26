"use client";

import { useEffect, useState, useCallback } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Select from "@/components/ui/Select";
import DataTable, { type Column } from "@/components/ui/DataTable";
import EstadoBadge from "@/components/ui/EstadoBadge";

interface InformeRow {
  id_referencia: number;
  modulo: string;
  tipo_transaccion: string | null;
  descripcion: string;
  monto: string | null;
  estado: string;
  fecha: string;
  nombre_registra: string;
  nombre_aprueba: string | null;
  nombre_ejecuta: string | null;
}

interface Periodo {
  id_periodo: number;
  nombre_periodo: string;
}

interface Usuario {
  id_usuario: number;
  nombre_completo: string;
}

const MODULOS = ["Presupuestos", "Facturación", "Pagos", "Cobros", "Balances", "Cuentas Contables", "Cuentas Bancarias", "Proveedores/Clientes", "Usuarios", "Configuración"];

export default function InformeAuditoriaPage() {
  const [informe, setInforme] = useState<InformeRow[]>([]);
  const [periodos, setPeriodos] = useState<Periodo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  useEffect(() => {
    fetch("/api/periodos").then((r) => r.json()).then((d) => setPeriodos(d.periodos || []));
    fetch("/api/usuarios").then((r) => r.json()).then((d) => setUsuarios(d.usuarios || []));
  }, []);

  const cargar = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroPeriodo) params.set("periodo", filtroPeriodo);
    if (filtroUsuario) params.set("usuario", filtroUsuario);
    if (filtroModulo) params.set("modulo", filtroModulo);
    if (filtroTipo) params.set("tipo_transaccion", filtroTipo);
    const res = await fetch(`/api/auditor/informe?${params.toString()}`);
    if (!res.ok) return;
    const data = await res.json();
    setInforme(data.informe || []);
  }, [filtroPeriodo, filtroUsuario, filtroModulo, filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  const columns: Column<InformeRow>[] = [
    { key: "modulo", header: "Módulo" },
    { key: "tipo_transaccion", header: "Tipo", render: (row) => row.tipo_transaccion || "-" },
    { key: "descripcion", header: "Descripción", className: "max-w-xs truncate" },
    {
      key: "monto",
      header: "Monto",
      align: "right",
      render: (row) => row.monto ? `$${Number(row.monto).toLocaleString()}` : "-",
    },
    {
      key: "estado",
      header: "Estado",
      render: (row) => <EstadoBadge estado={row.estado} />,
    },
    { key: "nombre_registra", header: "Registró" },
    { key: "nombre_aprueba", header: "Aprobó", render: (row) => row.nombre_aprueba || "-" },
    { key: "nombre_ejecuta", header: "Ejecutó", render: (row) => row.nombre_ejecuta || "-" },
    {
      key: "fecha",
      header: "Fecha",
      className: "text-xs text-text-muted",
      render: (row) => row.fecha?.split("T")[0],
    },
  ];

  return (
    <div className="p-6">
      <PageHeader title="Informe de Auditoría" />

      <div className="mb-4 flex flex-wrap gap-3">
        <Select
          options={periodos.map((p) => ({ value: p.id_periodo, label: p.nombre_periodo }))}
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
          placeholder="Todos los periodos"
        />
        <Select
          options={usuarios.map((u) => ({ value: u.id_usuario, label: u.nombre_completo }))}
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          placeholder="Todos los usuarios"
        />
        <Select
          options={MODULOS.map((m) => ({ value: m, label: m }))}
          value={filtroModulo}
          onChange={(e) => setFiltroModulo(e.target.value)}
          placeholder="Todos los módulos"
        />
        <Select
          options={[
            { value: "Compra", label: "Compra" },
            { value: "Venta", label: "Venta" },
            { value: "Transferencia", label: "Transferencia" },
            { value: "Cheque", label: "Cheque" },
            { value: "Efectivo", label: "Efectivo" },
          ]}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          placeholder="Todos los tipos"
        />
      </div>

      <div className="mb-3 text-sm text-text-secondary">{informe.length} registros encontrados</div>

      <DataTable
        columns={columns}
        data={informe}
        keyExtractor={(r, i) => `${r.modulo}-${r.id_referencia}-${i}`}
        emptyMessage="Sin resultados"
      />
    </div>
  );
}
