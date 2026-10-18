import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { isAdmin, requireUser } from "@/_lib/auth";
import { canDo, coDelegateSlotsLeft, MAX_CO_DELEGATES } from "@/_lib/club-delegate";
import { clubRoleFor, coDelegateUsage } from "@/_lib/club-delegate-server";
import { effectiveStatus } from "@/_lib/profile-invitation";

// Los delegados de un equipo (especificación 014): el principal (`Club.ownerId`), los co-delegados y, para quien los
// gestiona, las invitaciones vigentes con su enlace.

const invitationLink = (request: NextRequest, token: string) => `${request.nextUrl.origin}/delegado/co-delegado/${token}`;

/**
 * Quiénes gestionan el equipo. Lo ve cualquier delegado del club (principal o co-delegado) y un admin. Los correos de los
 * co-delegados y las invitaciones con su enlace los ve solo quien puede gestionar a los delegados (el principal o un admin).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;

  const role = await clubRoleFor(auth.user.id, isAdmin(auth.user), id);
  if (!canDo(role, "manage")) {
    const exists = await prisma.club.findUnique({ where: { id }, select: { id: true } });
    return exists ? Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 }) : Response.json({ error: "Club no encontrado" }, { status: 404 });
  }

  const club = await prisma.club.findUnique({
    where: { id },
    select: {
      isTemporary: true,
      owner: { select: { id: true, firstName: true, lastName: true } },
      coDelegates: { orderBy: { createdAt: "asc" }, select: { userId: true, createdAt: true, user: { select: { firstName: true, lastName: true, email: true } } } },
    },
  });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });

  const manages = canDo(role, "manage_delegates");
  const now = new Date();
  const invitations = manages
    ? await prisma.coDelegateInvitation.findMany({
        where: { clubId: id, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: { id: true, token: true, email: true, status: true, expiresAt: true, createdAt: true },
      })
    : [];
  const usage = await coDelegateUsage(id, now);

  return Response.json({
    role,
    canManage: manages,
    // Un equipo temporal todavía no tiene delegado: no admite co-delegados.
    isTemporary: club.isTemporary,
    canInvite: manages && !club.isTemporary && coDelegateSlotsLeft(usage.accepted, usage.pending) > 0,
    max: MAX_CO_DELEGATES,
    slotsLeft: coDelegateSlotsLeft(usage.accepted, usage.pending),
    principal: { userId: club.owner.id, name: `${club.owner.firstName} ${club.owner.lastName}`.trim() },
    coDelegates: club.coDelegates.map((d) => ({
      userId: d.userId,
      name: `${d.user.firstName} ${d.user.lastName}`.trim(),
      ...(manages && { email: d.user.email }),
      createdAt: d.createdAt,
    })),
    invitations: invitations
      .filter((i) => effectiveStatus(i.status, i.expiresAt, now) === "pending")
      .map((i) => ({ id: i.id, url: invitationLink(request, i.token), email: i.email, expiresAt: i.expiresAt, createdAt: i.createdAt })),
  });
}
