"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Receipt,
  HandCoins,
  Building2,
  Scale,
  BookOpen,
  ClipboardList,
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  ShieldCheck,
  BarChart3,
  FileSearch,
} from "lucide-react";

export interface SidebarItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const iconClass = "h-5 w-5 shrink-0";

const menus: Record<string, SidebarItem[]> = {
  "Administrador del Sistema": [
    { label: "Dashboard", href: "/admin/dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { label: "Usuarios", href: "/admin/usuarios", icon: <Users className={iconClass} /> },
    { label: "Configuración", href: "/admin/configuracion", icon: <Settings className={iconClass} /> },
  ],
  "Gerente Financiero": [
    { label: "Dashboard", href: "/gerente/dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { label: "Presupuestos", href: "/gerente/presupuestos", icon: <FileText className={iconClass} /> },
    { label: "Pagos", href: "/gerente/pagos", icon: <Receipt className={iconClass} /> },
    { label: "Proveedores/Clientes", href: "/gerente/proveedores", icon: <Building2 className={iconClass} /> },
    { label: "Auditoría", href: "/gerente/auditoria", icon: <ShieldCheck className={iconClass} /> },
    { label: "Balances", href: "/gerente/balances", icon: <Scale className={iconClass} /> },
  ],
  "Contador": [
    { label: "Dashboard", href: "/contador/dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { label: "Presupuestos", href: "/contador/presupuestos", icon: <FileText className={iconClass} /> },
    { label: "Facturación", href: "/contador/facturacion", icon: <Receipt className={iconClass} /> },
    { label: "Proveedores", href: "/contador/proveedores", icon: <Building2 className={iconClass} /> },
    { label: "Clientes", href: "/contador/clientes", icon: <HandCoins className={iconClass} /> },
    { label: "Cuentas Contables", href: "/contador/cuentas-contables", icon: <BookOpen className={iconClass} /> },
    { label: "Balances", href: "/contador/balances", icon: <Scale className={iconClass} /> },
  ],
  "Tesorero": [
    { label: "Dashboard", href: "/tesorero/dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { label: "Pagos", href: "/tesorero/pagos", icon: <PiggyBank className={iconClass} /> },
    { label: "Cobros", href: "/tesorero/cobros", icon: <CreditCard className={iconClass} /> },
    { label: "Cuentas Bancarias", href: "/tesorero/cuentas-bancarias", icon: <Landmark className={iconClass} /> },
  ],
  Auditor: [
    { label: "Dashboard", href: "/auditor/dashboard", icon: <LayoutDashboard className={iconClass} /> },
    { label: "Presupuestos", href: "/auditor/presupuestos", icon: <FileText className={iconClass} /> },
    { label: "Facturación", href: "/auditor/facturacion", icon: <Receipt className={iconClass} /> },
    { label: "Pagos", href: "/auditor/pagos", icon: <PiggyBank className={iconClass} /> },
    { label: "Cobros", href: "/auditor/cobros", icon: <CreditCard className={iconClass} /> },
    { label: "Balances", href: "/auditor/balances", icon: <Scale className={iconClass} /> },
    { label: "Cuentas Contables", href: "/auditor/cuentas-contables", icon: <BookOpen className={iconClass} /> },
    { label: "Cuentas Bancarias", href: "/auditor/cuentas-bancarias", icon: <Landmark className={iconClass} /> },
    { label: "Proveedores", href: "/auditor/proveedores", icon: <Building2 className={iconClass} /> },
    { label: "Auditoría", href: "/auditor/auditoria", icon: <ClipboardList className={iconClass} /> },
    { label: "Informe", href: "/auditor/informe", icon: <FileSearch className={iconClass} /> },
  ],
};

const rolShortNames: Record<string, string> = {
  "Administrador del Sistema": "Administrador",
  "Gerente Financiero": "Gerente Financiero",
  Contador: "Contador",
  Tesorero: "Tesorero",
  Auditor: "Auditor",
};

export interface SidebarProps {
  rol: string;
  nombre: string;
}

export default function Sidebar({ rol, nombre }: SidebarProps) {
  const pathname = usePathname();
  const items = menus[rol] || [];

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-sidebar">
      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-sm font-bold text-white">
            SF
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">Sistema</p>
            <p className="text-xs text-sidebar-text leading-tight">Financiero</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 overflow-y-auto scrollbar-thin">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-active text-sidebar-text-active"
                  : "text-sidebar-text hover:bg-sidebar-hover hover:text-white"
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-sm font-medium text-white leading-tight">{nombre}</p>
        <p className="text-xs text-sidebar-text">{rolShortNames[rol] || rol}</p>
      </div>
    </aside>
  );
}
