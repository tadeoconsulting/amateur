import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { planLink, sumStats } from "./provisional-link";

// La parte con base de datos de "asignar una cuenta a un jugador provisional" (especificación 009). La usan el
// admin (`POST /api/players/:id/link`) y quien acepta una invitación (`POST /api/profile-invitations/:token/accept`);
// las reglas (vincular o unir, qué se avisa) están en `planLink`, que es pura.

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

const PROV_SELECT = {
  id: true, userId: true, clubId: true, firstName: true, lastName: true, dni: true, birthDate: true,
  position: true, number: true, categoryId: true, club: { select: { name: true } },
} as const;

/** Todo lo necesario para decidir y ejecutar la asignación; o el error HTTP que corresponde. */
export async function loadLinkContext(profileId: string, userId: string) {
  const prov = await prisma.playerProfile.findUnique({ where: { id: profileId }, select: PROV_SELECT });
  if (!prov) return { ok: false as const, status: 404, error: "Jugador no encontrado" };
  if (prov.userId !== null || !prov.clubId || !prov.dni) return { ok: false as const, status: 409, error: "Este jugador ya tiene cuenta" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, firstName: true, lastName: true, email: true, dni: true, birthDate: true,
      roles: { select: { role: true } },
      playerProfiles: { select: { id: true, clubId: true, position: true, number: true, categoryId: true } },
    },
  });
  if (!user) return { ok: false as const, status: 404, error: "La cuenta no existe" };

  const plan = planLink(
    { clubId: prov.clubId, firstName: prov.firstName ?? "", lastName: prov.lastName ?? "", dni: prov.dni, birthDate: day(prov.birthDate), position: prov.position, number: prov.number, categoryId: prov.categoryId },
    {
      id: user.id, firstName: user.firstName, lastName: user.lastName, dni: user.dni, birthDate: day(user.birthDate),
      isAdmin: user.roles.some((r) => r.role === Role.ADMIN),
      hasPlayerRole: user.roles.some((r) => r.role === Role.JUGADOR),
      profiles: user.playerProfiles,
    }
  );
  if (!plan.ok) return { ok: false as const, status: 400, error: plan.reason };
  return { ok: true as const, prov, user, plan };
}

export type LinkContext = Extract<Awaited<ReturnType<typeof loadLinkContext>>, { ok: true }>;

/**
 * Lo que se movería (para el resumen previo del admin): jugadas, alineaciones y goles del provisional.
 */
export async function linkMoves(profileId: string) {
  const [events, lineups, stats] = await Promise.all([
    prisma.matchEvent.count({ where: { OR: [{ playerId: profileId }, { playerInId: profileId }] } }),
    prisma.matchLineup.count({ where: { playerId: profileId } }),
    prisma.playerStats.aggregate({ where: { playerId: profileId }, _sum: { goals: true }, _count: true }),
  ]);
  return { events, lineups, tournaments: stats._count, goals: stats._sum.goals ?? 0 };
}

/**
 * Hace la asignación, todo en una transacción (todo o nada). Devuelve el id de la ficha que queda.
 * Las invitaciones pendientes del perfil se cancelan —la persona ya tiene su cuenta—, salvo la que se está aceptando
 * (`acceptInvitationId`), que queda como aceptada.
 */
export async function executeLink(ctx: LinkContext, options: { acceptInvitationId?: string } = {}): Promise<string> {
  const { prov, user, plan } = ctx;
  const id = prov.id;

  return prisma.$transaction(async (tx) => {
    await tx.profileInvitation.updateMany({
      where: { profileId: id, status: { in: ["pending", "review", "locked"] }, ...(options.acceptInvitationId && { NOT: { id: options.acceptInvitationId } }) },
      data: { status: "cancelled" },
    });

    let keptId = id;
    if (plan.mode === "link") {
      // El mismo perfil: se le pone la cuenta y sus datos propios quedan en la cuenta.
      await tx.playerProfile.update({ where: { id }, data: { userId: user.id, firstName: null, lastName: null, dni: null, birthDate: null } });
      if (options.acceptInvitationId) {
        await tx.profileInvitation.update({ where: { id: options.acceptInvitationId }, data: { status: "accepted", acceptedById: user.id, acceptedAt: new Date() } });
      }
    } else {
      const target = plan.targetProfileId as string;
      keptId = target;
      await tx.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: target } });
      await tx.matchEvent.updateMany({ where: { playerInId: id }, data: { playerInId: target } });

      // Una alineación por partido y jugador: si la ficha real ya estaba en ese partido, la del provisional sobra.
      const already = await tx.matchLineup.findMany({ where: { playerId: target }, select: { matchId: true } });
      await tx.matchLineup.deleteMany({ where: { playerId: id, matchId: { in: already.map((l) => l.matchId) } } });
      await tx.matchLineup.updateMany({ where: { playerId: id }, data: { playerId: target } });

      // Una fila de estadísticas por torneo: las del mismo torneo se suman.
      for (const s of await tx.playerStats.findMany({ where: { playerId: id } })) {
        const same = await tx.playerStats.findUnique({ where: { playerId_tournamentId: { playerId: target, tournamentId: s.tournamentId } } });
        if (same) {
          await tx.playerStats.update({ where: { id: same.id }, data: sumStats(same, s) });
          await tx.playerStats.delete({ where: { id: s.id } });
        } else {
          await tx.playerStats.update({ where: { id: s.id }, data: { playerId: target } });
        }
      }
      // Se elimina el provisional primero: libera su DNI único y su equipo antes de tocar la ficha real
      // (y se van con él sus invitaciones).
      await tx.playerProfile.delete({ where: { id } });
      if (Object.keys(plan.profileFill).length > 0) await tx.playerProfile.update({ where: { id: target }, data: plan.profileFill });
    }

    if (plan.accountFill.dni || plan.accountFill.birthDate) {
      await tx.user.update({
        where: { id: user.id },
        data: {
          ...(plan.accountFill.dni && { dni: plan.accountFill.dni }),
          ...(plan.accountFill.birthDate && { birthDate: new Date(`${plan.accountFill.birthDate}T00:00:00Z`) }),
        },
      });
    }
    if (plan.grantPlayerRole) {
      await tx.userRole.upsert({ where: { userId_role: { userId: user.id, role: Role.JUGADOR } }, update: {}, create: { userId: user.id, role: Role.JUGADOR } });
    }
    return keptId;
  });
}
