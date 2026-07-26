import NotificationBell from "@/components/layout/NotificationBell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Sistema de Gestión Financiera
          </span>
          <NotificationBell />
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
