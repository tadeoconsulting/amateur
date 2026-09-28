import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, pick, readJson, requireRole } from "@/_lib/auth";

const EDITABLE = ["name", "logoUrl", "website"] as const;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const sponsor = await prisma.sponsor.findUnique({
    where: { id },
    include: {
      tournaments: {
        include: { tournament: { select: { id: true, name: true, status: true, startDate: true } } },
      },
    },
  });
  if (!sponsor) return Response.json({ error: "Sponsor no encontrado" }, { status: 404 });

  return Response.json({
    id: sponsor.id,
    name: sponsor.name,
    logoUrl: sponsor.logoUrl,
    website: sponsor.website,
    tournaments: sponsor.tournaments.map((t) => t.tournament),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  if (!body) return badRequest();

  const data: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(pick(body, EDITABLE))) {
    const required = key === "name";
    if (value === null ? required : typeof value !== "string" || (required && !value.trim())) {
      return badRequest(`${key} inválido`);
    }
    data[key] = value as string | null;
  }
  if (Object.keys(data).length === 0) return badRequest("No hay campos para actualizar");

  try {
    const sponsor = await prisma.sponsor.update({ where: { id }, data });
    return Response.json(sponsor);
  } catch {
    return Response.json({ error: "Error al actualizar sponsor" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  try {
    await prisma.sponsor.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "No se pudo eliminar el sponsor" }, { status: 409 });
  }
}
