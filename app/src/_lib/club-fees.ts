// Cuotas mensuales de un club (especificación 015). Lógica pura y sin dependencias: la usan las rutas de la API, las
// pantallas y las pruebas.
//
// Todos los importes se manejan en CÉNTIMOS enteros (S/ 80,50 = 8050) para no arrastrar errores de coma flotante; solo
// la base de datos y la API hablan en soles.
//
// Los meses son meses calendario en hora de Perú (UTC-5, sin horario de verano), como "2026-10".

/** Perú está en UTC-5 todo el año. */
const PERU_OFFSET_HOURS = -5;

/** El tope de una cuota, en soles: evita errores de tipeo (S/ 8000 en vez de S/ 80). */
export const MAX_FEE_SOLES = 10000;

/** El día de vencimiento que se le da a un club que no eligió uno. */
export const DEFAULT_DUE_DAY = 5;

export type FeeStatus = "sin_cuota" | "pagado" | "parcial" | "pendiente";

const pad = (n: number) => String(n).padStart(2, "0");

/** La fecha de hoy en Perú, como AAAA-MM-DD. */
export function peruDate(now: Date): string {
  const shifted = new Date(now.getTime() + PERU_OFFSET_HOURS * 3600_000);
  return shifted.toISOString().slice(0, 10);
}

/** El mes de hoy en Perú, como AAAA-MM. */
export function peruMonth(now: Date): string {
  return peruDate(now).slice(0, 7);
}

/** ¿Es un mes AAAA-MM que existe? */
export function isMonth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

/** El mes siguiente a uno dado. */
export function nextMonth(month: string): string {
  const year = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7));
  return m === 12 ? `${year + 1}-01` : `${year}-${pad(m + 1)}`;
}

/** Los meses desde `from` hasta `to`, ambos incluidos. Vacío si `from` es posterior a `to`. */
export function monthsBetween(from: string, to: string): string[] {
  const months: string[] = [];
  for (let m = from; m <= to; m = nextMonth(m)) {
    months.push(m);
    if (months.length > 240) break; // 20 años: un tope por si algo llega mal
  }
  return months;
}

/**
 * Un importe en soles ("80", "80.5", 80.5) a céntimos. `null` si no es un importe válido: no negativo, con a lo más dos
 * decimales y sin pasar de `MAX_FEE_SOLES`.
 */
export function parseCents(value: unknown): number | null {
  let text: string;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    text = String(value);
  } else if (typeof value === "string") {
    text = value.trim().replace(",", ".");
  } else {
    return null;
  }
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const cents = Math.round(Number(text) * 100);
  return cents > MAX_FEE_SOLES * 100 ? null : cents;
}

/** Céntimos a soles, para la API (8050 → 80.5). */
export const centsToSoles = (cents: number) => cents / 100;

/** Céntimos a texto para mostrar ("S/ 80" o "S/ 80,50"). */
export function formatSoles(cents: number): string {
  const soles = Math.floor(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? `S/ ${soles}` : `S/ ${soles},${pad(rest)}`;
}

/** ¿Es un día de vencimiento válido? Del 1 al 28, para que exista en todos los meses. */
export const isDueDay = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 28;

/** Lo que paga un jugador por mes: su monto propio si tiene uno (0 incluido) y, si no, la cuota estándar del club. */
export function effectiveFeeCents(clubFeeCents: number, overrideCents: number | null): number {
  return overrideCents ?? clubFeeCents;
}

/**
 * ¿Hay algo que cobrarle? Con la cuota del club en 0 y sin monto propio, todavía no se definió ninguna cuota: no se
 * generan meses (si se generaran en 0, quedarían congelados en 0 cuando el delegado defina la cuota después).
 */
export function hasFeeDefined(clubFeeCents: number, overrideCents: number | null): boolean {
  return overrideCents !== null || clubFeeCents > 0;
}

/** Los meses que faltan por generar: desde su primer mes de cobro hasta el actual, menos los que ya existen. */
export function monthsToGenerate(startMonth: string, currentMonth: string, existing: readonly string[]): string[] {
  const have = new Set(existing);
  return monthsBetween(startMonth, currentMonth).filter((m) => !have.has(m));
}

export type FeePaymentLike = { amountCents: number; voided: boolean };

/** Lo abonado a un mes: los abonos anulados no cuentan. */
export function paidCents(payments: readonly FeePaymentLike[]): number {
  return payments.reduce((sum, p) => (p.voided ? sum : sum + p.amountCents), 0);
}

/** Cuánto falta para completar un mes (nunca negativo). */
export const balanceCents = (dueCents: number, paid: number) => Math.max(0, dueCents - paid);

/** El estado de un mes. Sin cuota (0) manda sobre todo; con cuota, pagado cuando lo abonado la cubre. */
export function feeStatus(dueCents: number, paid: number): FeeStatus {
  if (dueCents === 0) return "sin_cuota";
  if (paid >= dueCents) return "pagado";
  return paid > 0 ? "parcial" : "pendiente";
}

/**
 * ¿Está vencido? Un mes con saldo vence después de su día de vencimiento: con el día 5, octubre está vencido desde el 6
 * de octubre. Un mes pagado o sin cuota no vence nunca.
 */
export function isOverdue(month: string, dueDay: number, status: FeeStatus, today: string): boolean {
  if (status === "pagado" || status === "sin_cuota") return false;
  return today > `${month}-${pad(dueDay)}`;
}

export type FeeMonth = {
  month: string;
  dueCents: number;
  paidCents: number;
};

/** Lo que debe un jugador: todo el saldo de sus meses generados, y de eso, lo ya vencido. */
export function debtSummary(months: readonly FeeMonth[], dueDay: number, today: string) {
  let owedCents = 0;
  let overdueCents = 0;
  let overdueMonths = 0;
  for (const m of months) {
    const status = feeStatus(m.dueCents, m.paidCents);
    const balance = balanceCents(m.dueCents, m.paidCents);
    owedCents += balance;
    if (isOverdue(m.month, dueDay, status, today)) {
      overdueCents += balance;
      overdueMonths += 1;
    }
  }
  return { owedCents, overdueCents, overdueMonths };
}

/**
 * Lo que se pudo cobrar de un mes, para ver cuánto se recaudó contra cuánto se esperaba. Lo abonado de más no suma
 * (no hay saldo a favor), y un porcentaje de 0 esperado se trata como 100 (no hay nada que cobrar).
 */
export function collectionSummary(months: readonly FeeMonth[]) {
  let expectedCents = 0;
  let collectedCents = 0;
  for (const m of months) {
    expectedCents += m.dueCents;
    collectedCents += Math.min(m.paidCents, m.dueCents);
  }
  const percent = expectedCents === 0 ? 100 : Math.round((collectedCents / expectedCents) * 100);
  return { expectedCents, collectedCents, percent };
}

/** Valida un abono nuevo contra el saldo del mes. Devuelve el mensaje de error o null si está bien. */
export function paymentError(amountCents: number | null, balance: number): string | null {
  if (amountCents === null || amountCents <= 0) return "Escribe un monto mayor a 0";
  if (amountCents > balance) return `El monto no puede superar lo que falta (${formatSoles(balance)})`;
  return null;
}

/** Un importe en soles que llega de la API (80, 80.5) como texto para mostrar. */
export const formatSolesAmount = (soles: number) => formatSoles(Math.round(soles * 100));

const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-10" → "Octubre 2026". */
export function monthLabel(month: string): string {
  const name = MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${month.slice(0, 4)}`;
}

/** "2026-10" → "octubre", para frases como "la cuota de octubre". */
export const monthName = (month: string) => MONTH_NAMES[Number(month.slice(5, 7)) - 1] ?? month;
