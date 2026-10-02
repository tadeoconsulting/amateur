// Qué campos de un club se pueden devolver por la API. `Club.inviteToken` es un secreto —
// quien tenga el link se une al club como jugador sin invitación (ver invite.ts) — así que
// nunca debe salir en una respuesta que no sea la del propio link de invitación
// (api/clubs/[id]/invite-link). Un `include: { club: true }` (o `homeTeam: true`) lo arrastra
// sin que se note; por eso las respuestas pasan por estos `select`.

/** El equipo tal como aparece en un partido (MatchTeamRef). */
export const CLUB_REF_SELECT = { id: true, name: true, shortName: true, logoUrl: true, color: true } as const;

/** El club de una inscripción a un torneo. */
export const CLUB_ENROLLED_SELECT = {
  ...CLUB_REF_SELECT,
  isTemporary: true,
  delegadoNombre: true,
} as const;

/** Para un club que ya se leyó entero: lo devuelve sin su link secreto. */
export function omitInviteToken<T extends { inviteToken?: string | null }>(club: T): Omit<T, "inviteToken"> {
  const rest = { ...club };
  delete rest.inviteToken;
  return rest;
}
