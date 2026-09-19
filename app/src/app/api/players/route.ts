import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
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

  return Response.json(
    players.map((p) => ({
      id: p.id,
      userId: p.userId,
      number: p.number,
      position: p.position,
      status: p.status,
      user: p.user,
      club: p.club,
      category: p.category,
    }))
  );
}
