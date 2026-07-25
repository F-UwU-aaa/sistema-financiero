import * as crypto from "crypto";
import type { SessionPayload } from "@/types";

const COOKIE_NAME = "session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) throw new Error("COOKIE_SECRET no está definido en variables de entorno");
  return secret;
}

function base64urlEncode(data: string): string {
  return Buffer.from(data).toString("base64url");
}

function base64urlDecode(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

export function signSession(payload: SessionPayload): string {
  const secret = getSecret();
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(payloadJson);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const secret = getSecret();
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const payloadB64 = token.substring(0, dotIndex);
    const receivedSig = token.substring(dotIndex + 1);

    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64url");

    const sigBuffer = Buffer.from(receivedSig, "base64url");
    const expectedBuffer = Buffer.from(expectedSig, "base64url");

    if (sigBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

    const payloadJson = base64urlDecode(payloadB64);
    const payload: SessionPayload = JSON.parse(payloadJson);

    if (!payload.exp || payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function createSessionCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = Math.floor(SESSION_DURATION_MS / 1000);
  return `${COOKIE_NAME}=${token}; HttpOnly; ${isProd ? "Secure; " : ""}SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

export function deleteSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`;
}

export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(Buffer.from(password, "utf8"), salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split(":");
    if (parts.length !== 2) return resolve(false);

    const salt = parts[0];
    const hashHex = parts[1];

    const hashBuffer = Buffer.from(hashHex, "hex");

    crypto.scrypt(Buffer.from(password, "utf8"), salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      if (derivedKey.length !== hashBuffer.length) return resolve(false);
      resolve(crypto.timingSafeEqual(derivedKey, hashBuffer));
    });
  });
}

export { COOKIE_NAME };
