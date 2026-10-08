import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { forbidden, isAdmin, requireUser } from "@/_lib/auth";

/** Restaura un torneo eliminado (solo un admin): vuelve a verse con todo lo que tenía. */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({ where: { id }, select: { deletedAt: true } });
  if (!tournament) return Response.json({ error: "Torneo no encontrado" }, { status: 404 });
  if (!tournament.deletedAt) return Response.json({ error: "Este torneo no está eliminado" }, { status: 409 });

  await prisma.tournament.update({ where: { id }, data: { deletedAt: null } });
  return Response.json({ success: true });
}
