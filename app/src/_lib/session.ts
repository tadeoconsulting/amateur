import { SignJWT, jwtVerify } from "jose";

// Este módulo no importa Prisma ni next/headers a propósito: también lo usa
// src/proxy.ts, que corre aparte del resto de la app.

export const SESSION_COOKIE = "amateur_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 días, en segundos

function getKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET no está definido o tiene menos de 32 caracteres");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getKey());
}

/** Devuelve el id de usuario de un token válido, o null si falta, expiró o fue alterado. */
export async function verifySessionToken(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  const key = getKey(); // fuera del try: un AUTH_SECRET faltante debe fallar en voz alta
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
