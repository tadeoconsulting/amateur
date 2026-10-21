import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest } from "@/_lib/auth";
import { requireClubManager } from "@/_lib/club-gestion-guard";
import { isMonth, peruMonth } from "@/_lib/club-fees";
import { clubDashboard } from "@/_lib/club-dashboard-server";

// El dashboard del delegado (especificación 015, entrega 4): cobro y asistencia de un mes, con filtro por categoría. Es
// del delegado: el jugador no entra (lo suyo está en /api/me/club-progreso).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireClubManager(id);
  if ("response" in guard) return guard.response;

  const now = new Date();
  const currentMonth = peruMonth(now);
  const mes = request.nextUrl.searchParams.get("mes");
  if (mes !== null && !isMonth(mes)) return badRequest("El mes debe tener la forma AAAA-MM");
  if (mes !== null && mes > currentMonth) return badRequest("Todavía no hay datos de ese mes");

  const categoria = request.nextUrl.searchParams.get("categoria");
  if (categoria) {
    const exists = await prisma.teamCategory.findFirst({ where: { id: categoria, clubId: id }, select: { id: true } });
    if (!exists) return badRequest("La categoría no pertenece a este club");
  }

  return Response.json(await clubDashboard(id, { month: mes ?? currentMonth, categoryId: categoria || null, now }), { headers: { "Cache-Control": "private, no-store" } });
}
