import { after } from "next/server";
import { enviarCorreo } from "./email";
import { bienvenida } from "./email-templates";

/**
 * Manda el correo de bienvenida a quien acaba de crear su cuenta (OBS-64). Va en `after`: la respuesta del registro
 * sale primero y el correo después, así que no la demora ni la tumba si el proveedor falla o no está configurado
 * (`enviarCorreo` nunca lanza). Se llama una sola vez, al crear la cuenta; no se reenvía en ningún otro caso.
 */
export function sendWelcomeEmail(user: { email: string; firstName: string; roles: string[] }, origin: string) {
  after(async () => {
    const result = await enviarCorreo({ to: user.email, ...bienvenida({ firstName: user.firstName, roles: user.roles, origin }) });
    if (result === "failed") console.warn("No se pudo enviar el correo de bienvenida; la cuenta se creó igual.");
  });
}
