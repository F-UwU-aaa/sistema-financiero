"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";

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

interface Alerta {
  tipo: string;
  descripcion: string;
  nivel?: string;
}

interface CumplimientoItem {
  concepto: string;
  valor: number;
  detalle: string;
}

export default function DashboardAuditorPage() {
  const [total, setTotal] = useState(0);
  const [porEstado, setPorEstado] = useState<EstadoCount[]>([]);
  const [porModulo, setPorModulo] = useState<ModuloCount[]>([]);
  const [recientes, setRecientes] = useState<Reciente[]>([]);
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cumplimiento, setCumplimiento] = useState<CumplimientoItem[]>([]);

  const cargar = useCallback(async () => {
    const [resDash, resAlertas] = await Promise.all([
      fetch("/api/auditor/dashboard"),
      fetch("/api/alertas/periodicas"),
    ]);

    if (resDash.ok) {
      const data = await resDash.json();
      setTotal(data.total || 0);
      setPorEstado(data.por_estado || []);
      setPorModulo(data.por_modulo || []);
      setRecientes(data.recientes || []);
    }

    if (resAlertas.ok) {
      const data = await resAlertas.json();
      setAlertas(data.alertas || []);
    }

    // Cumplimiento: ejecutar checks
    const resCumplimiento = await fetch("/api/auditor/cumplimiento");
    if (resCumplimiento.ok) {
      const data = await resCumplimiento.json();
      setCumplimiento(data.items || []);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const coloresEstado: Record<string, string> = {
    Abierta: "bg-red-100 text-red-800",
    "En revisión": "bg-yellow-100 text-yellow-800",
    Cerrada: "bg-green-100 text-green-800",
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Auditoría</h1>
        <div className="flex gap-2">
          <button
            onClick={() => exportarCSV("observaciones_auditoria.csv",
              ["Módulo", "Estado", "Motivo", "Auditor", "Fecha"],
              recientes.map((r) => [r.modulo_afectado, r.estado, r.motivo, r.nombre_auditor, r.fecha_registro?.split("T")[0]])
            )}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >CSV</button>
          <button
            onClick={() => exportarPDF("Observaciones de Auditoría",
              ["Módulo", "Estado", "Motivo", "Auditor", "Fecha"],
              recientes.map((r) => [r.modulo_afectado, r.estado, r.motivo, r.nombre_auditor, r.fecha_registro?.split("T")[0]])
            )}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >PDF</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* Alertas activas */}
      {alertas.length > 0 && (
        <div className="mb-6 rounded-lg border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-orange-800">
            Alertas Activas ({alertas.length})
          </h2>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {alertas.map((a, i) => (
              <div key={i} className="flex items-start gap-2 rounded bg-white p-3 text-sm">
                <span className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                  a.nivel === "alto" ? "bg-red-500" : a.nivel === "medio" ? "bg-yellow-500" : "bg-blue-500"
                }`} />
                <div>
                  <div className="font-medium">{a.tipo}</div>
                  <div className="text-xs text-gray-500">{a.descripcion}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cumplimiento de políticas */}
      {cumplimiento.length > 0 && (
        <div className="mb-6 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Cumplimiento de Políticas</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cumplimiento.map((c, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.concepto}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.valor === 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {c.valor === 1 ? "OK" : "FALLA"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">{c.detalle}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
