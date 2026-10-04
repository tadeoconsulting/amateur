// Envío de correos. Igual que `realtime.ts`: el resto del código llama a `enviarCorreo` sin saber
// qué hay detrás (hoy Resend, por su API HTTP — sin paquete que instalar), y sin las variables
// configuradas (desarrollo, pruebas) todo sigue funcionando: solo no sale ningún correo.
//
//   RESEND_API_KEY  la clave de la cuenta de Resend (Vercel › Settings › Environment Variables)
//   EMAIL_FROM      remitente de un dominio verificado en Resend, p. ej. "Amateur <no-reply@mail.ejemplo.com>"

export type Correo = { to: string; subject: string; text: string; html: string };

/** "sent": lo aceptó el proveedor · "skipped": no está configurado · "failed": el proveedor lo rechazó o no respondió. */
export type ResultadoCorreo = "sent" | "skipped" | "failed";

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Manda un correo. Nunca lanza: un correo que no sale no debe tumbar una request que ya guardó
 * el cambio en la base (la invitación existe igual y se puede compartir el link a mano).
 * No registra la clave ni el contenido, solo el motivo del fallo.
 */
export async function enviarCorreo(correo: Correo): Promise<ResultadoCorreo> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return "skipped";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [correo.to], subject: correo.subject, text: correo.text, html: correo.html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      console.error(`No se pudo enviar el correo (Resend ${res.status}):`, detail?.message ?? "sin detalle");
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.error("No se pudo enviar el correo:", error instanceof Error ? error.message : error);
    return "failed";
  }
}
