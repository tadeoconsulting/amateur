import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { canManageClub, forbidden, requireUser } from "@/_lib/auth";

/**
 * Solicitudes de jugadores para unirse a este club (pantalla "Buscar equipos" del jugador →
 * "Equipo" del club, sección de solicitudes). Solo el dueño del club las ve.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageClub(auth.user, id))) return forbidden();

  const rows = await prisma.playerJoinRequest.findMany({
    where: { clubId: id, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  return Response.json(rows);
}

/**
 * Un jugador sin club pide unirse a este club. Reusa la fila si ya había una (rechazada o
 * cancelada antes) en vez de duplicar — ver @@unique([clubId, userId]) en el schema.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const club = await prisma.club.findUnique({ where: { id }, select: { id: true, isTemporary: true } });
  if (!club) return Response.json({ error: "Club no encontrado" }, { status: 404 });
  if (club.isTemporary) return Response.json({ error: "Este equipo no acepta solicitudes" }, { status: 409 });

  // Un jugador puede estar en varios clubes: solo se frena si ya es de ESTE.
  const alreadyMember = await prisma.playerProfile.findFirst({ where: { userId: auth.user.id, clubId: id }, select: { id: true } });
  if (alreadyMember) {
    return Response.json({ error: "Ya perteneces a este club" }, { status: 409 });
  }

  const existing = await prisma.playerJoinRequest.findUnique({
    where: { clubId_userId: { clubId: id, userId: auth.user.id } },
  });
  if (existing?.status === "pending") {
    return Response.json({ error: "Ya tienes una solicitud pendiente a este club" }, { status: 409 });
  }

  const request_ = existing
    ? await prisma.playerJoinRequest.update({
        where: { id: existing.id },
        data: { status: "pending", resolvedAt: null },
      })
    : await prisma.playerJoinRequest.create({
        data: { clubId: id, userId: auth.user.id },
      });

  return Response.json(request_, { status: 201 });
}
