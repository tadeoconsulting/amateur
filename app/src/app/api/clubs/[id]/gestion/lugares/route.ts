import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, readJson } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { placeError } from "@/_lib/club-training";

// Los lugares de entrenamiento del club (especificación 015, entrega 2). Son del club: el delegado principal y los
// co-delegados comparten la misma lista.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const withArchived = request.nextUrl.searchParams.get("archivados") === "1";
  const places = await prisma.trainingPlace.findMany({ where: { clubId: id, ...(withArchived ? {} : { archivedAt: null }) }, orderBy: { name: "asc" } });
  return Response.json(places.map((p) => ({ id: p.id, name: p.name, address: p.address, archived: p.archivedAt !== null })));
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const body = await readJson(request);
  if (!body) return badRequest();
  const error = placeError(body);
  if (error) return badRequest(error);
  const name = (body.name as string).trim();
  const address = typeof body.address === "string" && body.address.trim() ? body.address.trim() : null;

  const taken = await prisma.trainingPlace.findFirst({ where: { clubId: id, archivedAt: null, name: { equals: name, mode: "insensitive" } }, select: { id: true } });
  if (taken) return Response.json({ error: "Ya tienes un lugar con ese nombre" }, { status: 409 });

  const place = await prisma.trainingPlace.create({ data: { clubId: id, name, address } });
  return Response.json({ id: place.id, name: place.name, address: place.address, archived: false }, { status: 201 });
}
