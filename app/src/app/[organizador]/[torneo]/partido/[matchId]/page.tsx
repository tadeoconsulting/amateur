import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/_lib/prisma";
import { PublicMatchView } from "@/_components/public-match-view";

// Ficha pública de un partido: cupamateur.com/{organizador}/{torneo}/partido/{id}. La abre quien
// recibe el link, sin cuenta (ver la página del torneo, que está al lado). Un partido solo se
// encuentra dentro de su torneo: con otro organizador o torneo en la ruta, no existe.
type Params = Promise<{ organizador: string; torneo: string; matchId: string }>;

async function findMatch({ organizador, torneo, matchId }: Awaited<Params>) {
  return prisma.match
    .findFirst({
      where: { id: matchId, tournament: { slug: torneo, deletedAt: null, organizer: { organizerSlug: organizador } } },
      select: {
        id: true,
        tournamentId: true,
        status: true,
        homeScore: true,
        awayScore: true,
        tournament: { select: { name: true } },
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
      },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const match = await findMatch(await params);
  if (!match) return { title: "Partido no encontrado · Amateur" };
  const home = match.homeTeam?.name ?? "Por definir";
  const away = match.awayTeam?.name ?? "Por definir";
  const played = match.status !== "programado";
  return {
    title: `${home} vs ${away} · ${match.tournament.name} · Amateur`,
    description: played
      ? `${match.status === "en_curso" ? "En vivo" : "Final"}: ${home} ${match.homeScore ?? 0} - ${match.awayScore ?? 0} ${away}. Sigue el partido en ${match.tournament.name}.`
      : `${home} contra ${away} en ${match.tournament.name}: día, hora y sede en Amateur.`,
  };
}

export default async function PublicMatchPage({ params }: { params: Params }) {
  const p = await params;
  const match = await findMatch(p);
  if (!match) notFound();
  return <PublicMatchView tournamentId={match.tournamentId} matchId={match.id} publicPath={`/${p.organizador}/${p.torneo}`} />;
}
