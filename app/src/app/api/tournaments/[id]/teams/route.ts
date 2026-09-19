import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, canManageTournament, forbidden, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const teams = await prisma.tournamentTeam.findMany({
    where: { tournamentId: id },
    include: {
      club: {
        select: {
          id: true,
          name: true,
          shortName: true,
          logoUrl: true,
          _count: { select: { players: true } },
        },
      },
    },
    orderBy: { groupName: "asc" },
  });

  return Response.json(teams);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  const clubId = body?.clubId;
  const groupName = body?.groupName;

  if (typeof clubId !== "string" || !clubId) {
    return badRequest("clubId requerido");
  }

  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { id: true } });
  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  // Inscribe el organizador del torneo (o un admin), o el dueño del club para inscribir el suyo.
  const allowed = (await canManageTournament(auth.user, id)) || (await canManageClub(auth.user, clubId));
  if (!allowed) return forbidden();

  try {
    const enrollment = await prisma.tournamentTeam.create({
      data: { tournamentId: id, clubId, groupName: typeof groupName === "string" ? groupName : null },
      include: { club: true },
    });
    return Response.json(enrollment, { status: 201 });
  } catch {
    return Response.json({ error: "El equipo ya está inscrito" }, { status: 409 });
  }
}
