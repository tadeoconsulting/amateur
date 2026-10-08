import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/_lib/prisma";
import { ConvocatoriaView } from "@/_components/convocatoria-view";

// Página pública de un torneo con su URL con nombre: cupamateur.com/{organizador}/{torneo}
// (ver _lib/slug.ts). La abre quien recibe el link por WhatsApp, sin cuenta. Las pantallas de la
// app (/login, /club, /torneos...) tienen ruta propia y ganan sobre esta, y esos nombres no se
// asignan a ningún organizador (RESERVED_SLUGS).
type Params = Promise<{ organizador: string; torneo: string }>;

async function findTournament({ organizador, torneo }: { organizador: string; torneo: string }) {
  return prisma.tournament
    .findFirst({
      where: { slug: torneo, organizer: { organizerSlug: organizador } },
      select: { id: true, name: true, category: true, location: true },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const tournament = await findTournament(await params);
  if (!tournament) return { title: "Torneo no encontrado · Amateur" };
  return {
    title: `${tournament.name} · Amateur`,
    description: `Sigue ${tournament.name}${tournament.category ? ` (${tournament.category})` : ""} en ${tournament.location}: fixture, tabla y resultados. Inscripción en Amateur.`,
  };
}

export default async function TournamentPublicPage({ params }: { params: Params }) {
  const p = await params;
  const tournament = await findTournament(p);
  if (!tournament) notFound();
  return <ConvocatoriaView tournamentId={tournament.id} publicPath={`/${p.organizador}/${p.torneo}`} />;
}
