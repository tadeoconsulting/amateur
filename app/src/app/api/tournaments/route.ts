import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { badRequest, isAdmin, readJson, requireRole } from "@/_lib/auth";
import { parseTournamentFields } from "@/_lib/tournament-input";
import { ensureOrganizerSlug, newTournamentSlug } from "@/_lib/tournament-slug";

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
      organizer: { select: { firstName: true, lastName: true, organizerSlug: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return Response.json(
    tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      format: t.format,
      status: t.status,
      category: t.category,
      maxTeams: t.maxTeams,
      minTeams: t.minTeams,
      modality: t.modality,
      gender: t.gender,
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

    const parsed = parseTournamentFields(body, "create");
    if ("error" in parsed) return badRequest(parsed.error);

    // El organizador es quien crea el torneo. Solo un admin puede crearlo a nombre de otro.
    const organizerId = isAdmin(user) && typeof body.organizerId === "string" ? body.organizerId : user.id;

    // Su URL pública: /{organizador}/{torneo}. El tramo del organizador se asigna con su primer torneo.
    await ensureOrganizerSlug(organizerId);
    const name = String(parsed.data.name ?? "");

    // Si dos torneos con el mismo nombre se crean a la vez, el segundo choca con el índice único
    // (organizerId, slug): se vuelve a calcular el sufijo.
    let tournament;
    for (let attempt = 0; ; attempt++) {
      try {
        tournament = await prisma.tournament.create({
          data: {
            ...(parsed.data as Prisma.TournamentUncheckedCreateInput),
            status: (parsed.data.status as string | undefined) ?? "draft",
            organizerId,
            slug: await newTournamentSlug(organizerId, name),
          },
        });
        break;
      } catch (error) {
        const duplicated = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
        if (!duplicated || attempt >= 2) throw error;
      }
    }

    return Response.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Create tournament error:", error);
    return Response.json({ error: "Error al crear torneo" }, { status: 500 });
  }
}
