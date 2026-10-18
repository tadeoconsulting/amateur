"use client";

import type { FeeStatus } from "./club-fees";

// Lo que las pantallas de Pagos (especificación 015) piden y reciben de /api/clubs/:id/gestion. Los importes viajan en
// soles; para mostrarlos se usa `formatSolesAmount` de club-fees.ts.

export type FeeRow = {
  playerId: string;
  feeId: string;
  name: string;
  provisional: boolean;
  categoryName: string | null;
  active: boolean;
  amount: number;
  paid: number;
  balance: number;
  status: FeeStatus;
  overdue: boolean;
  ownAmount: number | null;
  owed: number;
  overdueAmount: number;
  overdueMonths: number;
};

export type FeesMonthData = {
  month: string;
  currentMonth: string;
  months: string[];
  settings: { monthlyFee: number; dueDay: number; defined: boolean };
  summary: { expected: number; collected: number; percent: number; paid: number; partial: number; pending: number; free: number; overdue: number };
  players: FeeRow[];
};

export type FeePaymentRow = { id: string; amount: number; paidAt: string; by: string | null; voidedAt: string | null; voidedBy: string | null };

export type PlayerFeeHistory = {
  player: { id: string; name: string };
  ownAmount: number | null;
  startMonth: string | null;
  months: { feeId: string; month: string; amount: number; paid: number; balance: number; status: FeeStatus; overdue: boolean; payments: FeePaymentRow[] }[];
};

export class FeesError extends Error {}

/** Llama a la API de gestión y devuelve el JSON; ante un error lanza `FeesError` con el mensaje que mandó el servidor. */
export async function feesRequest<T>(method: "GET" | "POST" | "PATCH" | "DELETE", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new FeesError("No hay conexión. Revisa tu internet e inténtalo de nuevo");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new FeesError((data as { error?: string } | null)?.error ?? "No se pudo completar la acción");
  return data as T;
}

/** "18 oct" en hora de Perú, para la fecha de un abono. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short" }).replace(".", "");
}
