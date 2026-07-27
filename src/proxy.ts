import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, COOKIE_NAME } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/cambiar-password"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico"
  );
}

function isProtectedPath(pathname: string): boolean {
  if (isPublicPath(pathname)) return false;
  if (pathname === "/") return true;
  return pathname.startsWith("/");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname === "/") {
      return NextResponse.next();
    }
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const session = verifySession(token);

  if (!session) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
    return response;
  }

  if (session.debe_cambiar_password && pathname !== "/cambiar-password") {
    return NextResponse.redirect(new URL("/cambiar-password", request.url));
  }

  const roleMap: Record<string, string> = {
    "Administrador del Sistema": "admin",
    "Gerente Financiero": "gerente",
    Contador: "contador",
    Tesorero: "tesorero",
    Auditor: "auditor",
  };
  const slug = roleMap[session.nombre_rol] || "admin";

  if (!session.debe_cambiar_password && pathname === "/cambiar-password") {
    return NextResponse.redirect(new URL(`/${slug}/dashboard`, request.url));
  }

  if (!session.debe_cambiar_password && pathname === "/") {
    return NextResponse.redirect(new URL(`/${slug}/dashboard`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
