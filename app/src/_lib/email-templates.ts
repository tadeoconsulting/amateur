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

// Colores y tipografías de la plataforma (globals.css): superficie #FAFAFA, tinta y bordes #1B1B1B,
// texto secundario #6D6D6D y el verde de verificación #00CA81. Lexend para títulos y botón, Lato para el
// texto. Las fuentes se piden a Google Fonts (las respetan Apple Mail y otros; Gmail las ignora y usa
// la de respaldo), así que siempre hay una tipografía de sistema detrás.
const HEADING = "Lexend,'Helvetica Neue',Helvetica,Arial,sans-serif";
const BODY = "Lato,'Helvetica Neue',Helvetica,Arial,sans-serif";

/** Marco común: la banda oscura con la marca, la tarjeta con borde y esquinas de 4px, y el botón del diseño. */
function layout({ title, paragraphs, buttonLabel, url, footer }: { title: string; paragraphs: string[]; buttonLabel: string; url: string; footer: string }) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:${BODY};font-size:16px;line-height:24px;color:#1b1b1b">${p}</p>`)
    .join("");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet"></head>
<body style="margin:0;padding:24px 12px;background:#fafafa">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:100%;max-width:480px;background:#ffffff;border:1px solid #1b1b1b;border-radius:4px;border-collapse:separate;overflow:hidden">
<tr><td style="background:#1b1b1b;padding:16px 24px"><span style="font-family:${HEADING};font-size:20px;font-weight:700;letter-spacing:.2px;color:#fafafa">Amateur</span><span style="display:inline-block;width:8px;height:8px;margin-left:6px;border-radius:50%;background:#00ca81"></span></td></tr>
<tr><td style="padding:32px 24px 0"><h1 style="margin:0 0 16px;font-family:${HEADING};font-size:22px;line-height:28px;font-weight:700;color:#1b1b1b">${title}</h1>${body}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0"><tr><td style="background:#1b1b1b;border-radius:4px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 24px;font-family:${HEADING};font-size:14px;line-height:18px;font-weight:700;color:#fafafa;text-decoration:none">${buttonLabel}</a></td></tr></table>
<p style="margin:0 0 8px;font-family:${BODY};font-size:12px;line-height:18px;color:#6d6d6d">Si el botón no funciona, copia este link en tu navegador:<br><a href="${escapeHtml(url)}" style="color:#6d6d6d;word-break:break-all">${escapeHtml(url)}</a></p>
<p style="margin:0 0 32px;font-family:${BODY};font-size:12px;line-height:18px;color:#6d6d6d">${footer}</p></td></tr>
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

/** Un admin invita a una persona a reclamar su perfil de jugador provisional (se acepta en /jugador/invitacion/perfil). */
export function invitacionPerfil(input: { playerName: string; clubName: string; inviterName: string; url: string; days: number }): Contenido {
  const { playerName, clubName, inviterName, url, days } = input;
  const subject = `Reclama tu perfil de jugador en ${clubName} · Amateur`;
  const text = `${inviterName} cargó tu perfil de jugador (${playerName}) en ${clubName} en Amateur.\n\nReclámalo con tu cuenta para ver tus goles y tus partidos (tendrás que confirmar tu DNI; el enlace vale ${days} días):\n${url}\n\nSi no esperabas este correo, puedes ignorarlo.`;
  const html = layout({
    title: `Reclama tu perfil en ${escapeHtml(clubName)}`,
    paragraphs: [
      `<strong>${escapeHtml(inviterName)}</strong> cargó tu perfil de jugador <strong>(${escapeHtml(playerName)})</strong> en <strong>${escapeHtml(clubName)}</strong> en Amateur.`,
      `Reclámalo con tu cuenta para ver tus goles y tus partidos. Te pediremos confirmar tu DNI. El enlace vale ${days} días.`,
    ],
    buttonLabel: "Reclamar mi perfil",
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

/** "Olvidé mi contraseña": el enlace para elegir una nueva (se abre en /restablecer). */
export function restablecerContrasena(input: { url: string; minutes: number }): Contenido {
  const { url, minutes } = input;
  const subject = "Restablece tu contraseña de Amateur";
  const text = `Pediste restablecer tu contraseña de Amateur.\n\nElige una nueva aquí (el enlace vale ${minutes} minutos y se usa una sola vez):\n${url}\n\nSi no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.`;
  const html = layout({
    title: "Restablece tu contraseña",
    paragraphs: ["Pediste restablecer tu contraseña de Amateur.", `El enlace vale ${minutes} minutos y se usa una sola vez.`],
    buttonLabel: "Elegir una contraseña nueva",
    url,
    footer: "Si no fuiste tú, ignora este correo: tu contraseña actual sigue funcionando.",
  });
  return { subject, text, html };
}
