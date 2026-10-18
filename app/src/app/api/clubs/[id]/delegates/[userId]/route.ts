import { type NextRequest } from "next/server";
import { prisma } from "@/_lib/prisma";
import { isAdmin, requireUser } from "@/_lib/auth";
import { canDo } from "@/_lib/club-delegate";
import { clubRoleFor } from "@/_lib/club-delegate-server";

/**
 * Quita a un co-delegado (especificación 014). Lo hace el delegado principal o un admin; un co-delegado puede quitarse
 * a sí mismo para salir del equipo. Al irse conserva su perfil de delegado, pero ya no gestiona ningún equipo. No se
 * puede quitar al principal por acá: un club no cambia de dueño sin un admin.
 */
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { id, userId } = await params;

  const delegate = await prisma.clubDelegate.findUnique({ where: { userId }, select: { id: true, clubId: true } });
  if (!delegate || delegate.clubId !== id) {
    return Response.json({ error: "Esa persona no es co-delegada de este equipo" }, { status: 404 });
  }

  const leaving = userId === auth.user.id;
  const role = await clubRoleFor(auth.user.id, isAdmin(auth.user), id);
  if (!leaving && !canDo(role, "manage_delegates")) {
    return Response.json({ error: "No tienes permiso para esta acción" }, { status: 403 });
  }

  await prisma.clubDelegate.delete({ where: { id: delegate.id } });
  return Response.json({ success: true });
}
