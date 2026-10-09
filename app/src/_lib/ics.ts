// Calendario (.ics, RFC 5545) de los partidos de un torneo. Pura y sin dependencias, para probarla aparte.
//
// Los partidos guardan el día (medianoche UTC) y la hora de reloj de la cancha, sin zona; por eso los
// eventos van con hora "flotante" (sin zona ni Z): cada calendario los muestra a la hora de la cancha, en
// la zona de quien los agrega.

export type IcsEvent = {
  uid: string;
  summary: string;
  location?: string;
  description?: string;
  url?: string;
  /** El día del partido, ISO ("2026-10-10T00:00:00.000Z"). */
  date: string;
  /** La hora de reloj, "09:30". */
  time: string;
  durationMinutes: number;
};

/** Escapa el texto de un valor: barra, punto y coma, coma y saltos de línea (RFC 5545 §3.3.11). */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Parte una línea en trozos de hasta 75 bytes; los siguientes empiezan con un espacio (RFC 5545 §3.1). */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74; // el espacio inicial de las continuaciones cuenta
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "20261010T093000" a partir de una fecha armada en UTC (se usa solo como calculadora de reloj). */
function floating(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}

function stamp(d: Date): string {
  return `${floating(d)}Z`;
}

/** Inicio y fin flotantes de un partido. El fin puede caer al día siguiente. */
export function eventTimes(event: Pick<IcsEvent, "date" | "time" | "durationMinutes">): { start: string; end: string } {
  const [h, m] = event.time.split(":").map(Number);
  const startMs = Date.UTC(Number(event.date.slice(0, 4)), Number(event.date.slice(5, 7)) - 1, Number(event.date.slice(8, 10)), h, m);
  return { start: floating(new Date(startMs)), end: floating(new Date(startMs + event.durationMinutes * 60_000)) };
}

export function buildIcs({ name, events, now = new Date() }: { name: string; events: IcsEvent[]; now?: Date }): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Amateur//Fixture//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${escapeIcsText(name)}`];
  for (const e of events) {
    const { start, end } = eventTimes(e);
    lines.push("BEGIN:VEVENT", `UID:${e.uid}`, `DTSTAMP:${stamp(now)}`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${escapeIcsText(e.summary)}`);
    if (e.location) lines.push(`LOCATION:${escapeIcsText(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
