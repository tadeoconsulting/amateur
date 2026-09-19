import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      organizer: { select: { id: true, firstName: true, lastName: true } },
      teams: {
        include: { club: { select: { id: true, name: true, shortName: true, logoUrl: true } } },
        orderBy: { groupName: "asc" },
      },
      _count: { select: { matches: true, teams: true } },
    },
  });

  if (!tournament) {
    return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  }

  const matchesPlayed = await prisma.match.count({
    where: { tournamentId: id, status: "finalizado" },
  });

  return Response.json({
    ...tournament,
    matchesPlayed,
    totalMatches: tournament._count.matches,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  try {
    const tournament = await prisma.tournament.update({
      where: { id },
      data: body,
    });
    return Response.json(tournament);
  } catch {
    return Response.json({ error: "Error al actualizar torneo" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.tournament.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error al eliminar torneo" }, { status: 500 });
  }
}
