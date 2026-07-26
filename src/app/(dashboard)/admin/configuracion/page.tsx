"use client";

import { useEffect, useState, useCallback } from "react";
import type { Area, Categoria, PeriodoFiscal, ConfigItem } from "@/types";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import EstadoBadge from "@/components/ui/EstadoBadge";
import Card from "@/components/ui/Card";
import Alert from "@/components/ui/Alert";
import clsx from "clsx";

export default function ConfiguracionPage() {
  const [pestaña, setPestaña] = useState<"areas" | "categorias" | "periodos" | "sistema">("areas");

  return (
    <div className="p-6">
      <PageHeader title="Configuración del Sistema" />

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
            className={clsx(
              "px-4 py-2 text-sm",
              pestaña === p.key
                ? "border-b-2 border-primary font-medium text-primary"
                : "text-text-secondary hover:text-text"
            )}
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
    <Card>
      <div className="mb-4 flex gap-3">
        <Input placeholder="Nombre del área" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input placeholder="Descripción (opcional)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        <Button onClick={guardar}>
          {editando ? "Actualizar" : "Crear"}
        </Button>
        {editando && <Button variant="ghost" onClick={() => { setEditando(null); setNombre(""); setDescripcion(""); }}>Cancelar</Button>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-alt">
          <tr><th className="p-3">Nombre</th><th className="p-3">Descripción</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {areas.map((a) => (
            <tr key={a.id_area} className="border-b border-border">
              <td className="p-3 text-text">{a.nombre_area}</td>
              <td className="p-3 text-text-secondary">{a.descripcion || "—"}</td>
              <td className="p-3">
                <EstadoBadge estado={a.activo ? "Activo" : "Inactivo"} />
              </td>
              <td className="p-3">
                <Button variant="ghost" size="sm" onClick={() => { setEditando(a); setNombre(a.nombre_area); setDescripcion(a.descripcion || ""); }}>Editar</Button>
                {a.activo && <Button variant="danger" size="sm" onClick={() => desactivar(a.id_area)}>Desactivar</Button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
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
    <Card>
      <div className="mb-4 flex gap-3">
        <Select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          options={[
            { value: "", label: "Todos" },
            { value: "Ingreso", label: "Ingreso" },
            { value: "Egreso", label: "Egreso" },
          ]}
          placeholder="Filtrar por tipo"
        />
      </div>
      <div className="mb-4 flex gap-3">
        <Input placeholder="Nombre categoría" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as "Ingreso" | "Egreso")}
          options={[
            { value: "Ingreso", label: "Ingreso" },
            { value: "Egreso", label: "Egreso" },
          ]}
        />
        <Button onClick={guardar}>
          {editando ? "Actualizar" : "Crear"}
        </Button>
        {editando && <Button variant="ghost" onClick={() => { setEditando(null); setNombre(""); }}>Cancelar</Button>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-alt">
          <tr><th className="p-3">Nombre</th><th className="p-3">Tipo</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {categorias.map((c) => (
            <tr key={c.id_categoria} className="border-b border-border">
              <td className="p-3 text-text">{c.nombre_categoria}</td>
              <td className="p-3 text-text-secondary">{c.tipo}</td>
              <td className="p-3">
                <Button variant="ghost" size="sm" onClick={() => { setEditando(c); setNombre(c.nombre_categoria); setTipo(c.tipo as "Ingreso" | "Egreso"); }}>Editar</Button>
                <Button variant="danger" size="sm" onClick={() => eliminar(c.id_categoria)}>Eliminar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
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
    <Card>
      <div className="mb-4 flex gap-3">
        <Input placeholder="Nombre período" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
        <Input type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
        <Button onClick={guardar}>
          {editando ? "Actualizar" : "Crear"}
        </Button>
        {editando && <Button variant="ghost" onClick={() => { setEditando(null); setNombre(""); setInicio(""); setFin(""); }}>Cancelar</Button>}
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-surface-alt">
          <tr><th className="p-3">Nombre</th><th className="p-3">Inicio</th><th className="p-3">Fin</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr>
        </thead>
        <tbody>
          {periodos.map((p) => (
            <tr key={p.id_periodo} className="border-b border-border">
              <td className="p-3 text-text">{p.nombre_periodo}</td>
              <td className="p-3 text-text-secondary">{p.fecha_inicio}</td>
              <td className="p-3 text-text-secondary">{p.fecha_fin}</td>
              <td className="p-3">
                <EstadoBadge estado={p.estado} />
              </td>
              <td className="p-3">
                <Button variant="ghost" size="sm" onClick={() => { setEditando(p); setNombre(p.nombre_periodo); setInicio(p.fecha_inicio); setFin(p.fecha_fin); }}>Editar</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
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
    <Card>
      <Alert variant="warning">
        Las claves <code>duracion_sesion_minutos</code> y <code>dias_expiracion_password</code> son configurables aquí pero aún no están conectadas al endpoint de login, que sigue usando expiración hardcodeada a 24h.
      </Alert>
      <div className="space-y-4 mt-4">
        {config.map((c) => (
          <div key={c.clave} className="flex items-center gap-4">
            <label className="w-64 text-sm font-medium text-text">{c.descripcion || c.clave}</label>
            <Input
              value={form[c.clave] || ""}
              onChange={(e) => setForm({ ...form, [c.clave]: e.target.value })}
              className="flex-1"
            />
            <Button size="sm" onClick={() => guardar(c.clave)}>
              Guardar
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
