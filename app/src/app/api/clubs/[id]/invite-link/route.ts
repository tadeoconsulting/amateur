import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { canManageClub, forbidden, requireUser } from "@/_lib/auth";
import { newInviteToken } from "@/_lib/invite";

// El link del club para compartir por WhatsApp. Solo lo ve y lo administra quien gestiona el club.

const linkFor = (token: string) => `/jugador/invitacion?token=${token}`;

/** Devuelve el link del club; si todavía no tiene uno, lo genera. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const club = await prisma.club.findUnique({ where: { id }, select: { inviteToken: true } });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });

  const token = club.inviteToken ?? newInviteToken();
  if (!club.inviteToken) await prisma.club.update({ where: { id }, data: { inviteToken: token } });

  return Response.json({ token, path: linkFor(token) });
}

/** Revoca el link actual generando uno nuevo: el anterior deja de servir. */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const token = newInviteToken();
  try {
    await prisma.club.update({ where: { id }, data: { inviteToken: token } });
  } catch {
    return Response.json({ error: "Club no encontrado" }, { status: 404 });
  }
  return Response.json({ token, path: linkFor(token) });
}
