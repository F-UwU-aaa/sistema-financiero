"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Alert from "@/components/ui/Alert";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al cambiar contraseña");
        return;
      }

      router.push("/");
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
          <h1 className="text-2xl font-bold text-text">Cambiar contraseña</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Es tu primer ingreso. Elegí una nueva contraseña para continuar.
          </p>
        </div>

        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />

          <Input
            label="Confirmar contraseña"
            type="password"
            required
            minLength={8}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            placeholder="Repetí la contraseña"
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full"
          >
            {loading ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>
      </div>
    </div>
  );
}
