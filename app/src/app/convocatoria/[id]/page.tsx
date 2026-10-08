import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/_lib/prisma";
import { tournamentPublicPath } from "@/_lib/slug";
import { ConvocatoriaView } from "@/_components/convocatoria-view";

// Ruta anterior de la página pública de un torneo (/convocatoria/{id}). Los links que ya se
// compartieron siguen funcionando: si el torneo tiene URL con nombre, se redirige a ella.
// Solo los torneos sin ella (anteriores a las URLs con nombre) se muestran desde acá.
async function findTournament(id: string) {
  return prisma.tournament
    .findFirst({ where: { id, deletedAt: null }, select: { id: true, name: true, category: true, location: true, slug: true, organizer: { select: { organizerSlug: true } } } })
    .catch(() => null);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tournament = await findTournament(id);
  if (!tournament) return { title: "Convocatoria · Amateur" };
  return {
    title: `${tournament.name} · Convocatoria`,
    description: `Pide unirte a ${tournament.name}${tournament.category ? ` (${tournament.category})` : ""} en ${tournament.location}. Inscripción en Amateur.`,
  };
}

export default async function ConvocatoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const tournament = await findTournament(id);
  const path = tournament ? tournamentPublicPath({ id, slug: tournament.slug, organizerSlug: tournament.organizer.organizerSlug }) : `/convocatoria/${id}`;

  if (path !== `/convocatoria/${id}`) {
    // Se conserva lo que traía el link (por ejemplo ?unirme=1).
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(await searchParams)) {
      for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
    }
    redirect(query.size > 0 ? `${path}?${query}` : path);
  }

  return <ConvocatoriaView tournamentId={id} publicPath={path} />;
}
