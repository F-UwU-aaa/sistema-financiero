"use client";

import { useEffect, useState, useCallback } from "react";
import { exportarCSV, exportarPDF } from "@/lib/export";

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

  if (cargando) return <div className="p-6 text-gray-500">Cargando...</div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Dashboard del Administrador</h1>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Total usuarios</div>
          <div className="mt-1 text-3xl font-bold">{totalUsuarios}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Activos</div>
          <div className="mt-1 text-3xl font-bold text-green-600">{activos?.cantidad || 0}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Inactivos</div>
          <div className="mt-1 text-3xl font-bold text-red-600">{inactivos?.cantidad || 0}</div>
        </div>
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Logins hoy</div>
          <div className="mt-1 text-3xl font-bold text-blue-600">{loginsHoy}</div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Usuarios por Rol</h2>
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="p-3">Rol</th>
                <th className="p-3">Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPorRol.map((r) => (
                <tr key={r.nombre_rol} className="border-b">
                  <td className="p-3">{r.nombre_rol}</td>
                  <td className="p-3 font-medium">{r.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold">Seguridad</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Intentos fallidos (7 días)</span>
              <span className={`text-lg font-bold ${fallidos7d > 0 ? "text-red-600" : "text-green-600"}`}>
                {fallidos7d}
              </span>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-3">
              <span className="text-sm text-gray-600">Logins exitosos hoy</span>
              <span className="text-lg font-bold text-blue-600">{loginsHoy}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Últimos 20 Accesos</h2>
          <div className="flex gap-2">
            <button
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
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              CSV
            </button>
            <button
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
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              PDF
            </button>
          </div>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="p-3">Usuario</th>
              <th className="p-3">Correo</th>
              <th className="p-3">Fecha/Hora</th>
              <th className="p-3">IP</th>
              <th className="p-3">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {accesosRecientes.length === 0 ? (
              <tr><td colSpan={5} className="p-3 text-center text-gray-400">Sin accesos</td></tr>
            ) : accesosRecientes.map((a, i) => (
              <tr key={i} className="border-b">
                <td className="p-3">{a.nombre_completo}</td>
                <td className="p-3 text-gray-500">{a.correo}</td>
                <td className="p-3 text-xs">{a.fecha_hora}</td>
                <td className="p-3 text-xs text-gray-500">{a.ip_origen || "-"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                    a.resultado === "Exitoso" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}>
                    {a.resultado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
