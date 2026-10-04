import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { forbidden, hashPassword, isAdmin, requireUser } from "@/_lib/auth";
import { generateTempPassword } from "@/_lib/temp-password";

/**
 * Restablece la contraseña de un usuario (dueño de club, jugador u organizador): genera una
 * temporal y la devuelve UNA sola vez, para que el administrador se la entregue. Solo admin.
 *
 * No hay correo (todavía no hay proveedor) ni "olvidé mi contraseña", así que esta es la única
 * forma de recuperar una cuenta. La contraseña anterior deja de servir al instante; una sesión
 * ya abierta sigue vigente hasta que venza (la sesión es un token firmado, sin lista de
 * sesiones que se pueda revocar).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  const password = generateTempPassword();
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });

  // Nunca se registra ni se cachea: es una credencial.
  return Response.json({ password }, { headers: { "Cache-Control": "no-store" } });
}
