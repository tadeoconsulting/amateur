import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, normalizeEmail, readJson, requireUser } from "@/_lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) {
    return badRequest("email requerido");
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  try {
    // Quien invita es siempre el usuario de la sesión, no un valor enviado por el cliente.
    const invitation = await prisma.playerInvitation.create({
      data: { email, clubId: id, invitedBy: auth.user.id, expiresAt },
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
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  // Los tokens de invitación son secretos: solo los ve quien gestiona el club.
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const invitations = await prisma.playerInvitation.findMany({
    where: { clubId: id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invitations);
}
