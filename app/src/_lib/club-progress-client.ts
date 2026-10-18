"use client";

import { useEffect, useState } from "react";
import type { AttendanceStatus } from "./club-training";
import type { FeeStatus } from "./club-fees";

// Lo que el jugador ve de su club (especificación 015, entrega 3): GET /api/me/club-progreso.

export type ClubProgress = {
  club: { id: string; name: string; shortName: string; logoUrl: string | null; color: string | null };
  playerId: string;
  categoryName: string | null;
  sessions: { id: string; date: string; time: string; durationMin: number; status: "programada" | "cancelada"; categoryName: string | null; placeName: string; placeAddress: string | null }[];
  attendance: {
    windowDays: number;
    percent: number | null;
    presente: number;
    ausente: number;
    justificado: number;
    recent: { date: string; time: string; categoryName: string | null; status: AttendanceStatus | null }[];
  };
  payments: {
    defined: boolean;
    monthlyAmount: number | null;
    dueMonths: number;
    paidMonths: number;
    owed: number;
    overdue: number;
    overdueMonths: number;
    months: { month: string; amount: number; paid: number; balance: number; status: FeeStatus; overdue: boolean; lastPaidAt: string | null }[];
  };
};

/** El progreso del jugador en cada club donde tiene ficha activa. Vacío si no está en ninguno. */
export function useClubProgress() {
  const [clubs, setClubs] = useState<ClubProgress[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/club-progreso")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error((data as { error?: string } | null)?.error ?? "No se pudo cargar");
        return (data as { clubs: ClubProgress[] }).clubs;
      })
      .then((list) => {
        if (!cancelled) setClubs(list);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { clubs, error, loading: clubs === null && !error };
}
