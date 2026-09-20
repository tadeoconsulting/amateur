import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";
import { isRealDate } from "@/_lib/fixture";

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

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  const { homeScore, awayScore, status, date, time, location } = body;

  if ((homeScore !== undefined && !isScore(homeScore)) || (awayScore !== undefined && !isScore(awayScore))) {
    return badRequest("El marcador debe ser un entero mayor o igual a 0");
  }
  if (status !== undefined && (typeof status !== "string" || !status)) {
    return badRequest("status inválido");
  }

  // Programación del partido: día (YYYY-MM-DD), hora (HH:MM, 24 h) y sede.
  let when: { date?: Date; time?: string; location?: string } = {};
  if (date !== undefined || time !== undefined || location !== undefined) {
    if (date !== undefined && (typeof date !== "string" || !isRealDate(date))) {
      return badRequest("date debe tener el formato YYYY-MM-DD");
    }
    if (time !== undefined && (typeof time !== "string" || !TIME_RE.test(time))) {
      return badRequest("time debe tener el formato HH:MM (24 horas)");
    }
    if (location !== undefined && (typeof location !== "string" || location.trim().length > 200)) {
      return badRequest("location debe ser un texto de hasta 200 caracteres");
    }

    const current = await prisma.match.findUnique({
      where: { id },
      select: { status: true, tournamentId: true, homeTeamId: true, awayTeamId: true, date: true, time: true, location: true },
    });
    if (!current) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
    if (current.status !== "programado") {
      return Response.json({ error: "Solo se puede reprogramar un partido que todavía no empezó" }, { status: 409 });
    }

    when = {
      ...(date !== undefined && { date: new Date(`${date}T00:00:00Z`) }),
      ...(time !== undefined && { time: time as string }),
      ...(location !== undefined && { location: (location as string).trim() }),
    };
    const next = { date: when.date ?? current.date, time: when.time ?? current.time, location: when.location ?? current.location };

    // No puede haber otro partido del torneo a la misma hora con un mismo equipo o en la misma sede.
    if (next.time !== "") {
      const clash = await prisma.match.findFirst({
        where: {
          tournamentId: current.tournamentId,
          id: { not: id },
          date: next.date,
          time: next.time,
          OR: [
            { homeTeamId: { in: [current.homeTeamId, current.awayTeamId] } },
            { awayTeamId: { in: [current.homeTeamId, current.awayTeamId] } },
            ...(next.location ? [{ location: next.location }] : []),
          ],
        },
        select: { id: true },
      });
      if (clash) {
        return Response.json({ error: "Ese horario choca con otro partido del torneo (mismo equipo o misma sede)" }, { status: 409 });
      }
    }
  }

  try {
    const match = await prisma.match.update({
      where: { id },
      data: {
        ...(homeScore !== undefined && { homeScore: homeScore as number | null }),
        ...(awayScore !== undefined && { awayScore: awayScore as number | null }),
        ...(status !== undefined && { status: status as string }),
        ...when,
      },
      include: { homeTeam: true, awayTeam: true },
    });

    return Response.json(match);
  } catch {
    return Response.json({ error: "Error al actualizar partido" }, { status: 500 });
  }
}
