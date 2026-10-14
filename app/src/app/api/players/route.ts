import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { isAdmin, requireUser } from "@/_lib/auth";
import { playerIdentity, visibleIdentity } from "@/_lib/player-identity";
import { effectiveStatus } from "@/_lib/profile-invitation";
import { canSeeFullIn, clubsWithFullNames, todayIso } from "@/_lib/minor-visibility-server";

type WithInvitation = { invitations?: { id: string; token: string; email: string | null; status: string; expiresAt: Date; acceptedBy?: { firstName: string; lastName: string; email: string } | null }[] };

/** Resumen de la invitación vigente de un provisional (para la fila del panel); null si no tiene. */
function summarize(p: WithInvitation) {
  const i = p.invitations?.[0];
  if (!i) return null;
  return {
    id: i.id,
    token: i.token,
    email: i.email,
    status: effectiveStatus(i.status, i.expiresAt, new Date()),
    expiresAt: i.expiresAt,
    acceptedBy: i.acceptedBy ? { name: `${i.acceptedBy.firstName} ${i.acceptedBy.lastName}`, email: i.acceptedBy.email } : null,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const search = request.nextUrl.searchParams.get("search");
  const clubId = request.nextUrl.searchParams.get("clubId");
  const status = request.nextUrl.searchParams.get("status");

  // Los jugadores provisionales (sin cuenta) no se buscan ni se invitan: no hay a quién.
  const admin = isAdmin(auth.user);
  // Los jugadores provisionales (sin cuenta, especificación 009) solo los ve un admin: no se buscan ni se
  // invitan desde la comunidad, no hay a quién. Solo el admin los lista, con su DNI, para corregirlos.
  const where: Record<string, unknown> = admin ? {} : { userId: { not: null } };

  if (search) {
    const byAccount = {
      user: {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ],
      },
    };
    if (admin) {
      where.OR = [
        byAccount,
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { dni: { contains: search } },
      ];
    } else {
      Object.assign(where, byAccount);
    }
  }

  if (clubId) where.clubId = clubId;
  if (status) where.status = status;

  const players = await prisma.playerProfile.findMany({
    where,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          phone: true,
          birthDate: true, // solo para decidir si es menor: no sale en la respuesta
        },
      },
      club: { select: { id: true, name: true, shortName: true } },
      category: { select: { id: true, name: true, gender: true } },
      // Solo el admin ve el estado de las invitaciones de un provisional (con su enlace, para copiarlo).
      ...(admin && {
        invitations: {
          where: { status: { in: ["pending", "review", "locked"] } },
          orderBy: { createdAt: "desc" as const },
          take: 1,
          include: { acceptedBy: { select: { firstName: true, lastName: true, email: true } } },
        },
      }),
    },
  });

  // Correo y teléfono de los jugadores: solo para admins.
  const showContact = admin;
  // Un menor de 18 sale abreviado ("Luigui F.") salvo para quien lo gestiona (ver minor-visibility-server.ts).
  const visible = await clubsWithFullNames(auth.user, players.flatMap((p) => (p.clubId ? [p.clubId] : [])));
  const today = todayIso();
  const seen = (p: (typeof players)[number], who: ReturnType<typeof playerIdentity>) =>
    visibleIdentity(who, today, p.userId === auth.user.id || canSeeFullIn(visible, p.clubId));

  return Response.json(
    players
      .map((p) => ({ p, who: playerIdentity(p) }))
      .sort((a, b) => a.who.firstName.localeCompare(b.who.firstName, "es") || a.who.lastName.localeCompare(b.who.lastName, "es"))
      .map(({ p, who }) => ({
        id: p.id,
        userId: p.userId,
        provisional: who.provisional,
        number: p.number,
        position: p.position,
        status: p.status,
        // Sin cuenta no hay correo ni teléfono ni foto: el nombre sale del perfil.
        user: p.user
          ? showContact
            ? { ...p.user, birthDate: undefined }
            : { ...p.user, ...seen(p, who), email: null, phone: null, birthDate: undefined }
          : { firstName: who.firstName, lastName: who.lastName, email: null, avatarUrl: null, phone: null },
        // DNI y fecha de nacimiento de un provisional: solo el admin (nunca son públicos).
        ...(admin && who.provisional ? { dni: p.dni, birthDate: p.birthDate } : {}),
        ...(admin && who.provisional ? { invitation: summarize(p) } : {}),
        club: p.club,
        category: p.category,
      }))
  );
}
