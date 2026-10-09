import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { buildIcs, type IcsEvent } from "@/_lib/ics";
import { roundLabel, slotMinutesFor } from "@/_lib/fixture";
import { tournamentPublicPath } from "@/_lib/slug";

/**
 * Los partidos que vienen de un torneo, en formato calendario (.ics), para agregarlos a Google
 * Calendar, Apple Calendar u Outlook, o para suscribirse (webcal://) y que se actualicen solos.
 * Es público, como el resto de los datos del torneo.
 *
 *   ?fecha=5   solo la fecha 5 de la liga o los grupos
 *   ?ronda=2   solo la ronda 2 del cuadro
 *   ?equipo=ID solo los partidos de un club
 *   ?descargar=1  pide el archivo como descarga
 *
 * Solo van los partidos con día y hora que todavía no terminaron: no tiene sentido agendar lo ya jugado
 * ni lo que aún no tiene horario.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    select: { name: true, slug: true, deletedAt: true, minutesPerHalf: true, organizer: { select: { organizerSlug: true } } },
  });
  if (!tournament || tournament.deletedAt) return new Response("Torneo no encontrado", { status: 404 });

  const query = request.nextUrl.searchParams;
  const number = (key: string) => (/^\d+$/.test(query.get(key) ?? "") ? Number(query.get(key)) : null);
  const fecha = number("fecha");
  const ronda = number("ronda");
  const equipo = query.get("equipo");

  const matches = await prisma.match.findMany({
    where: {
      tournamentId: id,
      time: { not: "" },
      status: { in: ["programado", "en_curso"] },
      ...(fecha !== null ? { decisive: false, matchday: fecha } : ronda !== null ? { decisive: true, matchday: ronda } : {}),
      ...(equipo ? { OR: [{ homeTeamId: equipo }, { awayTeamId: equipo }] } : {}),
    },
    include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    orderBy: [{ date: "asc" }, { time: "asc" }],
  });

  // Para rotular las rondas del cuadro ("Semifinal") hace falta saber cuántas hay.
  const totalRounds = Math.max(0, ...(await prisma.match.findMany({ where: { tournamentId: id, decisive: true }, select: { matchday: true } })).map((m) => m.matchday));

  const publicUrl = `${request.nextUrl.origin}${tournamentPublicPath({ id, slug: tournament.slug, organizerSlug: tournament.organizer.organizerSlug })}`;
  const duration = slotMinutesFor(tournament.minutesPerHalf);

  const events: IcsEvent[] = matches.map((m) => ({
    uid: `${m.id}@cupamateur.com`,
    summary: `${m.homeTeam?.name ?? "Por definir"} vs ${m.awayTeam?.name ?? "Por definir"}`,
    location: m.location || undefined,
    description: `${tournament.name} · ${m.decisive ? roundLabel(m.matchday, totalRounds) : `Fecha ${m.matchday}`}`,
    url: `${publicUrl}${m.decisive ? `?ronda=${m.matchday}` : `?fecha=${m.matchday}`}`,
    date: m.date.toISOString(),
    time: m.time,
    durationMinutes: duration,
  }));

  const suffix = fecha !== null ? `-fecha-${fecha}` : ronda !== null ? `-ronda-${ronda}` : "";
  const filename = `${tournament.slug ?? "torneo"}${suffix}.ics`;
  return new Response(buildIcs({ name: tournament.name, events }), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      ...(query.get("descargar") === "1" ? { "Content-Disposition": `attachment; filename="${filename}"` } : {}),
      // Los programas de calendario vuelven a pedirlo cada tanto: un poco de caché alcanza.
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
