import { type NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/_lib/prisma";
import { badRequest, canManageTournament, forbidden, hashPassword, normalizeEmail, readJson, requireUser } from "@/_lib/auth";
import { generateTempPassword } from "@/_lib/temp-password";

// Las mesas de un torneo (especificación 011): quienes gestionan el partido en vivo los días de juego. Las
// asigna el organizador del torneo o un admin.

const EMAIL_RE = /^\S+@\S+\.\S+$/;

const shape = (a: { createdAt: Date; user: { id: string; firstName: string; lastName: string; email: string } }) => ({
  userId: a.user.id,
  name: `${a.user.firstName} ${a.user.lastName}`.trim(),
  email: a.user.email,
  assignedAt: a.createdAt,
});

/** Las mesas asignadas a este torneo. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  const rows = await prisma.tournamentMesa.findMany({
    where: { tournamentId: id },
    select: { createdAt: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
  return Response.json(rows.map(shape));
}

/**
 * Asigna una mesa al torneo. Con `userId` es una cuenta de mesa que ya existe (un admin que la creó desde Usuarios).
 * Con `email`, `firstName` y `lastName`: si el correo no existe se crea la cuenta (solo con el perfil de mesa y una
 * contraseña temporal que se devuelve **una sola vez**); si es una cuenta de mesa, se le asigna el torneo; si tiene
 * otros perfiles, `409` (una mesa es solo mesa).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();

  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { id: true } });
  if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });

  let userId: string;
  let temporaryPassword: string | undefined;

  if (typeof body.userId === "string" && body.userId) {
    const user = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, roles: { select: { role: true } } } });
    if (!user) return Response.json({ error: "La cuenta no existe" }, { status: 404 });
    if (!user.roles.some((r) => r.role === Role.MESA)) return Response.json({ error: "Esa cuenta no es de mesa" }, { status: 409 });
    userId = user.id;
  } else {
    const email = normalizeEmail(body.email);
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    if (!email || !EMAIL_RE.test(email)) return badRequest("Escribe un correo válido");
    if (!firstName) return badRequest("Escribe el nombre de la mesa");

    const existing = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, roles: { select: { role: true } } },
    });
    if (existing) {
      const onlyMesa = existing.roles.length > 0 && existing.roles.every((r) => r.role === Role.MESA);
      if (!onlyMesa) return Response.json({ error: "Ese correo ya tiene una cuenta con otros perfiles: una mesa es solo mesa. Usa otro correo." }, { status: 409 });
      userId = existing.id;
    } else {
      temporaryPassword = generateTempPassword();
      const created = await prisma.user.create({
        data: { email, passwordHash: await hashPassword(temporaryPassword), firstName, lastName, roles: { create: [{ role: Role.MESA }] } },
        select: { id: true },
      });
      userId = created.id;
    }
  }

  const already = await prisma.tournamentMesa.findUnique({ where: { tournamentId_userId: { tournamentId: id, userId } }, select: { id: true } });
  if (already) return Response.json({ error: "Esa mesa ya está asignada a este torneo" }, { status: 409 });

  const assignment = await prisma.tournamentMesa.create({
    data: { tournamentId: id, userId, assignedById: auth.user.id },
    select: { createdAt: true, user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  });
  return Response.json({ ...shape(assignment), ...(temporaryPassword && { temporaryPassword }) }, { status: 201 });
}
