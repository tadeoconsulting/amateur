import { Role } from "@prisma/client";
import { prisma } from "./prisma";

// Oficializar un equipo temporal: pasa a ser de un delegado con cuenta propia. Lo comparten la ruta del admin
// (`/api/clubs/:id/oficializar`) y la aceptación de una invitación de delegado (especificación 009, entrega 4).

/** El equipo dejó de ser temporal, o la invitación se usó, mientras se aceptaba. */
export class OfficializeConflict extends Error {}

/**
 * Pasa el equipo a `ownerId` y deja de ser temporal; le da el perfil de delegado a esa cuenta. Las invitaciones de
 * delegado vigentes del equipo se cancelan, salvo la que se está aceptando (`acceptInvitationId`), que queda
 * aceptada por esa cuenta. Todo junto o nada; si el equipo ya no es temporal o la invitación ya no está vigente
 * (otra persona llegó antes) lanza `OfficializeConflict` y no cambia nada.
 */
export async function makeClubOfficial(clubId: string, ownerId: string, options: { acceptInvitationId?: string } = {}) {
  return prisma.$transaction(async (tx) => {
    if (options.acceptInvitationId) {
      const claimed = await tx.delegateInvitation.updateMany({
        where: { id: options.acceptInvitationId, status: "pending" },
        data: { status: "accepted", acceptedById: ownerId, acceptedAt: new Date() },
      });
      if (claimed.count !== 1) throw new OfficializeConflict("La invitación ya fue usada");
    }
    const changed = await tx.club.updateMany({ where: { id: clubId, isTemporary: true }, data: { ownerId, isTemporary: false } });
    if (changed.count !== 1) throw new OfficializeConflict("Este equipo ya es oficial");
    await tx.userRole.upsert({
      where: { userId_role: { userId: ownerId, role: Role.CLUB_OWNER } },
      update: {},
      create: { userId: ownerId, role: Role.CLUB_OWNER },
    });
    await tx.delegateInvitation.updateMany({ where: { clubId, status: "pending" }, data: { status: "cancelled" } });
    return tx.club.findUniqueOrThrow({ where: { id: clubId } });
  });
}
