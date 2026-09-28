import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson, requireRole } from "@/_lib/auth";

// Alta de sponsors: venta gestionada por el equipo comercial, no self-service (ver
// pendientes-y-decisiones.md, decisión 14). Solo un admin los crea y edita.
export async function GET(request: NextRequest) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const search = request.nextUrl.searchParams.get("search")?.trim();
  const where: Record<string, unknown> = search ? { name: { contains: search, mode: "insensitive" } } : {};

  const sponsors = await prisma.sponsor.findMany({
    where,
    include: { _count: { select: { tournaments: true } } },
    orderBy: { name: "asc" },
  });

  return Response.json(
    sponsors.map((s) => ({
      id: s.id,
      name: s.name,
      logoUrl: s.logoUrl,
      website: s.website,
      tournamentsCount: s._count.tournaments,
      createdAt: s.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  if (!body) return badRequest();

  const { name, logoUrl, website } = body;
  if (typeof name !== "string" || !name.trim()) return badRequest("name requerido");

  try {
    const sponsor = await prisma.sponsor.create({
      data: {
        name: name.trim(),
        logoUrl: typeof logoUrl === "string" && logoUrl ? logoUrl : null,
        website: typeof website === "string" && website ? website : null,
      },
    });
    return Response.json(sponsor, { status: 201 });
  } catch (error) {
    console.error("Create sponsor error:", error);
    return Response.json({ error: "Error al crear sponsor" }, { status: 500 });
  }
}
