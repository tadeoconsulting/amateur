import { Role, type Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { MAX_CO_DELEGATES, roleIn, type ClubRole } from "./club-delegate";

// Los delegados de un equipo desde la base (especificación 014): quién es principal (`Club.ownerId`) y quién co-delegado
// (`ClubDelegate`). Lo usan los comprobadores de permisos de `auth.ts` y las rutas de co-delegados; las reglas puras
// están en `club-delegate.ts`.

/** El rol de una persona en un equipo. Sin equipo (id que no existe) y sin ser admin, es `null`. */
export async function clubRoleFor(userId: string, userIsAdmin: boolean, clubId: string): Promise<ClubRole> {
  if (userIsAdmin) return "admin";
  const [club, co] = await Promise.all([
    prisma.club.findUnique({ where: { id: clubId }, select: { ownerId: true } }),
    prisma.clubDelegate.findUnique({ where: { userId }, select: { clubId: true } }),
  ]);
  return roleIn(clubId, { isAdmin: false, userId, ownerOf: club?.ownerId === userId ? [clubId] : [], coOf: co?.clubId ?? null });
}

/** ¿Es el delegado principal o un co-delegado de este equipo? (El admin no cuenta: no es delegado de nadie.) */
export async function isClubDelegate(userId: string, clubId: string): Promise<boolean> {
  return (await clubRoleFor(userId, false, clubId)) !== null;
}

/**
 * El filtro de Prisma para "los equipos de esta persona": los que dirige y aquel del que es co-delegada. Va dentro de un
 * `where` de equipos, o como `club: delegateClubWhere(id)` en una relación (solicitudes, inscripciones...).
 */
export const delegateClubWhere = (userId: string): Prisma.ClubWhereInput => ({
  OR: [{ ownerId: userId }, { coDelegates: { some: { userId } } }],
});

/** Cuántos equipos dirige o co-dirige la persona (para la regla de un equipo por persona). */
export async function delegateClubCount(userId: string): Promise<number> {
  const [owned, co] = await Promise.all([prisma.club.count({ where: { ownerId: userId } }), prisma.clubDelegate.count({ where: { userId } })]);
  return owned + co;
}

/** Los lugares de co-delegado ocupados de un equipo: los aceptados y las invitaciones vigentes (ver `coDelegateSlotsLeft`). */
export async function coDelegateUsage(clubId: string, now = new Date()) {
  const [accepted, pending] = await Promise.all([
    prisma.clubDelegate.count({ where: { clubId } }),
    prisma.coDelegateInvitation.count({ where: { clubId, status: "pending", expiresAt: { gt: now } } }),
  ]);
  return { accepted, pending };
}

/** La invitación se usó, o el equipo se llenó o dejó de admitir co-delegados, mientras se aceptaba. */
export class CoDelegateConflict extends Error {
  constructor(
    message: string,
    readonly code: "used" | "full" | "has_club" | "temporary",
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Suma a la persona como co-delegada y le da el perfil de delegado. La invitación pasa a aceptada en el mismo paso: un
 * enlace se usa una sola vez, así que si dos personas lo abren a la vez solo una lo consigue. Todo junto o nada; si ya
 * no se puede lanza `CoDelegateConflict` y no cambia nada.
 */
export async function acceptCoDelegateInvitation(invitation: { id: string; clubId: string; invitedById: string }, userId: string) {
  try {
    return await prisma.$transaction(async (tx) => {
      const club = await tx.club.findUnique({ where: { id: invitation.clubId }, select: { isTemporary: true } });
      if (!club || club.isTemporary) throw new CoDelegateConflict("Este equipo no admite co-delegados", "temporary", 410);

      const claimed = await tx.coDelegateInvitation.updateMany({
        where: { id: invitation.id, status: "pending", expiresAt: { gt: new Date() } },
        data: { status: "accepted", acceptedById: userId, acceptedAt: new Date() },
      });
      if (claimed.count !== 1) throw new CoDelegateConflict("La invitación ya fue usada o venció", "used", 410);

      if ((await tx.clubDelegate.count({ where: { clubId: invitation.clubId } })) >= MAX_CO_DELEGATES) {
        throw new CoDelegateConflict(`Este equipo ya tiene ${MAX_CO_DELEGATES} co-delegados, el máximo.`, "full", 409);
      }
      const delegate = await tx.clubDelegate.create({ data: { clubId: invitation.clubId, userId, invitedById: invitation.invitedById } });
      await tx.userRole.upsert({
        where: { userId_role: { userId, role: Role.CLUB_OWNER } },
        update: {},
        create: { userId, role: Role.CLUB_OWNER },
      });
      return delegate;
    });
  } catch (error) {
    // Ya era co-delegada de otro equipo (índice único de `userId`) justo mientras aceptaba.
    if (typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002") {
      throw new CoDelegateConflict("Tu cuenta ya es co-delegada de un equipo", "has_club", 409);
    }
    throw error;
  }
}
