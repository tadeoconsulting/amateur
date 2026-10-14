import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { isAdmin, type CurrentUser } from "./auth";

// Quién ve completo el nombre de un menor de 18 (la regla de los menores, especificación 009). Un menor sale abreviado
// ("Luigui F.") para cualquiera que no lo gestione, también para las cuentas con sesión: registrarse es gratis.
// Lo ve completo: un admin, el delegado de su club o quien esté en su cuerpo técnico, el organizador de un torneo en el
// que el club está inscrito, y la mesa asignada a ese torneo. El propio jugador siempre se ve completo (lo resuelve
// quien llama, comparando su cuenta).

/** Hoy como YYYY-MM-DD (lo que pide `isMinorOn`). */
export const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * De estos clubes, ¿en cuáles puede esta cuenta ver completo el nombre de un menor? `"all"` si es un admin.
 */
export async function clubsWithFullNames(user: CurrentUser, clubIds: readonly string[]): Promise<ReadonlySet<string> | "all"> {
  if (isAdmin(user)) return "all";
  const ids = [...new Set(clubIds)];
  if (ids.length === 0) return new Set();

  const clubs = await prisma.club.findMany({
    where: {
      id: { in: ids },
      OR: [
        { ownerId: user.id },
        { staffMembers: { some: { userId: user.id } } },
        { enrollments: { some: { tournament: { organizerId: user.id, deletedAt: null } } } },
        ...(user.roles.includes(Role.MESA) ? [{ enrollments: { some: { tournament: { mesas: { some: { userId: user.id } }, deletedAt: null } } } }] : []),
      ],
    },
    select: { id: true },
  });
  return new Set(clubs.map((c) => c.id));
}

export const canSeeFullIn = (visible: ReadonlySet<string> | "all", clubId: string | null) => visible === "all" || (clubId !== null && visible.has(clubId));
