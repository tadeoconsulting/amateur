import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson, requireRole } from "@/_lib/auth";
import { isUniqueViolation } from "@/_lib/enrollment";

// Lectura pública: los sponsors de un torneo se muestran en su convocatoria, sin sesión
// (mismo criterio que el resto de datos públicos del torneo — ver especificación 001, regla 19).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const links = await prisma.tournamentSponsor.findMany({
    where: { tournamentId: id },
    include: { sponsor: true },
    orderBy: { createdAt: "asc" },
  });

  return Response.json(
    links.map((l) => ({
      id: l.sponsor.id,
      name: l.sponsor.name,
      logoUrl: l.sponsor.logoUrl,
      website: l.sponsor.website,
    }))
  );
}

// Vincular un sponsor a un torneo es cosa de admin (venta gestionada por el equipo comercial,
// no del organizador — ver Sponsor en schema.prisma).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  if (!body || typeof body.sponsorId !== "string" || !body.sponsorId) return badRequest("sponsorId requerido");

  const [tournament, sponsor] = await Promise.all([
    prisma.tournament.findUnique({ where: { id }, select: { id: true } }),
    prisma.sponsor.findUnique({ where: { id: body.sponsorId }, select: { id: true } }),
  ]);
  if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  if (!sponsor) return Response.json({ error: "Sponsor no encontrado" }, { status: 404 });

  try {
    const link = await prisma.tournamentSponsor.create({
      data: { tournamentId: id, sponsorId: body.sponsorId },
    });
    return Response.json(link, { status: 201 });
  } catch (error) {
    if (isUniqueViolation(error)) return Response.json({ error: "Ese sponsor ya está en este torneo" }, { status: 409 });
    console.error("Link sponsor error:", error);
    return Response.json({ error: "Error al vincular el sponsor" }, { status: 500 });
  }
}
