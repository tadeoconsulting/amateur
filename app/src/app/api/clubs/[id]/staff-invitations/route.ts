import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, normalizeEmail, readJson, requireUser } from "@/_lib/auth";
import { INVITE_DAYS } from "@/_lib/invite";
import { enviarCorreo } from "@/_lib/email";
import { invitacionStaff, STAFF_ROLE_LABELS } from "@/_lib/email-templates";
import type { StaffRole } from "@/_lib/types";

const STAFF_ROLES: StaffRole[] = ["delegado", "asistente", "director_tecnico"];

/** Manda el correo de una invitación de staff (nueva o reenviada). Nunca lanza. */
async function enviarInvitacionStaff(
  request: NextRequest,
  clubId: string,
  inviter: { firstName: string; lastName: string },
  invitation: { email: string; role: string; token: string }
) {
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { name: true } });
  return enviarCorreo({
    to: invitation.email,
    ...invitacionStaff({
      clubName: club?.name ?? "un club",
      inviterName: `${inviter.firstName} ${inviter.lastName}`.trim(),
      roleLabel: STAFF_ROLE_LABELS[invitation.role] ?? invitation.role,
      url: `${request.nextUrl.origin}/staff/invitacion?token=${invitation.token}`,
      days: INVITE_DAYS,
    }),
  });
}

/**
 * Invita por correo a alguien que todavía no tiene cuenta para un rol de staff (por ejemplo,
 * el director técnico que no aparece en la búsqueda porque nunca se registró). Quien ya tiene
 * cuenta se vincula directo con POST /api/clubs/:id/staff.
 */
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
  const role = body?.role as StaffRole | undefined;

  if (!email) return badRequest("Indica el correo (email)");
  if (!role || !STAFF_ROLES.includes(role)) {
    return badRequest(`role debe ser uno de: ${STAFF_ROLES.join(", ")}`);
  }

  const alreadyStaff = await prisma.staffMember.findFirst({
    where: { clubId: id, role, user: { email: { equals: email, mode: "insensitive" } } },
    select: { id: true },
  });
  if (alreadyStaff) return Response.json({ error: "Ya tiene ese rol en el club" }, { status: 409 });

  // Si ya tiene una invitación vigente para el mismo rol en este club, se devuelve esa.
  const pending = await prisma.staffInvitation.findFirst({
    where: { clubId: id, role, email: { equals: email, mode: "insensitive" }, status: "pending", expiresAt: { gt: new Date() } },
  });
  if (pending) {
    // Volver a invitar al mismo correo REENVÍA el correo: la invitación pudo crearse antes de que
    // hubiera proveedor de correo, o el mensaje perderse, y de otro modo esa persona no tendría cómo
    // recibirlo nunca.
    const emailed = (await enviarInvitacionStaff(request, id, auth.user, pending)) === "sent";
    return Response.json({ id: pending.id, token: pending.token, email: pending.email, role: pending.role, expiresAt: pending.expiresAt, alreadyInvited: true, emailed });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITE_DAYS);

  try {
    const invitation = await prisma.staffInvitation.create({
      data: { email, role, clubId: id, invitedBy: auth.user.id, expiresAt },
    });

    // Quien invita no tiene cómo mandarle el link a alguien sin cuenta: por eso va por correo.
    // Si no sale (sin proveedor configurado, o falló), la invitación existe igual.
    const result = await enviarInvitacionStaff(request, id, auth.user, invitation);

    return Response.json({
      id: invitation.id,
      token: invitation.token,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      emailed: result === "sent",
    }, { status: 201 });
  } catch (error) {
    console.error("Staff invitation error:", error);
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

  const invitations = await prisma.staffInvitation.findMany({
    where: { clubId: id },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(invitations);
}
