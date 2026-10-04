import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, hashPassword, readJson, requireUser, validatePassword, verifyPassword } from "@/_lib/auth";

/**
 * Cambia la contraseña de quien tiene la sesión abierta. Pide la actual (una sesión robada o
 * olvidada en un teléfono ajeno no alcanza para quedarse con la cuenta) y valida la nueva con
 * las mismas reglas que el registro. Cuerpo: { currentPassword, newPassword }.
 *
 * Es también la salida de una contraseña temporal que dio un admin (ver
 * api/users/[id]/reset-password).
 */
export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const body = await readJson(request);
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) return badRequest("Ingresa tu contraseña actual y la nueva");

  const invalid = validatePassword(newPassword);
  if (invalid) return badRequest(invalid);
  if (newPassword === currentPassword) return badRequest("La nueva contraseña debe ser distinta de la actual");

  const user = await prisma.user.findUnique({ where: { id: auth.user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(currentPassword, user?.passwordHash))) {
    return badRequest("La contraseña actual no es correcta");
  }

  await prisma.user.update({ where: { id: auth.user.id }, data: { passwordHash: await hashPassword(newPassword) } });
  return Response.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
