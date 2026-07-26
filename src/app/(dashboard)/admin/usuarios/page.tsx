"use client";

import { useEffect, useState, useCallback } from "react";
import type { UsuarioConRol, HistorialAcceso } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Alert from "@/components/ui/Alert";
import { UserPlus } from "lucide-react";
import DataTable, { type Column } from "@/components/ui/DataTable";

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

  const columnas: Column<UsuarioConRol>[] = [
    { key: "nombre_completo", header: "Nombre" },
    { key: "correo", header: "Correo" },
    { key: "nombre_rol", header: "Rol" },
    { key: "activo", header: "Estado", render: (u) => <EstadoBadge estado={u.activo ? "Aprobado" : "Rechazado"} /> },
    { key: "ultimo_acceso", header: "Último acceso", render: (u) => u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString() : "Nunca" },
    { key: "acciones", header: "Acciones", render: (u) => (
      <div className="flex gap-2">
        <button onClick={() => abrirHistorial(u.id_usuario)} className="text-primary hover:underline text-xs">Ver</button>
        <button onClick={() => abrirEditar(u)} className="text-primary hover:underline text-xs">Editar</button>
        <button onClick={() => toggleActivo(u.id_usuario)} className="text-warning hover:underline text-xs">{u.activo ? "Desactivar" : "Activar"}</button>
        <button onClick={() => restablecerPassword(u.id_usuario)} className="text-orange-600 hover:underline text-xs">Restablecer</button>
        <button onClick={() => eliminarUsuario(u.id_usuario)} className="text-danger hover:underline text-xs">Eliminar</button>
      </div>
    )},
  ];

  return (
    <div className="p-6">
      <PageHeader title="Gestión de Usuarios" actions={<Button onClick={abrirCrear}><UserPlus className="h-4 w-4" /> Nuevo usuario</Button>} />

      <div className="mb-4 flex gap-4">
        <Select value={filtroRol} onChange={(e) => setFiltroRol(e.target.value)} options={[{ value: "", label: "Todos los roles" }, ...ROLES_OPTIONS.map((r) => ({ value: r, label: r }))]} placeholder="Todos los roles" />
        <Select value={filtroActivo} onChange={(e) => setFiltroActivo(e.target.value)} options={[{ value: "", label: "Todos" }, { value: "true", label: "Activos" }, { value: "false", label: "Inactivos" }]} placeholder="Todos" />
      </div>

      <DataTable columns={columnas} data={usuarios} keyExtractor={(u) => u.id_usuario} emptyMessage="No hay usuarios" />

      {(modal === "crear" || modal === "editar") && (
        <Modal open onClose={() => setModal(null)} title={modal === "crear" ? "Crear usuario" : "Editar usuario"} footer={<><Button onClick={() => setModal(null)} variant="secondary">Cancelar</Button><Button onClick={modal === "crear" ? crearUsuario : editarUsuario}>{modal === "crear" ? "Crear" : "Guardar"}</Button></>}>
          {error && <Alert variant="error">{error}</Alert>}
          <Input placeholder="Nombre completo" value={formulario.nombre_completo} onChange={(e) => setFormulario({ ...formulario, nombre_completo: e.target.value })} />
          <Input placeholder="Correo electrónico" type="email" value={formulario.correo} onChange={(e) => setFormulario({ ...formulario, correo: e.target.value })} />
          <Select value={formulario.id_rol} onChange={(e) => setFormulario({ ...formulario, id_rol: e.target.value })} options={[{ value: "", label: "Seleccionar rol" }, ...ROLES_OPTIONS.map((r, i) => ({ value: String(i + 1), label: r }))]} placeholder="Seleccionar rol" />
        </Modal>
      )}

      {modal === "tempPassword" && (
        <Modal open onClose={() => setModal(null)} title="Contraseña temporal generada" footer={<Button onClick={() => setModal(null)}>Cerrar</Button>}>
          <p className="mb-4 text-sm text-gray-600">Esta contraseña solo se muestra una vez. Anótela o cópiela antes de cerrar.</p>
          <div className="mb-4 flex items-center gap-2 rounded-md bg-gray-100 p-3">
            <code className="flex-1 text-sm font-mono">{tempPassword}</code>
            <Button onClick={copiarPassword} variant="secondary">Copiar</Button>
          </div>
        </Modal>
      )}

      {modal === "historial" && (
        <Modal open onClose={() => setModal(null)} title="Historial de accesos" footer={<Button onClick={() => setModal(null)} variant="secondary">Cerrar</Button>}>
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
                      <EstadoBadge estado={h.resultado === "Exitoso" ? "Aprobado" : "Rechazado"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}
    </div>
  );
}
