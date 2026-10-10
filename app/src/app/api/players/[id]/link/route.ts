import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { planLink, sumStats } from "@/_lib/provisional-link";

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/**
 * Asigna una cuenta a un jugador provisional (especificación 009, entrega 2). Solo un admin.
 *
 * Con `dryRun: true` solo calcula y devuelve lo que pasaría —si se vincula o se unen los perfiles, qué se
 * mueve y los avisos— sin escribir nada: el panel lo muestra y pide confirmar. Sin `dryRun` lo hace, en una
 * sola transacción (todo o nada). Ver `planLink` para las reglas.
 *
 * - **vincular:** el perfil provisional pasa a ser la ficha de la cuenta (mismo perfil: no se pierde nada).
 * - **unir:** si la cuenta ya tiene ficha en ese equipo (o una sin equipo), las jugadas, alineaciones y
 *   estadísticas del provisional pasan a esa ficha (los goles del mismo torneo se suman) y el provisional se elimina.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const body = await readJson(request);
  if (!body || typeof body.userId !== "string" || !body.userId) return badRequest("userId requerido");
  const dryRun = body.dryRun === true;

  const prov = await prisma.playerProfile.findUnique({
    where: { id },
    select: { id: true, userId: true, clubId: true, firstName: true, lastName: true, dni: true, birthDate: true, position: true, number: true, categoryId: true, club: { select: { name: true } } },
  });
  if (!prov) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  if (prov.userId !== null || !prov.clubId || !prov.dni) {
    return Response.json({ error: "Este jugador ya tiene cuenta" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: body.userId },
    select: {
      id: true, firstName: true, lastName: true, email: true, dni: true, birthDate: true,
      roles: { select: { role: true } },
      playerProfiles: { select: { id: true, clubId: true, position: true, number: true, categoryId: true, club: { select: { name: true } } } },
    },
  });
  if (!user) return Response.json({ error: "La cuenta no existe" }, { status: 404 });

  const plan = planLink(
    { clubId: prov.clubId, firstName: prov.firstName ?? "", lastName: prov.lastName ?? "", dni: prov.dni, birthDate: day(prov.birthDate), position: prov.position, number: prov.number, categoryId: prov.categoryId },
    {
      id: user.id, firstName: user.firstName, lastName: user.lastName, dni: user.dni, birthDate: day(user.birthDate),
      isAdmin: user.roles.some((r) => r.role === Role.ADMIN),
      hasPlayerRole: user.roles.some((r) => r.role === Role.JUGADOR),
      profiles: user.playerProfiles.map((p) => ({ id: p.id, clubId: p.clubId, position: p.position, number: p.number, categoryId: p.categoryId })),
    }
  );
  if (!plan.ok) return badRequest(plan.reason);

  if (dryRun) {
    const [events, lineups, stats] = await Promise.all([
      prisma.matchEvent.count({ where: { playerId: id } }),
      prisma.matchLineup.count({ where: { playerId: id } }),
      prisma.playerStats.aggregate({ where: { playerId: id }, _sum: { goals: true }, _count: true }),
    ]);
    return Response.json({
      mode: plan.mode,
      // La ficha de la cuenta no tenía equipo y pasa a ser la de este (ver planLink).
      fromFree: plan.mode === "merge" && plan.profileFill.clubId !== undefined,
      club: prov.club?.name ?? null,
      account: { name: `${user.firstName} ${user.lastName}`, email: user.email },
      moves: { events, lineups, tournaments: stats._count, goals: stats._sum.goals ?? 0 },
      warnings: plan.warnings,
      grantPlayerRole: plan.grantPlayerRole,
    });
  }

  try {
    const profileId = await prisma.$transaction(async (tx) => {
      let keptId = id;
      if (plan.mode === "link") {
        // El mismo perfil: se le pone la cuenta y sus datos propios quedan en la cuenta.
        await tx.playerProfile.update({ where: { id }, data: { userId: user.id, firstName: null, lastName: null, dni: null, birthDate: null } });
      } else {
        const target = plan.targetProfileId as string;
        keptId = target;
        await tx.matchEvent.updateMany({ where: { playerId: id }, data: { playerId: target } });

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
        // Se elimina el provisional primero: libera su DNI único y su equipo antes de tocar la ficha real.
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
    return Response.json({ mode: plan.mode, profileId });
  } catch (error) {
    console.error("Link provisional error:", error);
    return Response.json({ error: "No se pudo asignar la cuenta" }, { status: 500 });
  }
}
