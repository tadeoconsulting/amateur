import { prisma } from "@/_lib/prisma";
import { type NextRequest } from "next/server";
import { badRequest, forbidden, hashPassword, isAdmin, readJson, requireUser, validatePassword } from "@/_lib/auth";
import { generateTempPassword } from "@/_lib/temp-password";

/**
 * Restablece la contraseña de un usuario (dueño de club, jugador u organizador). Solo admin.
 *
 * Cuerpo opcional: { password }. Con `password` el admin ELIGE la nueva (se valida como cualquier
 * contraseña: 8 a 72 caracteres) y no se devuelve: ya la conoce. Sin `password` se genera una
 * temporal y se devuelve UNA sola vez, para que el administrador se la entregue.
 *
 * Con "olvidé mi contraseña" (correo) esto ya no es la única forma de recuperar una cuenta, pero
 * sigue siendo la del admin cuando la persona no puede usar el correo. La contraseña anterior deja
 * de servir al instante; una sesión ya abierta sigue vigente hasta que venza (la sesión es un
 * token firmado, sin lista de sesiones que se pueda revocar).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  if (!isAdmin(auth.user)) return forbidden();

  const { id } = await params;
  const body = (await readJson(request)) ?? {};

  let chosen: string | null = null;
  if (body.password !== undefined && body.password !== null && body.password !== "") {
    const invalid = validatePassword(body.password);
    if (invalid) return badRequest(invalid);
    chosen = body.password as string;
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  const password = chosen ?? generateTempPassword();
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(password) } });

  // Nunca se registra ni se cachea: es una credencial. La elegida no se devuelve.
  return Response.json(chosen ? { success: true, generated: false } : { success: true, generated: true, password }, {
    headers: { "Cache-Control": "no-store" },
  });
}
