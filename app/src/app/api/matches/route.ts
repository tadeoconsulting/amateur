import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageTournament, forbidden, readJson, requireUser } from "@/_lib/auth";

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
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  try {
    const body = await readJson(request);
    if (!body) return badRequest();

    const { tournamentId, homeTeamId, awayTeamId, date, time, location, matchday, groupName } = body;

    if (
      typeof tournamentId !== "string" || typeof homeTeamId !== "string" || typeof awayTeamId !== "string" ||
      !date || Number.isNaN(new Date(date as string).getTime()) || typeof time !== "string" || !time
    ) {
      return badRequest("Campos requeridos faltantes o inválidos");
    }
    if (homeTeamId === awayTeamId) {
      return badRequest("El equipo local y el visitante deben ser distintos");
    }

    if (!(await canManageTournament(auth.user, tournamentId))) return forbidden();

    const match = await prisma.match.create({
      data: {
        tournamentId,
        homeTeamId,
        awayTeamId,
        date: new Date(date as string),
        time,
        location: typeof location === "string" ? location : "",
        matchday: Number.isInteger(matchday) ? (matchday as number) : 1,
        groupName: typeof groupName === "string" ? groupName : null,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return Response.json(match, { status: 201 });
  } catch (error) {
    console.error("Create match error:", error);
    return Response.json({ error: "Error al crear partido" }, { status: 500 });
  }
}
