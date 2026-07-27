"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

export default function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Credenciales inválidas");
        return;
      }

      if (data.debe_cambiar_password) {
        router.push("/cambiar-password");
      } else {
        const roleMap: Record<string, string> = {
          "Administrador del Sistema": "admin",
          "Gerente Financiero": "gerente",
          Contador: "contador",
          Tesorero: "tesorero",
          Auditor: "auditor",
        };
        const slug = roleMap[data.nombre_rol] || "admin";
        router.push(`/${slug}/dashboard`);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-alt">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-8 shadow-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-white">
            SF
          </div>
          <h1 className="text-2xl font-bold text-text">Sistema Financiero</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Iniciá sesión para continuar
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Correo electrónico"
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="correo@ejemplo.com"
          />

          <Input
            label="Contraseña"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            {loading ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="mb-3 text-center text-xs font-medium text-text-secondary">
            Acceso rápido (pruebas)
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: "Admin", nombre: "Ana Pérez", correo: "admin@empresa.com", color: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" },
              { label: "Gerente", nombre: "Luis Gómez", correo: "gerente@empresa.com", color: "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200" },
              { label: "Contador", nombre: "Marta Ríos", correo: "contador@empresa.com", color: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200" },
              { label: "Tesorero", nombre: "Jorge Salas", correo: "tesorero@empresa.com", color: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200" },
              { label: "Auditor", nombre: "Clara Vega", correo: "auditor@empresa.com", color: "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                title={item.nombre}
                onClick={() => {
                  setCorreo(item.correo);
                  setPassword("password123");
                }}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${item.color}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
