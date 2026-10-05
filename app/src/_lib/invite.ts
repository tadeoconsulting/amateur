import { randomBytes } from "node:crypto";
import { Role } from "@prisma/client";
import { prisma } from "./prisma";

// Invitaciones a un club. Hay dos clases, las dos identificadas por un token secreto:
//
//  - "link":  el link del club para compartir por WhatsApp. Sirve para cualquiera que lo abra
//             y no vence, pero el dueño lo revoca generando uno nuevo.
//  - "email": una invitación a una persona concreta (PlayerInvitation). La acepta solo la
//             cuenta con ese correo, una vez, dentro de los INVITE_DAYS días.

export const INVITE_DAYS = 7;

export const newInviteToken = () => randomBytes(18).toString("base64url");

const CLUB_SELECT = { id: true, name: true, shortName: true, color: true, logoUrl: true } as const;

export type ClubPreview = { id: string; name: string; shortName: string; color: string | null; logoUrl: string | null };

export type ResolvedInvitation =
  | { ok: true; kind: "link"; club: ClubPreview }
  | { ok: true; kind: "email"; club: ClubPreview; invitation: { id: string; email: string } }
  | { ok: false; reason: "not_found" | "expired" | "used" };

export async function resolveInvitation(token: string): Promise<ResolvedInvitation> {
  if (!token || token.length > 100) return { ok: false, reason: "not_found" };

  const invitation = await prisma.playerInvitation.findUnique({
    where: { token },
    include: { club: { select: CLUB_SELECT } },
  });
  if (invitation) {
    if (invitation.status !== "pending") return { ok: false, reason: "used" };
    if (invitation.expiresAt <= new Date()) return { ok: false, reason: "expired" };
    return { ok: true, kind: "email", club: invitation.club, invitation: { id: invitation.id, email: invitation.email } };
  }

  const club = await prisma.club.findUnique({ where: { inviteToken: token }, select: CLUB_SELECT });
  return club ? { ok: true, kind: "link", club } : { ok: false, reason: "not_found" };
}

// ─── Invitaciones de staff (delegado, asistente o DT) ──────────────────────
// Mismo patrón que PlayerInvitation, pero sin las dos "clases" (no hay link de staff) y sin
// exclusividad de club: aceptarla solo agrega una fila a StaffMember, nunca reemplaza otra.

export type ResolvedStaffInvitation =
  | { ok: true; club: ClubPreview; invitation: { id: string; email: string; role: string } }
  | { ok: false; reason: "not_found" | "expired" | "used" };

export async function resolveStaffInvitation(token: string): Promise<ResolvedStaffInvitation> {
  if (!token || token.length > 100) return { ok: false, reason: "not_found" };

  const invitation = await prisma.staffInvitation.findUnique({
    where: { token },
    include: { club: { select: CLUB_SELECT } },
  });
  if (!invitation) return { ok: false, reason: "not_found" };
  if (invitation.status !== "pending") return { ok: false, reason: "used" };
  if (invitation.expiresAt <= new Date()) return { ok: false, reason: "expired" };
  return { ok: true, club: invitation.club, invitation: { id: invitation.id, email: invitation.email, role: invitation.role } };
}

/** Respuesta HTTP para una invitación que no se puede usar. */
export function invitationProblem(reason: "not_found" | "expired" | "used") {
  if (reason === "not_found") return Response.json({ error: "La invitación no existe o fue revocada" }, { status: 404 });
  const error = reason === "expired" ? "La invitación venció" : "La invitación ya fue usada";
  return Response.json({ error }, { status: 410 });
}

export type JoinResult = { joined: true; already: boolean };

/**
 * Suma a un usuario al club como jugador. Puede estar en varios clubes: cada uno es una ficha
 * (PlayerProfile) propia con su categoría, dorsal y estadísticas, así que entrar a uno no toca los
 * otros. Si ya estaba en este club no hace nada (solo actualiza la posición, si se mandó una). Si
 * tenía una ficha "libre" (sin club, p. ej. la del registro) se usa esa en vez de crear otra.
 */
export async function joinClub(
  userId: string,
  clubId: string,
  options: { position?: string | null } = {}
): Promise<JoinResult> {
  const position = options.position?.trim() || null;

  const profiles = await prisma.playerProfile.findMany({
    where: { userId },
    select: { id: true, clubId: true, position: true },
    orderBy: { createdAt: "asc" },
  });

  const inClub = profiles.find((p) => p.clubId === clubId);
  if (inClub) {
    if (position) await prisma.playerProfile.update({ where: { id: inClub.id }, data: { position } });
    return { joined: true, already: true };
  }

  const free = profiles.find((p) => p.clubId === null);
  const roleUpsert = prisma.userRole.upsert({
    where: { userId_role: { userId, role: Role.JUGADOR } },
    update: {},
    create: { userId, role: Role.JUGADOR },
  });

  if (free) {
    await prisma.$transaction([
      roleUpsert,
      prisma.playerProfile.update({
        where: { id: free.id },
        data: { clubId, categoryId: null, number: null, ...(position && { position }) },
      }),
    ]);
  } else {
    await prisma.$transaction([
      roleUpsert,
      // La posición se hereda de otra ficha: es de la persona, no se vuelve a preguntar por club.
      prisma.playerProfile.create({ data: { userId, clubId, position: position ?? profiles[0]?.position ?? null } }),
    ]);
  }
  return { joined: true, already: false };
}
