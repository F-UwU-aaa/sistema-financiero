import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/rbac";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={usuario.nombre_rol} nombre={usuario.nombre_completo} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar rol={usuario.nombre_rol} nombre={usuario.nombre_completo} />
        <main className="flex-1 overflow-y-auto bg-surface-alt scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
