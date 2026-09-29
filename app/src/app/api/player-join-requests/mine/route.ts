import { prisma } from "@/_lib/prisma";
import { requireUser } from "@/_lib/auth";

/**
 * Solicitudes **pendientes** de quien tiene la sesión para unirse a un club — llena el estado
 * "esperando respuesta" en "Buscar equipos" y permite cancelarlas.
 */
export async function GET() {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const rows = await prisma.playerJoinRequest.findMany({
    where: { userId: auth.user.id, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      club: { select: { id: true, name: true, shortName: true, color: true, logoUrl: true } },
    },
  });
  return Response.json(rows);
}
