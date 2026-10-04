// Los correos de Amateur. Funciones puras (sin servidor): devuelven asunto, texto y HTML.
// Todo lo que escribe una persona (nombre del club, de quien invita) se escapa en el HTML.

type Contenido = { subject: string; text: string; html: string };

/** Cómo se nombra cada rol de staff dentro de una frase ("te invitó como director técnico"). */
export const STAFF_ROLE_LABELS: Record<string, string> = {
  delegado: "delegado",
  asistente: "asistente técnico",
  director_tecnico: "director técnico",
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Marco común: una tarjeta sobria con el nombre de la app y un botón. */
function layout({ title, paragraphs, buttonLabel, url, footer }: { title: string; paragraphs: string[]; buttonLabel: string; url: string; footer: string }) {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:22px;color:#1b1b1b">${p}</p>`).join("");
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#fafafa;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #1b1b1b;border-radius:8px">
<tr><td style="padding:24px 24px 8px;font-size:18px;font-weight:700;color:#1b1b1b">Amateur</td></tr>
<tr><td style="padding:8px 24px 0"><h1 style="margin:0 0 16px;font-size:20px;line-height:26px;color:#1b1b1b">${title}</h1>${body}
<p style="margin:24px 0"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1b1b1b;color:#fafafa;text-decoration:none;font-weight:700;font-size:15px;padding:12px 20px;border-radius:8px">${buttonLabel}</a></p>
<p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#6d6d6d">Si el botón no funciona, copia este link en tu navegador:<br><a href="${escapeHtml(url)}" style="color:#6d6d6d;word-break:break-all">${escapeHtml(url)}</a></p>
<p style="margin:0 0 24px;font-size:12px;line-height:18px;color:#6d6d6d">${footer}</p></td></tr>
</table></td></tr></table></body></html>`;
}

/** Un club invita a un jugador a unirse (se acepta en /jugador/invitacion). */
export function invitacionJugador(input: { clubName: string; inviterName: string; url: string; days: number }): Contenido {
  const { clubName, inviterName, url, days } = input;
  const subject = `${clubName} te invitó a su equipo en Amateur`;
  const text = `${inviterName} te invitó a unirte a ${clubName} en Amateur.\n\nAcepta la invitación aquí (vale ${days} días):\n${url}\n\nSi no esperabas este correo, puedes ignorarlo.`;
  const html = layout({
    title: `${escapeHtml(clubName)} te invitó a su equipo`,
    paragraphs: [`<strong>${escapeHtml(inviterName)}</strong> te invitó a unirte a <strong>${escapeHtml(clubName)}</strong> en Amateur: tu perfil de jugador, tus goles y tus partidos en un solo lugar.`, `La invitación vale ${days} días.`],
    buttonLabel: "Ver la invitación",
    url,
    footer: "Si no esperabas este correo, puedes ignorarlo.",
  });
  return { subject, text, html };
}

/** Un club invita a alguien a su cuerpo técnico (se acepta en /staff/invitacion). */
export function invitacionStaff(input: { clubName: string; inviterName: string; roleLabel: string; url: string; days: number }): Contenido {
  const { clubName, inviterName, roleLabel, url, days } = input;
  const subject = `${clubName} te invitó como ${roleLabel} en Amateur`;
  const text = `${inviterName} te invitó como ${roleLabel} de ${clubName} en Amateur.\n\nCrea tu cuenta o inicia sesión para aceptar (vale ${days} días):\n${url}\n\nSi no esperabas este correo, puedes ignorarlo.`;
  const html = layout({
    title: `${escapeHtml(clubName)} te invitó como ${escapeHtml(roleLabel)}`,
    paragraphs: [`<strong>${escapeHtml(inviterName)}</strong> te invitó como <strong>${escapeHtml(roleLabel)}</strong> de <strong>${escapeHtml(clubName)}</strong> en Amateur.`, `Crea tu cuenta o inicia sesión para aceptar. La invitación vale ${days} días.`],
    buttonLabel: "Aceptar la invitación",
    url,
    footer: "Si no esperabas este correo, puedes ignorarlo.",
  });
  return { subject, text, html };
}
