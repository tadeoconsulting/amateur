import { prisma } from "@/_lib/prisma";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Por qué no se puede eliminar una cuenta (null si se puede). Quien es dueño de equipos o
 * organiza torneos no se borra a ciegas: esos datos son de otros (jugadores, equipos inscritos)
 * y hay que decidir antes qué pasa con ellos.
 */
export async function userDeletionBlocker(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: { select: { role: true } },
      _count: { select: { ownedClubs: true, tournaments: true } },
    },
  });
  if (!user) return "Usuario no encontrado";
  if (user.roles.some((r) => r.role === "ADMIN")) return "Una cuenta de administrador no se elimina desde aquí";
  const { ownedClubs, tournaments } = user._count;
  if (ownedClubs > 0 || tournaments > 0) {
    const owns = [
      ownedClubs > 0 && `dirige ${plural(ownedClubs, "equipo", "equipos")}`,
      tournaments > 0 && `organiza ${plural(tournaments, "torneo", "torneos")}`,
    ].filter(Boolean);
    return `Esta cuenta ${owns.join(" y ")}: elimínalos primero (o pásalos a otra cuenta) y luego vuelve a intentarlo`;
  }
  return null;
}

/**
 * Elimina la cuenta con todo lo que es suyo: sus fichas de jugador (con sus estadísticas y
 * alineaciones; en las jugadas del partido queda el registro sin jugador), su pertenencia a
 * staff, las invitaciones y solicitudes que creó, sus roles y sus pedidos de unirse a equipos.
 * Quien llama debe haber comprobado antes `userDeletionBlocker`.
 */
export async function deleteUserAccount(userId: string) {
  await prisma.$transaction([
    prisma.playerProfile.deleteMany({ where: { userId } }),
    prisma.staffMember.deleteMany({ where: { userId } }),
    prisma.playerInvitation.deleteMany({ where: { invitedBy: userId } }),
    prisma.staffInvitation.deleteMany({ where: { invitedBy: userId } }),
    prisma.tournamentRequest.deleteMany({ where: { createdById: userId } }),
    prisma.user.delete({ where: { id: userId } }),
  ]);
}
