import { type NextRequest } from "next/server";
import { invitationProblem, resolveStaffInvitation } from "@/_lib/invite";

// Vista previa pública: lo mínimo para mostrar "Te invitaron como <rol> de <club>" antes de
// que la persona tenga cuenta. Solo expone el correo al que iba dirigida.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const resolved = await resolveStaffInvitation(token);
  if (!resolved.ok) return invitationProblem(resolved.reason);

  return Response.json({
    club: resolved.club,
    role: resolved.invitation.role,
    email: resolved.invitation.email,
  });
}
