import { Prisma } from "@prisma/client";
import { prisma } from "@/_lib/prisma";
import { OPEN_STATUSES } from "@/_lib/tournament-labels";

/** Un rechazo de negocio (torneo cerrado, sin cupo...) con el código HTTP que le toca. */
export class EnrollmentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Tx = Prisma.TransactionClient;

/**
 * Corre `fn` con el torneo **bloqueado** (`FOR UPDATE`) y ya verificado como abierto y con cupo.
 *
 * El bloqueo serializa las inscripciones de un mismo torneo: sin él, dos inscripciones
 * simultáneas leen "queda 1 cupo" y las dos entran. Todo lo que `fn` escriba va en la
 * misma transacción, así que un error no deja nada a medias.
 */
export async function withOpenTournament<T>(tournamentId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Tournament" WHERE id = ${tournamentId} FOR UPDATE`;
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      select: { status: true, maxTeams: true, _count: { select: { teams: true } } },
    });
    if (!tournament) throw new EnrollmentError(404, "Torneo no encontrado");
    if (!OPEN_STATUSES.includes(tournament.status)) {
      throw new EnrollmentError(409, "El torneo ya empezó: no se pueden agregar equipos");
    }
    if (tournament._count.teams >= tournament.maxTeams) {
      throw new EnrollmentError(409, "El torneo ya tiene todos sus equipos");
    }
    return fn(tx);
  });
}

/** ¿Fue una violación de unicidad de Prisma? (el equipo ya estaba inscrito) */
export function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}
