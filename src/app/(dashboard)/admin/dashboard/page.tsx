"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";
import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import Card, { CardHeader } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EstadoBadge from "@/components/ui/EstadoBadge";
import DataTable, { type Column } from "@/components/ui/DataTable";
import { Users, UserCheck, UserX, LogIn, Shield } from "lucide-react";
import ChartDonut from "@/components/dashboard/ChartDonut";

interface RolCount {
  nombre_rol: string;
  cantidad: number;
}

interface ActivoCount {
  activo: boolean;
  cantidad: number;
}

interface Acceso {
  nombre_completo: string;
  correo: string;
  fecha_hora: string;
  ip_origen: string;
  resultado: string;
}

const columnasAccesos: Column<Acceso>[] = [
  { key: "nombre_completo", header: "Usuario" },
  { key: "correo", header: "Correo", className: "text-text-secondary" },
  { key: "fecha_hora", header: "Fecha/Hora", className: "text-xs" },
  { key: "ip_origen", header: "IP", className: "text-xs text-text-secondary", render: (a) => a.ip_origen || "-" },
  { key: "resultado", header: "Resultado", render: (a) => <EstadoBadge estado={a.resultado} /> },
];

export default function DashboardAdminPage() {
  const [usuariosPorRol, setUsuariosPorRol] = useState<RolCount[]>([]);
  const [usuariosActivos, setUsuariosActivos] = useState<ActivoCount[]>([]);
  const [loginsHoy, setLoginsHoy] = useState(0);
  const [fallidos7d, setFallidos7d] = useState(0);
  const [accesosRecientes, setAccesosRecientes] = useState<Acceso[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/admin/dashboard");
    if (res.ok) {
      const d = await res.json();
      setUsuariosPorRol(d.usuarios_por_rol || []);
      setUsuariosActivos(d.usuarios_activos || []);
      setLoginsHoy(d.logins_hoy || 0);
      setFallidos7d(d.fallidos_7d || 0);
      setAccesosRecientes(d.accesos_recientes || []);
    }
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const totalUsuarios = usuariosActivos.reduce((s, r) => s + Number(r.cantidad), 0);
  const activos = usuariosActivos.find((r) => r.activo);
  const inactivos = usuariosActivos.find((r) => !r.activo);

  if (cargando) return <div className="p-6 text-text-muted">Cargando...</div>;

  return (
    <div className="p-6">
      <PageHeader title="Dashboard del Administrador" />

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total usuarios" value={totalUsuarios} icon={<Users className="h-5 w-5" />} color="primary" />
        <KpiCard label="Activos" value={activos?.cantidad || 0} icon={<UserCheck className="h-5 w-5" />} color="success" />
        <KpiCard label="Inactivos" value={inactivos?.cantidad || 0} icon={<UserX className="h-5 w-5" />} color="danger" />
        <KpiCard label="Logins hoy" value={loginsHoy} icon={<LogIn className="h-5 w-5" />} color="info" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Usuarios por Rol</CardHeader>
          {usuariosPorRol.length > 0 ? (
            <ChartDonut
              data={usuariosPorRol.map((r) => ({ name: r.nombre_rol, value: Number(r.cantidad) }))}
              height={260}
            />
          ) : (
            <p className="p-4 text-center text-sm text-text-muted">Sin datos</p>
          )}
        </Card>

        <Card>
          <CardHeader>Seguridad</CardHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-surface-alt p-3">
              <span className="text-sm text-text-secondary">Intentos fallidos (7 días)</span>
              <span className={`text-lg font-bold ${fallidos7d > 0 ? "text-danger" : "text-success"}`}>
                {fallidos7d}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface-alt p-3">
              <span className="text-sm text-text-secondary">Logins exitosos hoy</span>
              <span className="text-lg font-bold text-info">{loginsHoy}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <CardHeader className="mb-0">Últimos 20 Accesos</CardHeader>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                exportarCSV(
                  "accesos_recientes.csv",
                  ["Usuario", "Correo", "Fecha", "IP", "Resultado"],
                  accesosRecientes.map((a) => [
                    a.nombre_completo,
                    a.correo,
                    a.fecha_hora,
                    a.ip_origen,
                    a.resultado,
                  ])
                )
              }
            >
              CSV
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() =>
                exportarPDF(
                  "Accesos Recientes",
                  ["Usuario", "Correo", "Fecha", "IP", "Resultado"],
                  accesosRecientes.map((a) => [
                    a.nombre_completo,
                    a.correo,
                    a.fecha_hora,
                    a.ip_origen,
                    a.resultado,
                  ])
                )
              }
            >
              PDF
            </Button>
          </div>
        </div>
        <DataTable
          columns={columnasAccesos}
          data={accesosRecientes}
          keyExtractor={(_, i) => i}
          emptyMessage="Sin accesos"
        />
      </Card>
    </div>
  );
}
