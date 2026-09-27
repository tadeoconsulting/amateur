import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { createMatchViewerToken, isRealtimeConfigured } from "@/_lib/realtime";

/**
 * Token de Ably (solo lectura, restringido a este partido) para que la ficha se suscriba a
 * novedades sin recargar. Público, como el resto de las lecturas de un partido (especificación
 * 001, regla 19).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isRealtimeConfigured()) {
    return Response.json({ error: "Tiempo real no configurado" }, { status: 503 });
  }

  const { id } = await params;
  const exists = await prisma.match.findUnique({ where: { id }, select: { id: true } });
  if (!exists) return Response.json({ error: "Partido no encontrado" }, { status: 404 });

  const tokenRequest = await createMatchViewerToken(id);
  return Response.json(tokenRequest);
}
