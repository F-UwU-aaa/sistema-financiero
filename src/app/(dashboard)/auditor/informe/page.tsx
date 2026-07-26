"use client";

import { useEffect, useState, useCallback } from "react";

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

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Informe de Auditoría</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los periodos</option>
          {periodos.map((p) => <option key={p.id_periodo} value={p.id_periodo}>{p.nombre_periodo}</option>)}
        </select>
        <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => <option key={u.id_usuario} value={u.id_usuario}>{u.nombre_completo}</option>)}
        </select>
        <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los módulos</option>
          {MODULOS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          <option value="Compra">Compra</option>
          <option value="Venta">Venta</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Cheque">Cheque</option>
          <option value="Efectivo">Efectivo</option>
        </select>
      </div>

      <div className="mb-3 text-sm text-gray-500">{informe.length} registros encontrados</div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">Módulo</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Descripción</th>
            <th className="p-3">Monto</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Registró</th>
            <th className="p-3">Aprobó</th>
            <th className="p-3">Ejecutó</th>
            <th className="p-3">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {informe.length === 0 ? (
            <tr><td colSpan={9} className="p-3 text-center text-gray-400">Sin resultados</td></tr>
          ) : informe.map((r, i) => (
            <tr key={`${r.modulo}-${r.id_referencia}-${i}`} className="border-b">
              <td className="p-3">{r.modulo}</td>
              <td className="p-3">{r.tipo_transaccion || "-"}</td>
              <td className="p-3 max-w-xs truncate">{r.descripcion}</td>
              <td className="p-3">{r.monto ? `$${Number(r.monto).toLocaleString()}` : "-"}</td>
              <td className="p-3">{r.estado}</td>
              <td className="p-3">{r.nombre_registra}</td>
              <td className="p-3">{r.nombre_aprueba || "-"}</td>
              <td className="p-3">{r.nombre_ejecuta || "-"}</td>
              <td className="p-3 text-xs text-gray-500">{r.fecha?.split("T")[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
