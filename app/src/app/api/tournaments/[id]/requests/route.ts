import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageTournament, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { isUniqueViolation } from "@/_lib/enrollment";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";
import type { RequestKind } from "@/_lib/tournament-request";

const CLUB_SUMMARY = {
  select: { id: true, name: true, shortName: true, color: true, logoUrl: true, isTemporary: true, delegadoNombre: true },
} as const;

/**
 * Solicitudes e invitaciones de un torneo (las pestañas Solicitudes e Invitados del
 * organizador). Filtros opcionales: ?kind=request|invite y ?status=pending|...
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { id: true } });
  if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  const kind = request.nextUrl.searchParams.get("kind");
  const status = request.nextUrl.searchParams.get("status");
  const where: Record<string, unknown> = { tournamentId: id };
  if (kind) where.kind = kind;
  if (status) where.status = status;

  const requests = await prisma.tournamentRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      kind: true,
      status: true,
      createdAt: true,
      resolvedAt: true,
      club: CLUB_SUMMARY,
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  return Response.json(requests);
}

/**
 * Crea una solicitud o una invitación. El tipo lo decide quién llama, no el cuerpo:
 *   dueño del club            → solicitud (pide entrar; decide el organizador)
 *   organizador del torneo    → invitación (decide el dueño del club)
 * Cuerpo: { clubId }.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const body = await readJson(request);
  if (!body) return badRequest();
  const clubId = body.clubId;
  if (typeof clubId !== "string" || !clubId) return badRequest("clubId requerido");

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { id: true, status: true, maxTeams: true, organizerId: true, _count: { select: { teams: true } } },
  });
  if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, ownerId: true, isTemporary: true },
  });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });

  // Un admin actúa del lado del organizador.
  const isOrganizerSide = isAdmin(user) || tournament.organizerId === user.id;
  const isClubSide = club.ownerId === user.id;

  if (!isOrganizerSide && !isClubSide) return forbidden();
  // Un temporal es del organizador que lo creó: no hay con quién ponerse de acuerdo.
  if (club.isTemporary) {
    return badRequest("Un equipo temporal no se solicita ni se invita: se inscribe directamente");
  }
  if (isOrganizerSide && isClubSide) {
    return Response.json(
      { error: "Es tu torneo y tu equipo: inscríbelo directamente, no necesita aprobación" },
      { status: 409 }
    );
  }
  const kind: RequestKind = isOrganizerSide ? "invite" : "request";

  if (!OPEN_STATUSES.includes(tournament.status)) {
    return Response.json({ error: "El torneo ya empezó: no se aceptan más equipos" }, { status: 409 });
  }
  if (tournament._count.teams >= tournament.maxTeams) {
    return Response.json({ error: "El torneo ya tiene todos sus equipos" }, { status: 409 });
  }
  const enrolled = await prisma.tournamentTeam.findUnique({
    where: { tournamentId_clubId: { tournamentId: id, clubId } },
    select: { id: true },
  });
  if (enrolled) return Response.json({ error: "El equipo ya está inscrito" }, { status: 409 });

  const respondToExisting = async () => {
    const existing = await prisma.tournamentRequest.findUnique({
      where: { tournamentId_clubId: { tournamentId: id, clubId } },
    });
    if (existing?.status === "pending") {
      if (existing.kind === kind) return Response.json({ ...existing, alreadyPending: true });
      return Response.json(
        {
          error:
            kind === "request"
              ? "Ese torneo ya invitó a tu equipo: acepta la invitación"
              : "Ese equipo ya pidió entrar: acepta su solicitud",
          requestId: existing.id,
        },
        { status: 409 }
      );
    }
    return null;
  };

  const pending = await respondToExisting();
  if (pending) return pending;

  // Sin fila previa se crea; con una rechazada o cancelada se reabre (una fila por par).
  try {
    const saved = await prisma.tournamentRequest.upsert({
      where: { tournamentId_clubId: { tournamentId: id, clubId } },
      create: { tournamentId: id, clubId, kind, createdById: user.id },
      update: { kind, status: "pending", createdById: user.id, createdAt: new Date(), resolvedAt: null },
    });
    return Response.json(saved, { status: 201 });
  } catch (error) {
    // Otra petición creó la fila entre la lectura y la escritura.
    if (isUniqueViolation(error)) {
      const raced = await respondToExisting();
      if (raced) return raced;
    }
    throw error;
  }
}
