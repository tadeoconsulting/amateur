import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { email, invitedBy } = await request.json();

  if (!email || !invitedBy) {
    return Response.json({ error: "email e invitedBy requeridos" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    const invitation = await prisma.playerInvitation.create({
      data: { email, clubId: id, invitedBy, expiresAt },
    });

    return Response.json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
    }, { status: 201 });
  } catch (error) {
    console.error("Invite error:", error);
    return Response.json({ error: "Error al crear invitación" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const invitations = await prisma.playerInvitation.findMany({
    where: { clubId: id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invitations);
}
