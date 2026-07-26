"use client";

import { useEffect, useState, useCallback } from "react";
import type { SolicitudPago, CuentaBancaria } from "@/types";

export default function PagosTesoreroPage() {
  const [solicitudes, setSolicitudes] = useState<SolicitudPago[]>([]);
  const [cuentas, setCuentas] = useState<CuentaBancaria[]>([]);
  const [modal, setModal] = useState<string | null>(null);
  const [seleccionada, setSeleccionada] = useState<SolicitudPago | null>(null);

  const [formCuenta, setFormCuenta] = useState("");
  const [formMetodo, setFormMetodo] = useState("Transferencia");
  const [formOperacion, setFormOperacion] = useState("");
  const [observacion, setObservacion] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/solicitudes-pago?estado=Aprobada");
    const data = await res.json();
    setSolicitudes(data.solicitudes || []);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    fetch("/api/cuentas-bancarias").then(r => r.json()).then(d => {
      setCuentas((d.cuentas || []).filter((c: CuentaBancaria) => c.activo));
    });
  }, []);

  function abrirEjecutar(s: SolicitudPago) {
    setSeleccionada(s); setFormCuenta(""); setFormMetodo("Transferencia"); setFormOperacion(""); setModal("ejecutar");
  }

  function abrirDevolver(s: SolicitudPago) {
    setSeleccionada(s); setObservacion(""); setModal("devolver");
  }

  async function ejecutar() {
    if (!seleccionada || !formCuenta || !formOperacion.trim()) return;
    const res = await fetch("/api/pagos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id_solicitud: seleccionada.id_solicitud,
        id_cuenta_bancaria: Number(formCuenta),
        metodo: formMetodo,
        numero_operacion: formOperacion.trim(),
      }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargar();
  }

  async function devolver() {
    if (!seleccionada || !observacion.trim()) return;
    const res = await fetch(`/api/pagos/${seleccionada.id_solicitud}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accion: "devolver", observacion }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error); return; }
    setModal(null);
    cargar();
  }

  function saldoCuenta(id: number) {
    const c = cuentas.find(cc => cc.id_cuenta_bancaria === id);
    return c ? Number(c.saldo_actual) : 0;
  }

  const colorAprobacion: Record<string, string> = {
    Automatica: "text-green-600",
    Manual: "text-blue-600",
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Cola de Pagos</h1>
      <p className="mb-4 text-sm text-gray-600">Solicitudes aprobadas (automática o manualmente) listas para ejecución.</p>

      <table className="w-full text-left text-sm">
        <thead className="border-b bg-gray-50">
          <tr>
            <th className="p-3"># Solicitud</th>
            <th className="p-3"># Factura</th>
            <th className="p-3">Proveedor</th>
            <th className="p-3">Monto</th>
            <th className="p-3">Aprobación</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {solicitudes.map(s => (
            <tr key={s.id_solicitud} className="border-b">
              <td className="p-3">{s.id_solicitud}</td>
              <td className="p-3">{s.numero_factura || "—"}</td>
              <td className="p-3">{s.razon_social_proveedor || "—"}</td>
              <td className="p-3">${Number(s.monto).toLocaleString()}</td>
              <td className={`p-3 font-medium ${colorAprobacion[s.tipo_aprobacion] || ""}`}>
                {s.tipo_aprobacion === "Automatica" ? "Automática" : "Manual"}
              </td>
              <td className="p-3">
                <button onClick={() => abrirEjecutar(s)} className="mr-3 text-green-600 hover:underline text-xs">Ejecutar</button>
                <button onClick={() => abrirDevolver(s)} className="text-orange-600 hover:underline text-xs">Devolver</button>
              </td>
            </tr>
          ))}
          {solicitudes.length === 0 && (
            <tr><td colSpan={6} className="p-6 text-center text-gray-500">No hay pagos pendientes de ejecución</td></tr>
          )}
        </tbody>
      </table>

      {modal === "ejecutar" && seleccionada && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Ejecutar pago</h2>
            <p className="mb-1 text-sm text-gray-600">Solicitud #{seleccionada.id_solicitud} — ${Number(seleccionada.monto).toLocaleString()}</p>
            <p className="mb-3 text-sm text-gray-600">Proveedor: {seleccionada.razon_social_proveedor || "—"}</p>

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Cuenta de origen</label>
              <select value={formCuenta} onChange={e => setFormCuenta(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="">Seleccionar cuenta</option>
                {cuentas.map(c => (
                  <option key={c.id_cuenta_bancaria} value={c.id_cuenta_bancaria}>
                    {c.nombre_cuenta} — Saldo: ${Number(c.saldo_actual).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {formCuenta && saldoCuenta(Number(formCuenta)) < Number(seleccionada.monto) && (
              <div className="mb-3 rounded bg-red-50 p-3 text-sm text-red-700">
                Saldo insuficiente: disponible ${saldoCuenta(Number(formCuenta)).toLocaleString()}, requerido ${Number(seleccionada.monto).toLocaleString()}
              </div>
            )}

            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-700">Método de pago</label>
              <select value={formMetodo} onChange={e => setFormMetodo(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm">
                <option value="Transferencia">Transferencia</option>
                <option value="Cheque">Cheque</option>
                <option value="Efectivo">Efectivo</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Nº de operación / comprobante</label>
              <input type="text" value={formOperacion} onChange={e => setFormOperacion(e.target.value)} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" placeholder="Ej: TRF-001234" />
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button
                onClick={ejecutar}
                disabled={!formCuenta || !formOperacion.trim() || (formCuenta ? saldoCuenta(Number(formCuenta)) < Number(seleccionada.monto) : true)}
                className="rounded-md bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
              >
                Ejecutar pago
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === "devolver" && seleccionada && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="mb-2 text-lg font-bold">Devolver solicitud</h2>
            <p className="mb-1 text-sm text-gray-600">Solicitud #{seleccionada.id_solicitud} — ${Number(seleccionada.monto).toLocaleString()}</p>
            <p className="mb-3 text-sm text-gray-600">Proveedor: {seleccionada.razon_social_proveedor || "—"}</p>
            <p className="mb-3 text-sm text-orange-700">La solicitud será devuelta al Contador con una observación.</p>
            <textarea value={observacion} onChange={e => setObservacion(e.target.value)} rows={3} placeholder="Observación (requerida) — ej: datos bancarios incorrectos" className="mb-4 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
            <div className="flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rounded-md border border-gray-300 px-4 py-2 text-sm">Cancelar</button>
              <button onClick={devolver} disabled={!observacion.trim()} className="rounded-md bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700 disabled:opacity-50">Devolver</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
