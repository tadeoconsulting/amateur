import { prisma } from "@/_lib/prisma";

export async function GET() {
  const [users, clubs, players, tournaments, matches] = await Promise.all([
    prisma.user.count(),
    prisma.club.count(),
    prisma.playerProfile.count(),
    prisma.tournament.count(),
    prisma.match.count(),
  ]);

  const roleBreakdown = await prisma.userRole.groupBy({
    by: ["role"],
    _count: { role: true },
  });

  const tournamentsByStatus = await prisma.tournament.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const matchesByStatus = await prisma.match.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  return Response.json({
    users,
    clubs,
    players,
    tournaments,
    matches,
    roleBreakdown: Object.fromEntries(
      roleBreakdown.map((r) => [r.role, r._count.role])
    ),
    tournamentsByStatus: Object.fromEntries(
      tournamentsByStatus.map((t) => [t.status, t._count.status])
    ),
    matchesByStatus: Object.fromEntries(
      matchesByStatus.map((m) => [m.status, m._count.status])
    ),
  });
}
