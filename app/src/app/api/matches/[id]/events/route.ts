import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, canManageMatch, forbidden, readJson, requireUser } from "@/_lib/auth";
import { changesScore, EVENT_TYPES, isEventType, statFor } from "@/_lib/match-live";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const events = await prisma.matchEvent.findMany({
    where: { matchId: id },
    include: {
      player: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
    orderBy: [{ minute: "asc" }, { createdAt: "asc" }],
  });

  return Response.json(
    events.map((e) => ({
      id: e.id,
      type: e.type,
      minute: e.minute,
      playerId: e.playerId,
      playerName: e.player ? `${e.player.user.firstName} ${e.player.user.lastName}` : null,
      teamId: e.teamId,
      detail: e.detail,
      phase: e.phase,
      scored: e.scored,
    }))
  );
}

/**
 * Registra una jugada del partido. Solo se puede mientras el partido está en juego.
 * Un gol suma al marcador y a las estadísticas del jugador; las tarjetas, a las suyas.
 * "penal_definicion" (un intento de la tanda de penales) solo se acepta con el partido en
 * fase "penales", y suma al conteo de penales del equipo (no al marcador) si `scored` es
 * `true`. Todo se guarda junto o no se guarda nada.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!(await canManageMatch(auth.user, id))) return forbidden();

  const body = await readJson(request);
  if (!body) return badRequest();
  const { type, minute, playerId, teamId, detail, scored } = body;

  if (!isEventType(type)) return badRequest(`type debe ser uno de: ${EVENT_TYPES.join(", ")}`);
  if (!Number.isInteger(minute) || (minute as number) < 0 || (minute as number) > 200) {
    return badRequest("minute debe ser un entero entre 0 y 200");
  }
  if (detail !== undefined && detail !== null && (typeof detail !== "string" || detail.length > 200)) {
    return badRequest("detail debe ser un texto de hasta 200 caracteres");
  }
  if (type === "penal_definicion" && typeof scored !== "boolean") {
    return badRequest("Un intento de la tanda de penales necesita scored (true o false)");
  }

  const match = await prisma.match.findUnique({
    where: { id },
    select: { status: true, phase: true, homeTeamId: true, awayTeamId: true, tournamentId: true },
  });
  if (!match) return Response.json({ error: "Partido no encontrado" }, { status: 404 });
  if (match.status !== "en_curso") {
    return Response.json({ error: "El partido no está en juego: inícialo antes de registrar jugadas" }, { status: 409 });
  }
  // Los intentos de la tanda solo se registran en esa fase; el resto de jugadas, en cualquier
  // otra (una vez en penales, el juego ya paró).
  if (type === "penal_definicion" && match.phase !== "penales") {
    return Response.json({ error: "Este partido todavía no está en la tanda de penales" }, { status: 409 });
  }
  if (type !== "penal_definicion" && match.phase === "penales") {
    return Response.json({ error: "El partido está en la tanda de penales" }, { status: 409 });
  }

  // El equipo tiene que ser uno de los dos que juegan; un gol siempre es de alguno.
  if (teamId !== undefined && teamId !== null && teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return badRequest("teamId no juega este partido");
  }
  if ((changesScore(type) || type === "penal_definicion") && teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
    return badRequest("Esta jugada necesita el equipo (teamId)");
  }
  // El jugador tiene que ser del equipo de la jugada, si no se le acreditaría a otro.
  if (playerId !== undefined && playerId !== null) {
    if (typeof playerId !== "string" || typeof teamId !== "string") return badRequest("playerId necesita teamId");
    const player = await prisma.playerProfile.findUnique({ where: { id: playerId }, select: { clubId: true } });
    if (!player || player.clubId !== teamId) return badRequest("El jugador no pertenece a ese equipo");
  }

  try {
    // Un solo bloque: la jugada, el marcador y las estadísticas. Los incrementos son atómicos,
    // así que dos jugadas simultáneas no se pisan.
    const event = await prisma.$transaction(async (tx) => {
      const created = await tx.matchEvent.create({
        data: {
          matchId: id,
          type,
          minute: minute as number,
          playerId: typeof playerId === "string" ? playerId : null,
          teamId: typeof teamId === "string" ? teamId : null,
          detail: typeof detail === "string" ? detail : null,
          phase: match.phase,
          scored: type === "penal_definicion" ? (scored as boolean) : null,
        },
      });

      if (changesScore(type)) {
        const home = teamId === match.homeTeamId;
        // Si el marcador estaba vacío se pone en 0 antes de sumar (NULL + 1 seguiría siendo NULL).
        if (home) {
          await tx.match.updateMany({ where: { id, homeScore: null }, data: { homeScore: 0 } });
          await tx.match.update({ where: { id }, data: { homeScore: { increment: 1 } } });
        } else {
          await tx.match.updateMany({ where: { id, awayScore: null }, data: { awayScore: 0 } });
          await tx.match.update({ where: { id }, data: { awayScore: { increment: 1 } } });
        }
      } else if (type === "penal_definicion") {
        const home = teamId === match.homeTeamId;
        const field = home ? "penaltyHomeScore" : "penaltyAwayScore";
        // El conteo pasa a 0 en cuanto hay un primer intento (aunque sea errado): "null" se
        // vería como "todavía no pateó nadie", no como "0 convertidos".
        await tx.match.updateMany({ where: { id, [field]: null }, data: { [field]: 0 } });
        if (scored === true) await tx.match.update({ where: { id }, data: { [field]: { increment: 1 } } });
      }

      const stat = statFor(type);
      if (stat && typeof playerId === "string") {
        await tx.playerStats.upsert({
          where: { playerId_tournamentId: { playerId, tournamentId: match.tournamentId } },
          update: { [stat]: { increment: 1 } },
          create: { playerId, tournamentId: match.tournamentId, [stat]: 1 },
        });
      }
      return created;
    });

    return Response.json(event, { status: 201 });
  } catch (error) {
    console.error("Create event error:", error);
    return Response.json({ error: "Error al registrar evento" }, { status: 500 });
  }
}
