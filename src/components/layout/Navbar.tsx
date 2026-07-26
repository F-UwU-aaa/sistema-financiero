"use client";

import NotificationBell from "./NotificationBell";
import { LogOut } from "lucide-react";

export interface NavbarProps {
  rol: string;
}

export default function Navbar({ rol }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div />
      <div className="flex items-center gap-4">
        <NotificationBell />
        <div className="h-5 w-px bg-border" />
        <span className="text-sm text-text-secondary">{rol}</span>
        <a
          href="/api/auth/logout"
          className="flex items-center gap-1.5 rounded-md p-1.5 text-text-muted hover:bg-surface-alt hover:text-text transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
        </a>
      </div>
    </header>
  );
}
