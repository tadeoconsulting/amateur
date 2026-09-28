import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, readJson, requireUser } from "@/_lib/auth";

// Lectura pública: el once inicial de un partido es un dato más del partido (como el marcador
// o los equipos inscritos — ver especificación 001, regla 19), no hace falta sesión para verlo.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const clubId = request.nextUrl.searchParams.get("clubId");
  if (!clubId) return badRequest("clubId requerido");

  const lineup = await prisma.matchLineup.findMany({
    where: { matchId: id, clubId },
    select: { playerId: true },
  });

  return Response.json({ playerIds: lineup.map((l) => l.playerId) });
}

/**
 * Reemplaza el once inicial que un club definió para este partido — no toca `matchesPlayed`
 * ni `assists` de PlayerStats (eso se cuenta cuando el partido termina, no cuando se arma la
 * alineación: ver pendientes-y-decisiones.md).
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  if (!body || typeof body.clubId !== "string" || !Array.isArray(body.playerIds)) {
    return badRequest("clubId y playerIds son requeridos");
  }
  const { clubId } = body;
  const playerIds: unknown[] = body.playerIds;
  if (!playerIds.every((p) => typeof p === "string")) return badRequest("playerIds inválido");

  if (!(await canManageClub(auth.user, clubId))) return forbidden();

  const match = await prisma.match.findUnique({
    where: { id },
    select: { status: true, homeTeamId: true, awayTeamId: true },
  });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.status === "finalizado") {
    return Response.json({ error: "El partido ya terminó" }, { status: 409 });
  }
  if (match.homeTeamId !== clubId && match.awayTeamId !== clubId) {
    return badRequest("Ese club no juega este partido");
  }

  // Los jugadores tienen que ser del mismo club (y de verdad existir): evita mandar ids ajenos.
  const validPlayers = await prisma.playerProfile.count({
    where: { id: { in: playerIds as string[] }, clubId },
  });
  if (validPlayers !== playerIds.length) {
    return badRequest("Alguno de los jugadores no pertenece a este club");
  }

  await prisma.$transaction([
    prisma.matchLineup.deleteMany({ where: { matchId: id, clubId } }),
    prisma.matchLineup.createMany({
      data: (playerIds as string[]).map((playerId) => ({ matchId: id, clubId, playerId })),
    }),
  ]);

  return Response.json({ playerIds });
}
