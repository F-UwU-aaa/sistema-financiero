"use client";

import { useEffect, useState, useCallback } from "react";
import type { UsuarioConRol, HistorialAcceso } from "@/types";

const ROLES_OPTIONS = [
  "Administrador del Sistema",
  "Gerente Financiero",
  "Contador",
  "Tesorero",
  "Auditor",
];

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<UsuarioConRol[]>([]);
  const [filtroRol, setFiltroRol] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("");
  const [modal, setModal] = useState<string | null>(null);
  const [usuarioActual, setUsuarioActual] = useState<UsuarioConRol | null>(null);
  const [tempPassword, setTempPassword] = useState("");
  const [historial, setHistorial] = useState<HistorialAcceso[]>([]);
  const [formulario, setFormulario] = useState({
    nombre_completo: "",
    correo: "",
    id_rol: "",
  });
  const [error, setError] = useState("");

  const cargarUsuarios = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroRol) params.set("rol", filtroRol);
    if (filtroActivo) params.set("activo", filtroActivo);

    const res = await fetch(`/api/usuarios?${params.toString()}`);
    const data = await res.json();
    setUsuarios(data.usuarios || []);
  }, [filtroRol, filtroActivo]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  async function abrirHistorial(id: number) {
    const res = await fetch(`/api/usuarios/${id}`);
    const data = await res.json();
    setHistorial(data.historial_accesos || []);
    setUsuarioActual(data.usuario);
    setModal("historial");
  }

  async function crearUsuario() {
    setError("");
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulario),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setTempPassword(data.tempPassword);
    setModal("tempPassword");
    setFormulario({ nombre_completo: "", correo: "", id_rol: "" });
    cargarUsuarios();
  }

  async function editarUsuario() {
    if (!usuarioActual) return;
    setError("");
    const res = await fetch(`/api/usuarios/${usuarioActual.id_usuario}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formulario),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setModal(null);
    cargarUsuarios();
  }

  async function eliminarUsuario(id: number) {
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok && data.tieneActividad) {
      if (confirm("Este usuario tiene actividad registrada. ¿Desea desactivarlo en su lugar?")) {
        await fetch(`/api/usuarios/${id}/acciones`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion: "desactivar" }),
        });
      }
      return;
    }
    cargarUsuarios();
  }

  async function toggleActivo(id: number) {
    await fetch(`/api/usuarios/${id}/acciones`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "desactivar" }),
    });
    cargarUsuarios();
  }

  async function restablecerPassword(id: number) {
    const res = await fetch(`/api/usuarios/${id}/acciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "restablecer_password" }),
    });
    const data = await res.json();
    if (res.ok) {
      setTempPassword(data.tempPassword);
      setModal("tempPassword");
    }
  }

  function abrirCrear() {
    setFormulario({ nombre_completo: "", correo: "", id_rol: "" });
    setUsuarioActual(null);
    setError("");
    setModal("crear");
  }

  function abrirEditar(u: UsuarioConRol) {
    setFormulario({
      nombre_completo: u.nombre_completo,
      correo: u.correo,
      id_rol: String(u.id_rol),
    });
    setUsuarioActual(u);
    setError("");
    setModal("editar");
  }

  function copiarPassword() {
    navigator.clipboard.writeText(tempPassword);
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
        <button onClick={abrirCrear} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          + Nuevo usuario
        </button>
      </div>

      <div className="mb-4 flex gap-4">
        <select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos los roles</option>
          {ROLES_OPTIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3">Nombre</th>
            <th className="p-3">Correo</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Último acceso</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id_usuario} className="border-b">
              <td className="p-3">{u.nombre_completo}</td>
              <td className="p-3">{u.correo}</td>
              <td className="p-3">{u.nombre_rol}</td>
              <td className="p-3">
                <span className={u.activo ? "text-green-600" : "text-red-600"}>
                  {u.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="p-3">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString() : "Nunca"}</td>
              <td className="flex gap-2 p-3">
                <button onClick={() => abrirHistorial(u.id_usuario)} className="text-blue-600 hover:underline text-xs">Ver</button>
                <button onClick={() => abrirEditar(u)} className="text-blue-600 hover:underline text-xs">Editar</button>
                <button onClick={() => toggleActivo(u.id_usuario)} className="text-yellow-600 hover:underline text-xs">
                  {u.activo ? "Desactivar" : "Activar"}
                </button>
                <button onClick={() => restablecerPassword(u.id_usuario)} className="text-orange-600 hover:underline text-xs">Restablecer</button>
                <button onClick={() => eliminarUsuario(u.id_usuario)} className="text-red-600 hover:underline text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {(modal === "crear" || modal === "editar") && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-4 text-lg font-bold">{modal === "crear" ? "Crear usuario" : "Editar usuario"}</h2>
            {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}
            <input placeholder="Nombre completo" value={formulario.nombre_completo} onChange={(e) => setFormulario({ ...formulario, nombre_completo: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <input placeholder="Correo electrónico" type="email" value={formulario.correo} onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })} className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <select value={formulario.id_rol} onChange={(e) => setFormulario({ ...formulario, id_rol: e.target.value })} className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
              <option value="">Seleccionar rol</option>
              {ROLES_OPTIONS.map((r, i) => (
                <option key={r} value={i + 1}>{r}</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border px-4 py-2 text-sm">Cancelar</button>
              <button onClick={modal === "crear" ? crearUsuario : editarUsuario} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                {modal === "crear" ? "Crear" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "tempPassword" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Contraseña temporal generada</h2>
            <p className="mb-4 text-sm text-gray-600">Esta contraseña solo se muestra una vez. Anótela o cópiela antes de cerrar.</p>
            <div className="mb-4 flex items-center gap-2 rounded-md bg-gray-100 p-3">
              <code className="flex-1 text-sm font-mono">{tempPassword}</code>
              <button onClick={copiarPassword} className="text-blue-600 hover:underline text-xs">Copiar</button>
            </div>
            <button onClick={() => setModal(null)} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Cerrar</button>
          </div>
        </div>
      )}

      {modal === "historial" && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Historial de accesos</h2>
            <p className="mb-4 text-sm text-gray-600">{usuarioActual?.nombre_completo} — {usuarioActual?.correo}</p>
            {historial.length === 0 ? (
              <p className="text-sm text-gray-500">Sin registros de acceso.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="border-b">
                  <tr><th className="p-2">Fecha</th><th className="p-2">IP</th><th className="p-2">Resultado</th></tr>
                </thead>
                <tbody>
                  {historial.map((h) => (
                    <tr key={h.id_acceso} className="border-b">
                      <td className="p-2">{new Date(h.fecha_hora).toLocaleString()}</td>
                      <td className="p-2">{h.ip_origen}</td>
                      <td className="p-2">
                        <span className={h.resultado === "Exitoso" ? "text-green-600" : "text-red-600"}>
                          {h.resultado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <button onClick={() => setModal(null)} className="mt-4 w-full rounded-md border border-gray-300 px-4 py-2 text-sm">Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
