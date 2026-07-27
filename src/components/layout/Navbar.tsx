"use client";

import NotificationBell from "./NotificationBell";
import { LogOut, User } from "lucide-react";

export interface NavbarProps {
  rol: string;
  nombre: string;
}

export default function Navbar({ rol, nombre }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium text-text">{nombre}</p>
            <p className="text-xs text-text-secondary">{rol}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
          className="flex items-center gap-1.5 rounded-md p-1.5 text-text-muted hover:bg-surface-alt hover:text-text transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
