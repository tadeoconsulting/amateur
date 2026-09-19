import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, isAdmin, readJson, requireRole } from "@/_lib/auth";

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
  const auth = await requireRole("ORGANIZADOR");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  try {
    const body = await readJson(request);
    if (!body) return badRequest();

    const { name, format, maxTeams, minTeams, startDate, endDate, location, category, status } = body;

    if (
      typeof name !== "string" || !name.trim() ||
      typeof format !== "string" || !format ||
      !Number.isInteger(maxTeams) || (maxTeams as number) < 2 ||
      !startDate || Number.isNaN(new Date(startDate as string).getTime()) ||
      typeof location !== "string" || !location.trim()
    ) {
      return badRequest("Campos requeridos faltantes o inválidos");
    }

    // El organizador es quien crea el torneo. Solo un admin puede crearlo a nombre de otro.
    const organizerId = isAdmin(user) && typeof body.organizerId === "string" ? body.organizerId : user.id;

    const tournament = await prisma.tournament.create({
      data: {
        name: name.trim(),
        format,
        status: typeof status === "string" && status ? status : "draft",
        maxTeams: maxTeams as number,
        minTeams: Number.isInteger(minTeams) ? (minTeams as number) : null,
        startDate: new Date(startDate as string),
        endDate: endDate ? new Date(endDate as string) : null,
        location: location.trim(),
        category: typeof category === "string" ? category : null,
        organizerId,
      },
    });

    return Response.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Create tournament error:", error);
    return Response.json({ error: "Error al crear torneo" }, { status: 500 });
  }
}
