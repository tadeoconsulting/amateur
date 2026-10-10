import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { badRequest, readJson, requireUser } from "@/_lib/auth";
import { checkAccept, MAX_DNI_ATTEMPTS } from "@/_lib/profile-invitation";
import { executeLink, loadLinkContext } from "@/_lib/provisional-link-server";

/**
 * Acepta una invitación a reclamar un perfil provisional (especificación 009, entrega 3). Exige sesión: es la
 * cuenta de quien la acepta la que se vincula. Hay que escribir el DNI del perfil.
 *
 * - Con el DNI correcto y una cuenta sin ficha en ese equipo → se vincula (`status: "accepted"`).
 * - Si la cuenta YA tiene ficha en ese equipo (o una sin equipo) hay que unir perfiles, y eso solo lo hace un
 *   admin: la invitación pasa a `review` y no se toca nada (`status: "review"`).
 * - Un DNI equivocado cuenta como intento; al llegar al límite (`MAX_DNI_ATTEMPTS`) la invitación se bloquea.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { token } = await params;
  const body = await readJson(request);
  if (!body) return badRequest();

  const invitation = token && token.length <= 100
    ? await prisma.profileInvitation.findUnique({
        where: { token },
        select: { id: true, status: true, attempts: true, email: true, expiresAt: true, profile: { select: { id: true, userId: true, dni: true } } },
      })
    : null;
  if (!invitation) return Response.json({ error: "La invitación no existe o fue cancelada" }, { status: 404 });
  if (invitation.profile.userId !== null || !invitation.profile.dni) {
    return Response.json({ error: "Esta invitación ya fue usada o se canceló." }, { status: 410 });
  }

  const check = checkAccept({
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    now: new Date(),
    attempts: invitation.attempts,
    email: invitation.email,
    sessionEmail: auth.user.email,
    typedDni: body.dni,
    profileDni: invitation.profile.dni,
  });
  if (!check.ok) {
    if (check.countAttempt) {
      const attempts = invitation.attempts + 1;
      await prisma.profileInvitation.update({ where: { id: invitation.id }, data: { attempts, ...(attempts >= MAX_DNI_ATTEMPTS && { status: "locked" }) } });
    }
    return Response.json({ error: check.message, code: check.code, attemptsLeft: check.attemptsLeft }, { status: check.status });
  }

  const ctx = await loadLinkContext(invitation.profile.id, auth.user.id);
  if (!ctx.ok) return Response.json({ error: ctx.error }, { status: ctx.status });

  // Unir perfiles es decisión de un admin: se deja constancia de quién aceptó y se espera.
  if (ctx.plan.mode === "merge") {
    await prisma.profileInvitation.update({ where: { id: invitation.id }, data: { status: "review", acceptedById: auth.user.id, acceptedAt: new Date() } });
    return Response.json({ status: "review" });
  }

  try {
    await executeLink(ctx, { acceptInvitationId: invitation.id });
    return Response.json({ status: "accepted" });
  } catch (error) {
    console.error("Accept profile invitation error:", error);
    return Response.json({ error: "No se pudo vincular tu perfil. Inténtalo de nuevo." }, { status: 500 });
  }
}
