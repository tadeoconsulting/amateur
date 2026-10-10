import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { badRequest, readJson, requireRole } from "@/_lib/auth";
import { omitInviteToken } from "@/_lib/club-public";

/**
 * Convierte un equipo temporal (cargado por un organizador para su torneo, sin dueño propio) en un
 * equipo oficial: pasa a ser de un delegado con cuenta propia y deja de ser temporal. Desde ahí
 * aparece en la búsqueda de equipos de la comunidad, recibe solicitudes de jugadores y el
 * delegado lo gestiona desde su perfil de club. Solo un admin lo hace.
 *
 * Sigue inscrito en los torneos donde ya estaba (la inscripción no se toca): el organizador
 * conserva su fixture, tabla y resultados.
 *
 * El nuevo dueño no puede ser un administrador (esas cuentas no tienen otros perfiles) ni dirigir
 * ya otro equipo: la app del club trabaja con un equipo por cuenta.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(); // sin roles en la lista: solo pasa un ADMIN
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const body = await readJson(request);
  const ownerId = typeof body?.ownerId === "string" ? body.ownerId : "";
  if (!ownerId) return badRequest("ownerId requerido");

  const club = await prisma.club.findUnique({ where: { id }, select: { id: true, isTemporary: true, ownerId: true } });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });
  if (!club.isTemporary) return Response.json({ error: "Este equipo ya es oficial" }, { status: 409 });

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
    select: { id: true, roles: { select: { role: true } }, _count: { select: { ownedClubs: true } } },
  });
  if (!owner) return Response.json({ error: "El usuario elegido no existe" }, { status: 404 });
  if (owner.roles.some((r) => r.role === Role.ADMIN)) {
    return badRequest("Una cuenta de administrador no puede ser delegada de un equipo");
  }
  if (owner._count.ownedClubs > 0) {
    return Response.json(
      { error: "Ese usuario ya dirige un equipo: cada delegado maneja el suyo, con su propia cuenta" },
      { status: 409 }
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.club.update({ where: { id }, data: { ownerId, isTemporary: false } });
    await tx.userRole.upsert({
      where: { userId_role: { userId: ownerId, role: Role.CLUB_OWNER } },
      update: {},
      create: { userId: ownerId, role: Role.CLUB_OWNER },
    });
    return result;
  });

  return Response.json(omitInviteToken(updated));
}
