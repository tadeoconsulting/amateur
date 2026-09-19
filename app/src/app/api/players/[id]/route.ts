import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";

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

  return Response.json({
    id: profile.id,
    firstName: profile.user.firstName,
    lastName: profile.user.lastName,
    avatarUrl: profile.user.avatarUrl,
    birthDate: canSeeBirthDate ? profile.user.birthDate : null,
    gender: profile.user.gender,
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

  const body = await readJson(request);
  if (!body) return badRequest();
  const { position, number, categoryId, status, clubId } = body;

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
      },
    });
    return Response.json(updated);
  } catch {
    return Response.json({ error: "Error al actualizar jugador" }, { status: 500 });
  }
}
