import { type NextRequest } from "next/server";
import { invitationProblem, resolveInvitation } from "@/_lib/invite";

// Vista previa pública de una invitación: lo mínimo para mostrar "Únete a <club>" antes de
// que la persona tenga cuenta. No expone datos de nadie salvo el correo al que iba dirigida.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const resolved = await resolveInvitation(token);
  if (!resolved.ok) return invitationProblem(resolved.reason);

  return Response.json({
    kind: resolved.kind,
    club: resolved.club,
    ...(resolved.kind === "email" && { email: resolved.invitation.email }),
  });
}
