import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageClub, forbidden, readJson, requireUser } from "@/_lib/auth";
import { compareByLastName, playerIdentity } from "@/_lib/player-identity";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const categoryId = request.nextUrl.searchParams.get("categoryId");
  // "cat-sin" es el bucket virtual "Sin categoría" de la UI, no un id real de TeamCategory.
  const categoryFilter =
    categoryId === "cat-sin" ? { categoryId: null } : categoryId ? { categoryId } : {};

  const players = await prisma.playerProfile.findMany({
    where: { clubId: id, ...categoryFilter },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true, birthDate: true } },
      category: { select: { id: true, name: true } },
    },
  });

  // La fecha de nacimiento es dato personal (puede ser de menores): solo la ve quien gestiona el club.
  const canSeeBirthDate = await canManageClub(auth.user, id);

  return Response.json(
    // Misma forma que PlayerListItem (nombre dentro de `user`): así la esperan las pantallas.
    // Antes devolvía el nombre plano y la lista de jugadores de la pantalla en vivo se rompía.
    // Un jugador provisional (sin cuenta, ver especificación 009) trae su nombre del perfil; el DNI
    // nunca sale de acá.
    players
      .map((p) => ({ p, who: playerIdentity(p) }))
      .sort((a, b) => compareByLastName(a.who, b.who))
      .map(({ p, who }) => ({
        id: p.id,
        number: p.number,
        position: p.position,
        status: p.status,
        provisional: who.provisional,
        user: {
          firstName: who.firstName,
          lastName: who.lastName,
          avatarUrl: who.avatarUrl,
          birthDate: canSeeBirthDate ? who.birthDate : null,
        },
        category: p.category,
      }))
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { userId, position, number, categoryId } = body;

  if (typeof userId !== "string" || !userId) {
    return badRequest("userId requerido");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, playerProfiles: { select: { id: true, clubId: true } } },
  });
  if (!target) {
    return Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  }
  // Un jugador que ya está en otro club no se suma sin su consentimiento: para eso está la
  // invitación (puede estar en varios, pero que decida él). Se agrega directo solo a quien no tiene
  // club todavía o ya es de este.
  const inThisClub = target.playerProfiles.find((p) => p.clubId === id);
  const free = target.playerProfiles.find((p) => p.clubId === null);
  if (!inThisClub && !free && target.playerProfiles.length > 0) {
    return Response.json({ error: "El jugador ya está en otro equipo: invítalo para que decida" }, { status: 409 });
  }

  // La categoría tiene que ser de este mismo club.
  if (typeof categoryId === "string" && categoryId) {
    const category = await prisma.teamCategory.findFirst({ where: { id: categoryId, clubId: id }, select: { id: true } });
    if (!category) return badRequest("La categoría no pertenece a este club");
  }

  const data = {
    clubId: id,
    position: typeof position === "string" ? position : null,
    number: Number.isInteger(number) ? (number as number) : null,
    categoryId: typeof categoryId === "string" && categoryId ? categoryId : null,
  };

  try {
    const existing = inThisClub ?? free;
    const profile = existing
      ? await prisma.playerProfile.update({ where: { id: existing.id }, data })
      : await prisma.playerProfile.create({ data: { userId, ...data } });
    return Response.json(profile, { status: 201 });
  } catch (error) {
    console.error("Add player error:", error);
    return Response.json({ error: "Error al agregar jugador" }, { status: 500 });
  }
}
