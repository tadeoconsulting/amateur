import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { isAdmin, requireUser } from "@/_lib/auth";

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const search = request.nextUrl.searchParams.get("search");
  const clubId = request.nextUrl.searchParams.get("clubId");
  const status = request.nextUrl.searchParams.get("status");

  const where: Record<string, unknown> = {};

  if (search) {
    where.user = {
      OR: [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
      ],
    };
  }

  if (clubId) where.clubId = clubId;
  if (status) where.status = status;

  const players = await prisma.playerProfile.findMany({
    where,
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          phone: true,
        },
      },
      club: { select: { id: true, name: true, shortName: true } },
      category: { select: { id: true, name: true, gender: true } },
    },
    orderBy: { user: { firstName: "asc" } },
  });

  // Correo y teléfono de los jugadores: solo para admins.
  const showContact = isAdmin(auth.user);

  return Response.json(
    players.map((p) => ({
      id: p.id,
      userId: p.userId,
      number: p.number,
      position: p.position,
      status: p.status,
      user: showContact ? p.user : { ...p.user, email: null, phone: null },
      club: p.club,
      category: p.category,
    }))
  );
}
