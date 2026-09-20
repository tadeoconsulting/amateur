import { prisma } from "@/_lib/prisma";
import { getCurrentUser, unauthorized } from "@/_lib/auth";

// Invitaciones pendientes dirigidas al correo de la persona con sesión ("Mis invitaciones").
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const invitations = await prisma.playerInvitation.findMany({
    where: { email: { equals: user.email, mode: "insensitive" }, status: "pending", expiresAt: { gt: new Date() } },
    include: {
      club: { select: { id: true, name: true, shortName: true, color: true, logoUrl: true } },
      inviter: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(
    invitations.map((i) => ({
      token: i.token,
      expiresAt: i.expiresAt,
      club: i.club,
      invitedBy: `${i.inviter.firstName} ${i.inviter.lastName}`.trim(),
    })),
    { headers: { "Cache-Control": "no-store" } }
  );
}
