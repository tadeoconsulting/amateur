import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const organizerId = searchParams.get("organizerId");
  const status = searchParams.get("status");
  const clubId = searchParams.get("clubId");
  const playerId = searchParams.get("playerId");

  const where: Record<string, unknown> = {};
  if (organizerId) where.organizerId = organizerId;
  if (status) where.status = status;
  if (clubId) where.teams = { some: { clubId } };
  if (playerId) {
    where.teams = {
      some: {
        club: { players: { some: { userId: playerId } } },
      },
    };
  }

  const tournaments = await prisma.tournament.findMany({
    where,
    include: {
      _count: { select: { teams: true, matches: true } },
      organizer: { select: { firstName: true, lastName: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return Response.json(
    tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      format: t.format,
      status: t.status,
      category: t.category,
      maxTeams: t.maxTeams,
      minTeams: t.minTeams,
      teamsCount: t._count.teams,
      matchesCount: t._count.matches,
      startDate: t.startDate,
      endDate: t.endDate,
      location: t.location,
      organizer: t.organizer,
    }))
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, format, maxTeams, minTeams, startDate, endDate, location, category, organizerId, status } = body;

    if (!name || !format || !maxTeams || !startDate || !location || !organizerId) {
      return Response.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        format,
        status: status || "draft",
        maxTeams,
        minTeams,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        location,
        category,
        organizerId,
      },
    });

    return Response.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Create tournament error:", error);
    return Response.json({ error: "Error al crear torneo" }, { status: 500 });
  }
}
