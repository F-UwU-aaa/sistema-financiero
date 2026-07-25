import { NextResponse } from "next/server";
import { deleteSessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ mensaje: "Sesión cerrada" });
  response.headers.set("Set-Cookie", deleteSessionCookie());
  return response;
}
