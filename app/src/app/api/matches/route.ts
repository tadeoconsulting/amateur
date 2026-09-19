import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  const status = request.nextUrl.searchParams.get("status");
  const group = request.nextUrl.searchParams.get("group");
  const matchday = request.nextUrl.searchParams.get("matchday");

  const where: Record<string, unknown> = {};
  if (tournamentId) where.tournamentId = tournamentId;
  if (status) where.status = status;
  if (group) where.groupName = group;
  if (matchday) where.matchday = parseInt(matchday);

  const matches = await prisma.match.findMany({
    where,
    include: {
      homeTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      awayTeam: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      _count: { select: { events: true } },
    },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  return Response.json(matches);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tournamentId, homeTeamId, awayTeamId, date, time, location, matchday, groupName } = body;

    if (!tournamentId || !homeTeamId || !awayTeamId || !date || !time) {
      return Response.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const match = await prisma.match.create({
      data: {
        tournamentId,
        homeTeamId,
        awayTeamId,
        date: new Date(date),
        time,
        location: location || "",
        matchday: matchday || 1,
        groupName,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return Response.json(match, { status: 201 });
  } catch (error) {
    console.error("Create match error:", error);
    return Response.json({ error: "Error al crear partido" }, { status: 500 });
  }
}
