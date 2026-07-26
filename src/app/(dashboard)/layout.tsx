import { redirect } from "next/navigation";
import { getRolActual } from "@/lib/rbac";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rol = await getRolActual();
  if (!rol) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar rol={rol} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar rol={rol} />
        <main className="flex-1 overflow-y-auto bg-surface-alt scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
