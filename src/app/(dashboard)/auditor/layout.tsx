import { redirect } from "next/navigation";
import { getRolActual } from "@/lib/rbac";

export default async function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rol = await getRolActual();
  if (!rol) redirect("/login");
  if (rol === "Administrador del Sistema") redirect("/");
  if (rol === "Auditor" || rol === "Gerente Financiero") {
    return <div>{children}</div>;
  }
  redirect("/");
}
