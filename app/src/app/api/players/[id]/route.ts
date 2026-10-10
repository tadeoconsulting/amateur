import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { playerIdentity } from "@/_lib/player-identity";
import { parseProvisionalEdit } from "@/_lib/provisional-import";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;

  const profile = await prisma.playerProfile.findUnique({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, birthDate: true, gender: true } },
      club: { select: { id: true, name: true, shortName: true, logoUrl: true } },
      category: { select: { name: true, gender: true } },
      stats: {
        include: { tournament: { select: { id: true, name: true } } },
      },
    },
  });

  if (!profile) {
    return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  }

  // La fecha de nacimiento solo la ve el propio jugador, quien gestiona su club o un admin.
  const canSeeBirthDate =
    profile.userId === auth.user.id ||
    isAdmin(auth.user) ||
    (profile.clubId ? await canManageClub(auth.user, profile.clubId) : false);

  const who = playerIdentity(profile);
  return Response.json({
    id: profile.id,
    firstName: who.firstName,
    lastName: who.lastName,
    avatarUrl: who.avatarUrl,
    birthDate: canSeeBirthDate ? who.birthDate : null,
    provisional: who.provisional,
    gender: profile.user?.gender ?? null,
    position: profile.position,
    number: profile.number,
    status: profile.status,
    club: profile.club,
    category: profile.category,
    stats: profile.stats.map((s) => ({
      tournament: s.tournament,
      goals: s.goals,
      assists: s.assists,
      yellowCards: s.yellowCards,
      redCards: s.redCards,
      matchesPlayed: s.matchesPlayed,
    })),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const profile = await prisma.playerProfile.findUnique({
    where: { id },
    select: { userId: true, clubId: true },
  });
  if (!profile) {
    return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  }
  // Un jugador provisional (sin cuenta) lo gestiona solo un admin; el delegado y el organizador lo ven y nada más.
  if (profile.userId === null && !isAdmin(user)) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { position, number, categoryId, status, clubId } = body;

  // Los datos propios de un provisional (nombres, DNI, fecha de nacimiento): solo un admin, y solo mientras no tenga cuenta.
  const editsOwnData = ["firstName", "lastName", "dni", "birthDate"].some((k) => body[k] !== undefined);
  let ownData: { firstName?: string; lastName?: string; dni?: string; birthDate?: string } = {};
  if (editsOwnData) {
    if (profile.userId !== null) return badRequest("Este jugador tiene cuenta: sus datos se editan desde su cuenta");
    const parsed = parseProvisionalEdit(body, new Date().toISOString().slice(0, 10));
    if ("error" in parsed) return badRequest(parsed.error);
    ownData = parsed.data;
    if (ownData.dni) {
      const taken = await prisma.playerProfile.findFirst({ where: { dni: ownData.dni, NOT: { id } }, select: { id: true } });
      if (taken) return Response.json({ error: "Ya hay otro jugador provisional con ese DNI" }, { status: 409 });
    }
  }
  // Un provisional siempre pertenece a un equipo: sin equipo no hay a quién mostrarlo.
  if (profile.userId === null && clubId === null) return badRequest("Un jugador provisional no puede quedar sin equipo");

  // Posición y dorsal los puede editar el propio jugador. Club, categoría y estado,
  // solo quien gestiona el club del jugador (o el club al que se lo suma si no tiene uno).
  const isSelf = profile.userId === user.id;
  const touchesTeamFields = categoryId !== undefined || status !== undefined || clubId !== undefined;

  const managesCurrentClub = profile.clubId ? await canManageClub(user, profile.clubId) : false;
  const claimsFreeAgent = !profile.clubId && typeof clubId === "string" ? await canManageClub(user, clubId) : false;
  const isManager = isAdmin(user) || managesCurrentClub || claimsFreeAgent;

  if (touchesTeamFields ? !isManager : !(isSelf || isManager)) return forbidden();

  // La categoría tiene que ser del club al que queda asignado el jugador.
  if (typeof categoryId === "string" && categoryId) {
    const targetClubId = typeof clubId === "string" ? clubId : profile.clubId;
    const category = await prisma.teamCategory.findFirst({
      where: { id: categoryId, clubId: targetClubId ?? undefined },
      select: { id: true },
    });
    if (!category) return badRequest("La categoría no pertenece al club del jugador");
  }

  try {
    const updated = await prisma.playerProfile.update({
      where: { id },
      data: {
        ...(position !== undefined && { position: position as string | null }),
        ...(number !== undefined && { number: number as number | null }),
        ...(categoryId !== undefined && { categoryId: categoryId as string | null }),
        ...(typeof status === "string" && status && { status }),
        ...(clubId !== undefined && { clubId: clubId as string | null }),
        ...(ownData.firstName !== undefined && { firstName: ownData.firstName }),
        ...(ownData.lastName !== undefined && { lastName: ownData.lastName }),
        ...(ownData.dni !== undefined && { dni: ownData.dni }),
        ...(ownData.birthDate !== undefined && { birthDate: new Date(`${ownData.birthDate}T00:00:00Z`) }),
      },
    });
    // El DNI y la fecha de nacimiento de un provisional no vuelven en la respuesta.
    const { dni: _dni, birthDate: _birthDate, ...safe } = updated;
    void _dni;
    void _birthDate;
    return Response.json(safe);
  } catch {
    return Response.json({ error: "Error al actualizar jugador" }, { status: 500 });
  }
}

/**
 * Elimina a un jugador provisional cargado por error (solo un admin). Un jugador con cuenta no se elimina por
 * acá: se elimina su cuenta desde Usuarios. Sus estadísticas y alineaciones se van con él; en las jugadas de
 * los partidos queda el registro, sin el jugador.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const profile = await prisma.playerProfile.findUnique({ where: { id }, select: { userId: true } });
  if (!profile) return Response.json({ error: "Jugador no encontrado" }, { status: 404 });
  if (profile.userId !== null) {
    return Response.json({ error: "Este jugador tiene cuenta: elimínalo desde Usuarios" }, { status: 409 });
  }

  try {
    await prisma.playerProfile.delete({ where: { id } });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Error al eliminar al jugador" }, { status: 500 });
  }
}
