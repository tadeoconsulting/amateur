import { prisma } from "./prisma";
import { canManageClub, forbidden, requireUser, type CurrentUser } from "./auth";

/**
 * La puerta de toda ruta de gestión del club (especificación 015): sesión, permiso de delegado (principal, co-delegado o
 * admin) y que el club exista. Los pagos y la asistencia son datos privados de los jugadores: solo se ven desde acá o
 * desde la propia ficha del jugador.
 */
export async function requireClubManager(clubId: string): Promise<{ user: CurrentUser } | { response: Response }> {
  const auth = await requireUser();
  if ("response" in auth) return auth;
  if (!(await canManageClub(auth.user, clubId))) return { response: forbidden() };
  const club = await prisma.club.findUnique({ where: { id: clubId }, select: { id: true } });
  if (!club) return { response: Response.json({ error: "Club no encontrado" }, { status: 404 }) };
  return { user: auth.user };
}
