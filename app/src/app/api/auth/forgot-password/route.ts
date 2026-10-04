import { prisma } from "@/_lib/prisma";
import { after, type NextRequest } from "next/server";
import { badRequest, normalizeEmail, readJson } from "@/_lib/auth";
import { enviarCorreo } from "@/_lib/email";
import { restablecerContrasena } from "@/_lib/email-templates";
import { inCooldown, newResetToken, resetExpiry, RESET_TOKEN_MINUTES } from "@/_lib/password-reset";

/**
 * "Olvidé mi contraseña": manda por correo un enlace de un solo uso (vale una hora) para elegir
 * una nueva. Cuerpo: { email }.
 *
 * La respuesta es SIEMPRE la misma — exista o no la cuenta, y tarde lo que tarde el correo — para
 * que esto no sirva para averiguar qué correos están registrados. Por eso el trabajo va en
 * `after`: la respuesta sale primero y no revela, por el tiempo que tarda, si hubo cuenta.
 */
export async function POST(request: NextRequest) {
  const body = await readJson(request);
  const email = normalizeEmail(body?.email);
  if (!email) return badRequest("Ingresa un correo válido");

  const origin = request.nextUrl.origin;
  after(async () => {
    try {
      const user = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true },
      });
      if (!user) return;

      const last = await prisma.passwordResetToken.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });
      if (inCooldown(last?.createdAt)) return;

      // Un solo enlace vigente por persona: el nuevo anula los anteriores.
      const { token, tokenHash } = newResetToken();
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
        prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: resetExpiry() } }),
      ]);

      const result = await enviarCorreo({
        to: email,
        ...restablecerContrasena({ url: `${origin}/restablecer?token=${token}`, minutes: RESET_TOKEN_MINUTES }),
      });
      if (result === "skipped") console.warn("Olvidé mi contraseña: no hay proveedor de correo configurado, no se envió nada.");
    } catch (error) {
      console.error("Error en olvidé mi contraseña:", error instanceof Error ? error.message : error);
    }
  });

  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
