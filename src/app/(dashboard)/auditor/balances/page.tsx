"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import EstadoBadge from "@/components/ui/EstadoBadge";

interface PeriodoBalance {
  id_periodo: number;
  nombre_periodo: string;
  estado: string;
  balance_generado: boolean;
  balance_aprobado: boolean;
  fecha_balance: string | null;
  nombre_usuario_genera_balance?: string;
  nombre_usuario_aprueba_balance?: string | null;
}

export default function Page() {
  const [periodos, setPeriodos] = useState<PeriodoBalance[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    fetch("/api/periodos")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setPeriodos(d.periodos || []))
      .catch(() => setError(true));
  }, []);

  return (
    <div className="p-6">
      <PageHeader title="Balances" />
      <Card>
        {error ? (
          <p className="text-sm text-red-600">Error al cargar datos</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr><th className="p-2">Período</th><th className="p-2">Estado</th><th className="p-2">Balance generado</th><th className="p-2">Aprobado</th><th className="p-2">Fecha balance</th></tr>
            </thead>
            <tbody>
              {periodos.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-gray-500">No hay períodos</td></tr>}
              {periodos.map(p => (
                <tr key={p.id_periodo} className="border-b">
                  <td className="p-2">{p.nombre_periodo}</td>
                  <td className="p-2"><EstadoBadge estado={p.estado} /></td>
                  <td className="p-2">{p.balance_generado ? "✅ Sí" : "❌ No"}</td>
                  <td className="p-2">{p.balance_aprobado ? "✅ Sí" : "❌ No"}</td>
                  <td className="p-2">{p.fecha_balance ? p.fecha_balance.split("T")[0] : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
