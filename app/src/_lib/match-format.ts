// Formato de fechas y horas de partidos para la UI.
//
// Los partidos guardan el día como fecha a medianoche UTC ("2026-10-03T00:00:00Z") y la
// hora como texto de 24 horas ("18:30"): es la hora de reloj de la cancha, sin zona.

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const UNSCHEDULED_LABEL = "Por definir";

/** "2026-10-03T00:00:00.000Z" → "Sáb 3 Oct" */
export function formatMatchDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

/** "Sáb 3 Oct · 06:30 pm", o "Por definir" si el partido todavía no tiene día y hora. */
export function formatWhen(match: { date: string; time: string }) {
  return match.time === "" ? UNSCHEDULED_LABEL : `${formatMatchDate(match.date)} · ${formatTime12(match.time)}`;
}

/** Solo el día ("Sáb 3 Oct"), o "Por definir". */
export function formatWhenDate(match: { date: string; time: string }) {
  return match.time === "" ? UNSCHEDULED_LABEL : formatMatchDate(match.date);
}

/** Para dentro de una frase: "Sáb 3 Oct a las 06:30 pm", o "fecha y hora por definir". */
export function formatWhenSentence(match: { date: string; time: string }) {
  return match.time === "" ? "fecha y hora por definir" : `${formatMatchDate(match.date)} a las ${formatTime12(match.time)}`;
}

/** "18:30" → "06:30 pm" */
export function formatTime12(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h12).padStart(2, "0")}:${m} ${hour >= 12 ? "pm" : "am"}`;
}

/** "6:30 pm" o "06:30 am" (lo que devuelve el selector de hora) → "18:30". null si no se entiende. */
export function to24h(time12: string): string | null {
  const match = time12.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const pm = match[3].toLowerCase() === "pm";
  if (hour < 1 || hour > 12) return null;
  if (pm && hour !== 12) hour += 12;
  if (!pm && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

/** "18:30" → "6:30 pm", el formato de texto de los selectores de hora. */
export function to12h(time24: string) {
  const [h, m] = time24.split(":");
  const hour = parseInt(h, 10);
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${m} ${hour >= 12 ? "pm" : "am"}`;
}

/** Date local → "YYYY-MM-DD" con el día que ve la persona (sin pasar por UTC). */
export function toYmd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "YYYY-MM-DD" → Date local a mediodía (evita saltos de día por zona horaria). */
export function fromYmd(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(d: Date, days: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 12);
}
