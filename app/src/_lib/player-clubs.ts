// Un jugador puede estar en varios clubes (una ficha PlayerProfile por club). Reglas puras, sin
// servidor: las usan la API, las pantallas y las pruebas.

export type Membership = { clubId: string | null; createdAt: string | Date };

/**
 * Con qué equipo "sale a la cancha" el jugador: el que eligió (`activeClubId`) si sigue siendo uno de
 * sus equipos; si no (nunca eligió, o ya no está en ese club), el más antiguo. `null` si no tiene
 * ningún equipo. Las fichas "libres" (clubId null) no son equipos.
 */
export function resolveActiveClubId(memberships: Membership[], activeClubId: string | null | undefined): string | null {
  const clubs = memberships
    .filter((m): m is Membership & { clubId: string } => m.clubId !== null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  if (activeClubId && clubs.some((m) => m.clubId === activeClubId)) return activeClubId;
  return clubs[0]?.clubId ?? null;
}
