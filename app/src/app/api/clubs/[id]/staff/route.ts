import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
  const { id } = await params;
  const { userId, role } = await request.json();

  if (!userId || !role) {
    return Response.json({ error: "userId y role requeridos" }, { status: 400 });
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
