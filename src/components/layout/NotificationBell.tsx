"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Notificacion } from "@/types";

export default function NotificationBell() {
  const [noLeidas, setNoLeidas] = useState(0);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const cargarNoLeidas = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones/no-leidas");
      if (res.ok) {
        const data = await res.json();
        setNoLeidas(data.cantidad);
      }
    } catch {}
  }, []);

  const cargarNotificaciones = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch("/api/notificaciones");
      if (res.ok) {
        const data = await res.json();
        setNotificaciones(data.notificaciones);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarNoLeidas();
    const interval = setInterval(cargarNoLeidas, 30000);
    return () => clearInterval(interval);
  }, [cargarNoLeidas]);

  useEffect(() => {
    if (abierto) {
      cargarNotificaciones();
    }
  }, [abierto, cargarNotificaciones]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const marcarLeida = async (id: number) => {
    await fetch(`/api/notificaciones/${id}`, { method: "PATCH" });
    setNotificaciones((prev) =>
      prev.map((n) => (n.id_notificacion === id ? { ...n, leida: true } : n))
    );
    setNoLeidas((prev) => Math.max(0, prev - 1));
  };

  const marcarTodas = async () => {
    const res = await fetch("/api/notificaciones/marcar-todas", {
      method: "POST",
    });
    if (res.ok) {
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setNoLeidas(0);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setAbierto(!abierto)}
        className="relative rounded-full p-2 text-gray-600 hover:bg-gray-100"
        aria-label="Notificaciones"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {noLeidas > 99 ? "99+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-800">
              Notificaciones
            </h3>
            {noLeidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs text-blue-600 hover:underline"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {cargando ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                Cargando...
              </div>
            ) : notificaciones.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id_notificacion}
                  onClick={() => {
                    if (!n.leida) marcarLeida(n.id_notificacion);
                  }}
                  className={`w-full border-b border-gray-100 px-4 py-3 text-left text-sm last:border-0 hover:bg-gray-50 ${
                    !n.leida ? "bg-blue-50" : ""
                  }`}
                >
                  <p className="text-gray-800">{n.mensaje}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {new Date(n.fecha_creacion).toLocaleString("es-BO")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
