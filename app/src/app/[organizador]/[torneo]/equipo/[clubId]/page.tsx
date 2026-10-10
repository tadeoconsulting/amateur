import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/_lib/prisma";
import { PublicClubView } from "@/_components/public-club-view";

// Página pública de un club dentro de un torneo: cupamateur.com/{organizador}/{torneo}/equipo/{club}. La abre quien
// toca un equipo en la tabla (o recibe el enlace), sin cuenta. Un club solo existe dentro de los torneos donde está
// inscrito: con otro organizador, torneo o club en la ruta, no existe.
type Params = Promise<{ organizador: string; torneo: string; clubId: string }>;

async function findEnrollment({ organizador, torneo, clubId }: Awaited<Params>) {
  return prisma.tournamentTeam
    .findFirst({
      where: { clubId, tournament: { slug: torneo, deletedAt: null, organizer: { organizerSlug: organizador } } },
      select: { tournamentId: true, club: { select: { name: true } }, tournament: { select: { name: true } } },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await findEnrollment(await params);
  if (!found) return { title: "Equipo no encontrado · Amateur" };
  return {
    title: `${found.club.name} · ${found.tournament.name} · Amateur`,
    description: `Partidos, jugadores y resultados de ${found.club.name} en ${found.tournament.name}.`,
  };
}

export default async function PublicClubPage({ params }: { params: Params }) {
  const p = await params;
  const found = await findEnrollment(p);
  if (!found) notFound();
  return <PublicClubView tournamentId={found.tournamentId} clubId={p.clubId} tournamentPath={`/${p.organizador}/${p.torneo}`} />;
}
