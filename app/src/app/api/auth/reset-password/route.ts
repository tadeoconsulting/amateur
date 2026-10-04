import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, hashPassword, readJson, validatePassword } from "@/_lib/auth";
import { hashResetToken } from "@/_lib/password-reset";

const INVALID = "El enlace no es válido o ya venció. Pide uno nuevo.";

/**
 * Elige la contraseña nueva con el enlace de "Olvidé mi contraseña". Cuerpo: { token, newPassword }.
 * El enlace se usa una sola vez: se "reclama" de forma atómica (dos pedidos a la vez no pasan los dos)
 * y al terminar se borran los demás enlaces de esa cuenta.
 */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const token = typeof body?.token === "string" ? body.token : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!token) return badRequest(INVALID);
  const invalid = validatePassword(newPassword);
  if (invalid) return badRequest(invalid);

  const tokenHash = hashResetToken(token);
  const passwordHash = await hashPassword(newPassword);
  const now = new Date();

  const userId = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count === 0) return null;
    const row = await tx.passwordResetToken.findUnique({ where: { tokenHash }, select: { userId: true } });
    if (!row) return null;
    await tx.user.update({ where: { id: row.userId }, data: { passwordHash } });
    await tx.passwordResetToken.deleteMany({ where: { userId: row.userId } });
    return row.userId;
  });

  if (!userId) return badRequest(INVALID);
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
