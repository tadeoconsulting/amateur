import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { forbidden, getCurrentUser, normalizeEmail, unauthorized } from "@/_lib/auth";
import { invitationProblem, resolveInvitation } from "@/_lib/invite";

// Rechaza una invitación dirigida a tu correo. El link del club no se "rechaza": simplemente no se usa.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { token } = await params;
  const resolved = await resolveInvitation(token);
  if (!resolved.ok) return invitationProblem(resolved.reason);
  if (resolved.kind !== "email") {
    return Response.json({ error: "Solo se pueden rechazar invitaciones personales" }, { status: 400 });
  }
  if (normalizeEmail(user.email) !== normalizeEmail(resolved.invitation.email)) return forbidden();

  await prisma.playerInvitation.update({ where: { id: resolved.invitation.id }, data: { status: "declined" } });
  return Response.json({ success: true });
}
