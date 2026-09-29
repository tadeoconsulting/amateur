import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, readJson, requireUser } from "@/_lib/auth";

const VALID_ROLES = ["delegado", "asistente", "director_tecnico"];

// Solo el rol se edita acá: nombre/teléfono/correo son de la cuenta de esa persona, no del
// club — cambiarlos le corresponde a ella desde su propio perfil, no al dueño del club.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, staffId } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body || typeof body.role !== "string" || !VALID_ROLES.includes(body.role)) {
    return badRequest(`role debe ser uno de: ${VALID_ROLES.join(", ")}`);
  }

  const member = await prisma.staffMember.findFirst({ where: { id: staffId, clubId: id } });
  if (!member) return Response.json({ error: "No encontrado" }, { status: 404 });

  try {
    const updated = await prisma.staffMember.update({ where: { id: staffId }, data: { role: body.role } });
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Ya tiene ese rol en el club" }, { status: 409 });
  }
}

// Quita a la persona del staff del club — no borra su cuenta, solo la relación con este club.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; staffId: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id, staffId } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const { count } = await prisma.staffMember.deleteMany({ where: { id: staffId, clubId: id } });
  if (count === 0) return Response.json({ error: "No encontrado" }, { status: 404 });

  return Response.json({ success: true });
}
