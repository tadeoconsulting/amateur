import { requireUser } from "@/_lib/auth";
import { playerClubProgress } from "@/_lib/player-club-progress-server";

// Lo que el jugador ve de su club (especificación 015, entrega 3): sus entrenamientos, su asistencia y sus pagos.
// No recibe ningún id: siempre es la ficha de quien tiene la sesión, así nadie puede pedir lo de otro jugador. Una persona
// sin club recibe una lista vacía.
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const clubs = await playerClubProgress(auth.user.id);
  // Privado: que ningún caché compartido lo guarde.
  return Response.json({ clubs }, { headers: { "Cache-Control": "private, no-store" } });
}
