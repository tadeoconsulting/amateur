import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/_lib/prisma";
import { tournamentPublicPath } from "@/_lib/slug";
import { PublicClubView } from "@/_components/public-club-view";

// Página pública de un club en un torneo anterior a las URLs con nombre (/convocatoria/{id}). Si el torneo ya tiene
// URL con nombre, se redirige a la de su página (los enlaces compartidos siguen funcionando).
type Params = Promise<{ id: string; clubId: string }>;

async function findEnrollment({ id, clubId }: Awaited<Params>) {
  return prisma.tournamentTeam
    .findFirst({
      where: { tournamentId: id, clubId, tournament: { deletedAt: null } },
      select: { club: { select: { name: true } }, tournament: { select: { name: true, slug: true, organizer: { select: { organizerSlug: true } } } } },
    })
    .catch(() => null);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await findEnrollment(await params);
  if (!found) return { title: "Equipo no encontrado · Amateur" };
  return { title: `${found.club.name} · ${found.tournament.name} · Amateur` };
}

export default async function LegacyPublicClubPage({ params }: { params: Params }) {
  const p = await params;
  const found = await findEnrollment(p);
  if (!found) notFound();
  const path = tournamentPublicPath({ id: p.id, slug: found.tournament.slug, organizerSlug: found.tournament.organizer.organizerSlug });
  if (path !== `/convocatoria/${p.id}`) redirect(`${path}/equipo/${p.clubId}`);
  return <PublicClubView tournamentId={p.id} clubId={p.clubId} tournamentPath={path} />;
}
