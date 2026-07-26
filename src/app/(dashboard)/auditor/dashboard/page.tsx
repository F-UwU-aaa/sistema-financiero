"use client";

import { useEffect, useState, useCallback } from "react";

interface ModuloCount {
  modulo: string;
  cantidad: number;
}

interface Reciente {
  id_observacion: number;
  modulo_afectado: string;
  motivo: string;
  estado: string;
  fecha_registro: string;
  nombre_auditor: string;
}

interface EstadoCount {
  estado: string;
  cantidad: number;
}

export default function DashboardAuditorPage() {
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<EstadoCount[]>([]);
  const [porModulo, setPorModulo] = useState<ModuloCount[]>([]);
  const [recientes, setRecientes] = useState<Reciente[]>([]);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/auditor/dashboard");
    if (!res.ok) return;
    const data = await res.json();
    setTotal(data.total || 0);
    setPorEstado(data.por_estado || []);
    setPorModulo(data.por_modulo || []);
    setRecientes(data.recientes || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const coloresEstado: Record<string, string> = {
    Abierta: "bg-red-100 text-red-800",
    "En revisión": "bg-yellow-100 text-yellow-800",
    Cerrada: "bg-green-100 text-green-800",
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard de Auditoría</h1>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {porEstado.map((e) => (
          <div key={e.estado} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-sm text-gray-500">{e.estado}</div>
            <div className="mt-1 text-3xl font-bold">{e.cantidad}</div>
          </div>
        ))}
        <div className="rounded-lg border bg-gray-50 p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total observaciones</div>
          <div className="mt-1 text-3xl font-bold">{total}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Por Módulo</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Módulo</th>
                <th className="p-3">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {porModulo.length === 0 ? (
                <tr><td colSpan={2} className="p-3 text-center text-gray-400">Sin datos</td></tr>
              ) : porModulo.map((m) => (
                <tr key={m.modulo} className="border-b">
                  <td className="p-3">{m.modulo}</td>
                  <td className="p-3">{m.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Observaciones Recientes</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Módulo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Auditor</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {recientes.length === 0 ? (
                <tr><td colSpan={4} className="p-3 text-center text-gray-400">Sin observaciones</td></tr>
              ) : recientes.map((r) => (
                <tr key={r.id_observacion} className="border-b">
                  <td className="p-3">{r.modulo_afectado}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${coloresEstado[r.estado] || "bg-gray-100"}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="p-3">{r.nombre_auditor}</td>
                  <td className="p-3 text-xs text-gray-500">{r.fecha_registro?.split("T")[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
