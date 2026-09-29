import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, pick, readJson, requireUser } from "@/_lib/auth";

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

  const sede = await prisma.sede.update({ where: { id }, data });
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
