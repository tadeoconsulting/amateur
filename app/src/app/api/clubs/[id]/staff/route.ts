import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, readJson, requireUser } from "@/_lib/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const staff = await prisma.staffMember.findMany({
    where: { clubId: id },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, phone: true, email: true } },
    },
  });

  return Response.json(
    staff.map((s) => ({
      id: s.id,
      role: s.role,
      firstName: s.user.firstName,
      lastName: s.user.lastName,
      avatarUrl: s.user.avatarUrl,
      phone: s.user.phone,
      email: s.user.email,
    }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  const userId = body?.userId;
  const role = body?.role;

  if (typeof userId !== "string" || !userId || typeof role !== "string" || !role) {
    return badRequest("userId y role requeridos");
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!target) {
    return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  try {
    const member = await prisma.staffMember.create({
      data: { userId, clubId: id, role },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    return Response.json(member, { status: 201 });
  } catch {
    return Response.json({ error: "El miembro ya tiene ese rol en el club" }, { status: 409 });
  }
}
