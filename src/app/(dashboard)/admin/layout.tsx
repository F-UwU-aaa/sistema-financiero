import { redirect } from "next/navigation";
import { getRolActual } from "@/lib/rbac";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const rol = await getRolActual();

  if (!rol) {
    redirect("/login");
  }

  if (rol === "Administrador del Sistema") {
    return <div>{children}</div>;
  }

  if (rol === "Auditor") {
    return <div>{children}</div>;
  }

  redirect("/");
}
