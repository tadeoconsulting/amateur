import { type NextRequest } from "next/server";
import { badRequest, forbidden, isAdmin, readJson, requireUser } from "@/_lib/auth";
import { executeLink, linkMoves, loadLinkContext } from "@/_lib/provisional-link-server";

/**
 * Asigna una cuenta a un jugador provisional (especificación 009, entrega 2). Solo un admin.
 *
 * Con `dryRun: true` solo calcula y devuelve lo que pasaría —si se vincula o se unen los perfiles, qué se
 * mueve y los avisos— sin escribir nada: el panel lo muestra y pide confirmar. Sin `dryRun` lo hace, en una
 * sola transacción (todo o nada). Ver `planLink` para las reglas y `executeLink` para lo que se mueve.
 *
 * - **vincular:** el perfil provisional pasa a ser la ficha de la cuenta (mismo perfil: no se pierde nada).
 * - **unir:** si la cuenta ya tiene ficha en ese equipo (o una sin equipo), las jugadas, alineaciones y
 *   estadísticas del provisional pasan a esa ficha (los goles del mismo torneo se suman) y el provisional se elimina.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const body = await readJson(request);
  if (!body || typeof body.userId !== "string" || !body.userId) return badRequest("userId requerido");

  const ctx = await loadLinkContext(id, body.userId);
  if (!ctx.ok) return Response.json({ error: ctx.error }, { status: ctx.status });
  const { prov, user, plan } = ctx;

  if (body.dryRun === true) {
    return Response.json({
      mode: plan.mode,
      // La ficha de la cuenta no tenía equipo y pasa a ser la de este (ver planLink).
      fromFree: plan.mode === "merge" && plan.profileFill.clubId !== undefined,
      club: prov.club?.name ?? null,
      account: { name: `${user.firstName} ${user.lastName}`, email: user.email },
      moves: await linkMoves(id),
      warnings: plan.warnings,
      grantPlayerRole: plan.grantPlayerRole,
    });
  }

  try {
    const profileId = await executeLink(ctx);
    return Response.json({ mode: plan.mode, profileId });
  } catch (error) {
    console.error("Link provisional error:", error);
    return Response.json({ error: "No se pudo asignar la cuenta" }, { status: 500 });
  }
}
