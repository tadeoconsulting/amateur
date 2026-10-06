import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { getCurrentUser, normalizeEmail, readJson, unauthorized, forbidden } from "@/_lib/auth";
import { invitationProblem, joinClub, resolveInvitation } from "@/_lib/invite";

/**
 * La persona con sesión acepta la invitación y entra al club como jugador.
 * Body opcional: { position?: string }. Si ya está en otros clubes se suma a este: puede jugar en
 * varios (cada club es una ficha propia).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { token } = await params;
  const resolved = await resolveInvitation(token);
  if (!resolved.ok) return invitationProblem(resolved.reason);

  // Una invitación por correo es para esa cuenta, aunque otra persona tenga el token.
  if (resolved.kind === "email" && normalizeEmail(user.email) !== normalizeEmail(resolved.invitation.email)) {
    return forbidden();
  }

  const body = (await readJson(request)) ?? {};
  const position = typeof body.position === "string" ? body.position : null;

  const result = await joinClub(user.id, resolved.club.id, { position });

  if (resolved.kind === "email") {
    await prisma.playerInvitation.update({ where: { id: resolved.invitation.id }, data: { status: "accepted" } });
  }
  return Response.json({ joined: true, already: result.already, club: resolved.club });
}
