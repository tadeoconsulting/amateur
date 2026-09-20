import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";

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

const isScore = (value: unknown) => value === null || (Number.isInteger(value) && (value as number) >= 0);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageMatch(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { homeScore, awayScore, status } = body;

  if ((homeScore !== undefined && !isScore(homeScore)) || (awayScore !== undefined && !isScore(awayScore))) {
    return badRequest("El marcador debe ser un entero mayor o igual a 0");
  }
  if (status !== undefined && (typeof status !== "string" || !status)) {
    return badRequest("status inválido");
  }

  try {
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(homeScore !== undefined && { homeScore: homeScore as number | null }),
        ...(awayScore !== undefined && { awayScore: awayScore as number | null }),
        ...(status !== undefined && { status: status as string }),
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return Response.json(match);
  } catch {
    return Response.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}
