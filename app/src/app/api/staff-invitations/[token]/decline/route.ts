import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { forbidden, getCurrentUser, normalizeEmail, unauthorized } from "@/_lib/auth";
import { invitationProblem, resolveStaffInvitation } from "@/_lib/invite";

// Rechaza una invitación de staff dirigida a tu correo.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { token } = await params;
  const resolved = await resolveStaffInvitation(token);
  if (!resolved.ok) return invitationProblem(resolved.reason);
  if (normalizeEmail(user.email) !== normalizeEmail(resolved.invitation.email)) return forbidden();

  await prisma.staffInvitation.update({ where: { id: resolved.invitation.id }, data: { status: "declined" } });
  return Response.json({ success: true });
}
