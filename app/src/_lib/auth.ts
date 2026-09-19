import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySessionToken } from "./session";

// ─── Contraseñas ────────────────────────────────────────────────

const BCRYPT_COST = 10;
export const MIN_PASSWORD_LENGTH = 8;
// bcrypt ignora todo lo que pase de 72 bytes
export const MAX_PASSWORD_LENGTH = 72;

/** Devuelve un mensaje de error, o null si la contraseña es válida. */
export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
  }
  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_LENGTH) {
    return `La contraseña no puede superar ${MAX_PASSWORD_LENGTH} caracteres`;
  }
  return null;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_COST);
}

let dummyHash: Promise<string> | null = null;

/**
 * Compara contra el hash del usuario. Si el usuario no existe se compara contra un
 * hash falso, para que el tiempo de respuesta no revele qué correos están registrados.
 */
export async function verifyPassword(password: string, hash: string | null | undefined) {
  if (!hash) {
    dummyHash ??= bcrypt.hash("contraseña-de-relleno", BCRYPT_COST);
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false; // hash inválido, como el "$2b$10$placeholder" del seed
  }
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 && email.length <= 254 && email.includes("@") ? email : null;
}

// ─── Sesión (cookie httpOnly con JWT firmado) ───────────────────

export async function createSession(userId: string) {
  const token = await signSession(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export type CurrentUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: Role[];
};

/**
 * Usuario de la sesión actual. Los roles se leen de la base en cada request (no del
 * token), así quitar un rol o borrar un usuario surte efecto al instante.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const userId = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      roles: { select: { role: true } },
    },
  });
  if (!user) return null;

  return { ...user, roles: user.roles.map((r) => r.role) };
}

// ─── Guards para route handlers ─────────────────────────────────
//
//   const auth = await requireUser();
//   if ("response" in auth) return auth.response;
//   const { user } = auth;

export const unauthorized = () => Response.json({ error: "Debes iniciar sesión" }, { status: 401 });
export const forbidden = () => Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });

type Guard = { user: CurrentUser } | { response: Response };

export function isAdmin(user: CurrentUser) {
  return user.roles.includes(Role.ADMIN);
}

export async function requireUser(): Promise<Guard> {
  const user = await getCurrentUser();
  return user ? { user } : { response: unauthorized() };
}

/** Exige alguno de los roles dados. ADMIN siempre pasa. */
export async function requireRole(...roles: Role[]): Promise<Guard> {
  const auth = await requireUser();
  if ("response" in auth) return auth;
  const allowed = isAdmin(auth.user) || roles.some((r) => auth.user.roles.includes(r));
  return allowed ? auth : { response: forbidden() };
}

// ─── Permisos sobre recursos concretos ──────────────────────────

/** ¿Es el organizador del torneo (o admin)? Falso si el torneo no existe. */
export async function canManageTournament(user: CurrentUser, tournamentId: string) {
  if (isAdmin(user)) return true;
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { organizerId: true },
  });
  return tournament?.organizerId === user.id;
}

/** ¿Es el dueño del club (o admin)? Falso si el club no existe. */
export async function canManageClub(user: CurrentUser, clubId: string) {
  if (isAdmin(user)) return true;
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { ownerId: true } });
  return club?.ownerId === user.id;
}

/** ¿Puede gestionar el partido? Se decide por el organizador de su torneo. */
export async function canManageMatch(user: CurrentUser, matchId: string) {
  if (isAdmin(user)) return true;
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { tournament: { select: { organizerId: true } } },
  });
  return match?.tournament.organizerId === user.id;
}

// ─── Utilidades de entrada ──────────────────────────────────────

/** Lee el body como objeto JSON. Devuelve null si no es JSON o no es un objeto. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const badRequest = (error = "Solicitud inválida") => Response.json({ error }, { status: 400 });

/** Copia solo las claves permitidas (evita que el cliente escriba campos como organizerId o roles). */
export function pick<T extends string>(source: Record<string, unknown>, keys: readonly T[]) {
  const out: Partial<Record<T, unknown>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}
