import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

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
  const { id } = await params;
  const { clubId, groupName } = await request.json();

  if (!clubId) {
    return Response.json({ error: "clubId requerido" }, { status: 400 });
  }

  try {
    const enrollment = await prisma.tournamentTeam.create({
      data: { tournamentId: id, clubId, groupName },
      include: { club: true },
    });
    return Response.json(enrollment, { status: 201 });
  } catch {
    return Response.json({ error: "El equipo ya está inscrito" }, { status: 409 });
  }
}
