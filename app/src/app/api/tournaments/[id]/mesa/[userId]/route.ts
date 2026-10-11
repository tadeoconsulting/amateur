import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { canManageTournament, forbidden, requireUser } from "@/_lib/auth";

/** Quita una mesa del torneo: pierde el acceso a sus partidos al instante. La cuenta sigue existiendo. */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id, userId } = await params;
  if (!(await canManageTournament(auth.user, id))) return forbidden();

  const removed = await prisma.tournamentMesa.deleteMany({ where: { tournamentId: id, userId } });
  if (removed.count === 0) return Response.json({ error: "Esa mesa no está asignada a este torneo" }, { status: 404 });
  return Response.json({ success: true });
}
