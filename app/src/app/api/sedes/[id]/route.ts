import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, pick, readJson, requireUser } from "@/_lib/auth";
import { sedeText } from "@/_lib/sede-text";

const EDITABLE = ["name", "city", "address", "reference"] as const;

async function findOwned(id: string, organizerId: string) {
  return prisma.sede.findFirst({ where: { id, organizerId } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const sede = await findOwned(id, auth.user.id);
  if (!sede) return Response.json({ error: "Sede no encontrada" }, { status: 404 });
  return Response.json(sede);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await findOwned(id, auth.user.id);
  if (!existing) return forbidden();

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

  // La sede viaja como texto ("Nombre, dirección") copiado en cada torneo y en sus partidos: al editarla
  // se actualiza ese texto donde todavía era el de esta sede, para que el cambio se vea en los torneos
  // y en las pantallas del jugador, el club y el público. Un partido con otra sede puesta a mano no se toca.
  const before = sedeText(existing);
  const sede = await prisma.sede.update({ where: { id }, data });
  const after = sedeText(sede);
  if (after !== before) {
    await prisma.$transaction([
      prisma.tournament.updateMany({ where: { organizerId: auth.user.id, location: before }, data: { location: after } }),
      prisma.match.updateMany({ where: { tournament: { organizerId: auth.user.id }, location: before }, data: { location: after } }),
    ]);
  }
  return Response.json(sede);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { count } = await prisma.sede.deleteMany({ where: { id, organizerId: auth.user.id } });
  if (count === 0) return Response.json({ error: "Sede no encontrada" }, { status: 404 });

  return Response.json({ success: true });
}
