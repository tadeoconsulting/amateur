import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { requireRole } from "@/_lib/auth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; sponsorId: string }> }
) {
  const auth = await requireRole();
  if ("response" in auth) return auth.response;

  const { id, sponsorId } = await params;
  try {
    await prisma.tournamentSponsor.delete({
      where: { tournamentId_sponsorId: { tournamentId: id, sponsorId } },
    });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Ese sponsor no estaba en este torneo" }, { status: 404 });
  }
}
