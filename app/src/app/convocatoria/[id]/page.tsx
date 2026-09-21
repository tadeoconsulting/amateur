import type { Metadata } from "next";
import { prisma } from "@/_lib/prisma";
import { ConvocatoriaView } from "./convocatoria-view";

// Página pública: la abre quien recibe el link por WhatsApp. El nombre del torneo va en
// los metadatos para que la vista previa del link diga de qué se trata.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const tournament = await prisma.tournament
    .findUnique({ where: { id }, select: { name: true, category: true, location: true } })
    .catch(() => null);
  if (!tournament) return { title: "Convocatoria · Amateur" };
  return {
    title: `${tournament.name} · Convocatoria`,
    description: `Pide unirte a ${tournament.name}${tournament.category ? ` (${tournament.category})` : ""} en ${tournament.location}. Inscripción en Amateur.`,
  };
}

export default function ConvocatoriaPage() {
  return <ConvocatoriaView />;
}
