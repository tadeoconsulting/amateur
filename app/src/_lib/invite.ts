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

/** Respuesta HTTP para una invitación que no se puede usar. */
export function invitationProblem(reason: "not_found" | "expired" | "used") {
  if (reason === "not_found") return Response.json({ error: "La invitación no existe o fue revocada" }, { status: 404 });
  const error = reason === "expired" ? "La invitación venció" : "La invitación ya fue usada";
  return Response.json({ error }, { status: 410 });
}

export type JoinResult =
  | { joined: true; already: boolean }
  | { joined: false; currentClub: { id: string; name: string } };

/**
 * Suma a un usuario al club como jugador. Un jugador pertenece a un solo club: si ya está en
 * otro, no se lo mueve salvo que se pida explícitamente (`replace`). Al cambiar de club se
 * pierden la categoría y el dorsal, que eran del club anterior.
 */
export async function joinClub(
  userId: string,
  clubId: string,
  options: { position?: string | null; replace?: boolean } = {}
): Promise<JoinResult> {
  const profile = await prisma.playerProfile.findUnique({
    where: { userId },
    select: { clubId: true, club: { select: { id: true, name: true } } },
  });

  const position = options.position?.trim() || null;

  if (profile?.clubId === clubId) {
    if (position) await prisma.playerProfile.update({ where: { userId }, data: { position } });
    return { joined: true, already: true };
  }
  if (profile?.clubId && profile.club && !options.replace) {
    return { joined: false, currentClub: profile.club };
  }

  await prisma.$transaction([
    prisma.userRole.upsert({
      where: { userId_role: { userId, role: Role.JUGADOR } },
      update: {},
      create: { userId, role: Role.JUGADOR },
    }),
    prisma.playerProfile.upsert({
      where: { userId },
      update: { clubId, categoryId: null, number: null, ...(position && { position }) },
      create: { userId, clubId, ...(position && { position }) },
    }),
  ]);
  return { joined: true, already: false };
}
