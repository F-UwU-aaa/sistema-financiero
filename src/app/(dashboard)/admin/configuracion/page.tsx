"use client";

import { useEffect, useState, useCallback } from "react";
import type { Area, Categoria, PeriodoFiscal, ConfigItem } from "@/types";

export default function ConfiguracionPage() {
  const [pestaña, setPestaña] = useState<"areas" | "categorias" | "periodos" | "sistema">("areas");

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Configuración del Sistema</h1>

      <div className="mb-6 flex gap-2 border-b">
        {[
          { key: "areas", label: "Áreas / Departamentos" },
          { key: "categorias", label: "Categorías" },
          { key: "periodos", label: "Períodos Fiscales" },
          { key: "sistema", label: "Sistema" },
        ].map((p) => (
          <button
            key={p.key}
            onClick={() => setPestaña(p.key as typeof pestaña)}
            className={`px-4 py-2 text-sm ${pestaña === p.key ? "border-b-2 border-blue-600 font-medium text-blue-600" : "text-gray-600 hover:text-gray-900"}`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {pestaña === "areas" && <SeccionAreas />}
      {pestaña === "categorias" && <SeccionCategorias />}
      {pestaña === "periodos" && <SeccionPeriodos />}
      {pestaña === "sistema" && <SeccionSistema />}
    </div>
  );
}

function SeccionAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [editando, setEditando] = useState<Area | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/areas");
    const data = await res.json();
    setAreas(data.areas || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (editando) {
      await fetch(`/api/areas/${editando.id_area}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_area: nombre, descripcion }),
      });
    } else {
      await fetch("/api/areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_area: nombre, descripcion }),
      });
    }
    setNombre(""); setDescripcion(""); setEditando(null);
    cargar();
  }

  async function desactivar(id: number) {
    await fetch(`/api/areas/${id}`, { method: "DELETE" });
    cargar();
  }

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input placeholder="Nombre del área" value={nombre} onChange={(e) => setNombre(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input placeholder="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button onClick={guardar} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          {editando ? "Actualizar" : "Crear"}
        </button>
        {editando && <button onClick={() => { setEditando(null); setNombre(""); setDescripcion(""); }} className="text-sm text-gray-600">Cancelar</button>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Nombre</th><th className="p-3">Descripción</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a.id_area} className="border-b">
              <td className="p-3">{a.nombre_area}</td>
              <td className="p-3">{a.descripcion || "—"}</td>
              <td className="p-3">
                <span className={a.activo ? "text-green-600" : "text-red-600"}>
                  {a.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
              <td className="p-3">
                <button onClick={() => { setEditando(a); setNombre(a.nombre_area); setDescripcion(a.descripcion || ""); }} className="mr-3 text-blue-600 hover:underline text-xs">Editar</button>
                {a.activo && <button onClick={() => desactivar(a.id_area)} className="text-red-600 hover:underline text-xs">Desactivar</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeccionCategorias() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"Ingreso" | "Egreso">("Ingreso");
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("");

  const cargar = useCallback(async () => {
    const params = filtroTipo ? `?tipo=${filtroTipo}` : "";
    const res = await fetch(`/api/categorias${params}`);
    const data = await res.json();
    setCategorias(data.categorias || []);
  }, [filtroTipo]);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    if (editando) {
      await fetch(`/api/categorias/${editando.id_categoria}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_categoria: nombre, tipo }),
      });
    } else {
      await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_categoria: nombre, tipo }),
      });
    }
    setNombre(""); setTipo("Ingreso"); setEditando(null);
    cargar();
  }

  async function eliminar(id: number) {
    const res = await fetch(`/api/categorias/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    cargar();
  }

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="">Todos</option>
          <option value="Ingreso">Ingreso</option>
          <option value="Egreso">Egreso</option>
        </select>
      </div>
      <div className="mb-4 flex gap-3">
        <input placeholder="Nombre categoría" value={nombre} onChange={(e) => setNombre(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <select value={tipo} onChange={(e) => setTipo(e.target.value as "Ingreso" | "Egreso")} className="rounded-md border border-gray-300 px-3 py-2 text-sm">
          <option value="Ingreso">Ingreso</option>
          <option value="Egreso">Egreso</option>
        </select>
        <button onClick={guardar} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          {editando ? "Actualizar" : "Crear"}
        </button>
        {editando && <button onClick={() => { setEditando(null); setNombre(""); }} className="text-sm text-gray-600">Cancelar</button>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {categorias.map((c) => (
            <tr key={c.id_categoria} className="border-b">
              <td className="p-3">{c.nombre_categoria}</td>
              <td className="p-3">{c.tipo}</td>
              <td className="p-3">
                <button onClick={() => { setEditando(c); setNombre(c.nombre_categoria); setTipo(c.tipo as "Ingreso" | "Egreso"); }} className="mr-3 text-blue-600 hover:underline text-xs">Editar</button>
                <button onClick={() => eliminar(c.id_categoria)} className="text-red-600 hover:underline text-xs">Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeccionPeriodos() {
  const [periodos, setPeriodos] = useState<PeriodoFiscal[]>([]);
  const [nombre, setNombre] = useState("");
  const [inicio, setInicio] = useState("");
  const [fin, setFin] = useState("");
  const [editando, setEditando] = useState<PeriodoFiscal | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/periodos");
    const data = await res.json();
    setPeriodos(data.periodos || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar() {
    const body = { nombre_periodo: nombre, fecha_inicio: inicio, fecha_fin: fin };
    if (editando) {
      await fetch(`/api/periodos/${editando.id_periodo}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      const res = await fetch("/api/periodos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error); return; }
    }
    setNombre(""); setInicio(""); setFin(""); setEditando(null);
    cargar();
  }

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input placeholder="Nombre período" value={nombre} onChange={(e) => setNombre(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <input type="date" value={fin} onChange={(e) => setFin(e.target.value)} className="rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button onClick={guardar} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
          {editando ? "Actualizar" : "Crear"}
        </button>
        {editando && <button onClick={() => { setEditando(null); setNombre(""); setInicio(""); setFin(""); }} className="text-sm text-gray-600">Cancelar</button>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr><th className="p-3">Nombre</th><th className="p-3">Inicio</th><th className="p-3">Fin</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {periodos.map((p) => (
            <tr key={p.id_periodo} className="border-b">
              <td className="p-3">{p.nombre_periodo}</td>
              <td className="p-3">{p.fecha_inicio}</td>
              <td className="p-3">{p.fecha_fin}</td>
              <td className="p-3">{p.estado}</td>
              <td className="p-3">
                <button onClick={() => { setEditando(p); setNombre(p.nombre_periodo); setInicio(p.fecha_inicio); setFin(p.fecha_fin); }} className="text-blue-600 hover:underline text-xs">Editar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeccionSistema() {
  const [config, setConfig] = useState<ConfigItem[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const res = await fetch("/api/configuracion");
    const data = await res.json();
    setConfig(data.configuracion || []);
    const map: Record<string, string> = {};
    (data.configuracion || []).forEach((c: ConfigItem) => { map[c.clave] = c.valor; });
    setForm(map);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function guardar(clave: string) {
    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clave, valor: form[clave] || "" }),
    });
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-500">
        Nota: las claves <code>duracion_sesion_minutos</code> y <code>dias_expiracion_password</code> son configurables aquí pero aún no están conectadas al endpoint de login, que sigue usando expiración hardcodeada a 24h.
      </p>
      <div className="space-y-4">
        {config.map((c) => (
          <div key={c.clave} className="flex items-center gap-4">
            <label className="w-64 text-sm font-medium text-gray-700">{c.descripcion || c.clave}</label>
            <input
              value={form[c.clave] || ""}
              onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
            <button onClick={() => guardar(c.clave)} className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
              Guardar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
