import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/_lib/prisma";
import { tournamentPublicPath } from "@/_lib/slug";
import { PublicMatchView } from "@/_components/public-match-view";

// Ficha pública de un partido de un torneo anterior a las URLs con nombre (/convocatoria/{id}).
// Si el torneo ya tiene URL con nombre, se redirige a la de su ficha (los links compartidos siguen funcionando).
type Params = Promise<{ id: string; matchId: string }>;

async function findMatch({ id, matchId }: Awaited<Params>) {
  return prisma.match
    .findFirst({
      where: { id: matchId, tournamentId: id, tournament: { deletedAt: null } },
      select: {
        id: true,
        status: true,
        homeScore: true,
        awayScore: true,
        tournament: { select: { name: true, slug: true, organizer: { select: { organizerSlug: true } } } },
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
  return { title: `${home} vs ${away} · ${match.tournament.name} · Amateur` };
}

export default async function LegacyPublicMatchPage({ params }: { params: Params }) {
  const p = await params;
  const match = await findMatch(p);
  if (!match) notFound();
  const path = tournamentPublicPath({ id: p.id, slug: match.tournament.slug, organizerSlug: match.tournament.organizer.organizerSlug });
  if (path !== `/convocatoria/${p.id}`) redirect(`${path}/partido/${p.matchId}`);
  return <PublicMatchView tournamentId={p.id} matchId={match.id} publicPath={path} />;
}
