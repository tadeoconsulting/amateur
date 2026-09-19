import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      homeTeam: true,
      awayTeam: true,
      events: { orderBy: { minute: "asc" } },
      tournament: { select: { id: true, name: true, format: true } },
    },
  });

  if (!match) {
    return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  }

  return Response.json(match);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { homeScore, awayScore, status } = body;

  try {
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(homeScore !== undefined && { homeScore }),
        ...(awayScore !== undefined && { awayScore }),
        ...(status && { status }),
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return Response.json(match);
  } catch {
    return Response.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}
