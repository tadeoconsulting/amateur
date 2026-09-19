import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const profile = await prisma.playerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, birthDate: true, gender: true } },
      club: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      category: { select: { name: true, gender: true } },
      stats: {
        include: { tournament: { select: { id: true, name: true } } },
      },
    },
  });

  if (!profile) {
    return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  return Response.json({
    id: profile.id,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    avatarUrl: profile.user.avatarUrl,
    birthDate: profile.user.birthDate,
    gender: profile.user.gender,
    position: profile.position,
    number: profile.number,
    status: profile.status,
    club: profile.club,
    category: profile.category,
    stats: profile.stats.map((s) => ({
      tournament: s.tournament,
      goals: s.goals,
      assists: s.assists,
      yellowCards: s.yellowCards,
      redCards: s.redCards,
      matchesPlayed: s.matchesPlayed,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { position, number, categoryId, status, clubId } = body;

  try {
    const profile = await prisma.playerProfile.update({
      where: { id },
      data: {
        ...(position !== undefined && { position }),
        ...(number !== undefined && { number }),
        ...(categoryId !== undefined && { categoryId }),
        ...(status && { status }),
        ...(clubId !== undefined && { clubId }),
      },
    });
    return Response.json(profile);
  } catch {
    return Response.json({ error: "Error al actualizar jugador" }, { status: 500 });
  }
}
