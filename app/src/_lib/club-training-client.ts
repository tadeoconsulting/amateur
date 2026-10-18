"use client";

import type { AttendanceStatus } from "./club-training";

// Lo que las pantallas de Sesiones y Asistencia (especificación 015, entrega 2) piden y reciben de /api/clubs/:id/gestion.
export { feesRequest as gestionRequest, FeesError as GestionError } from "./club-fees-client";

export type PlaceItem = { id: string; name: string; address: string | null; archived: boolean };

export type ScheduleItem = { id: string; categoryId: string | null; categoryName: string | null; weekday: number; startTime: string; durationMin: number; placeId: string; placeName: string | null };

export type SessionItem = {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  scheduleId: string | null;
  date: string;
  time: string;
  weekday: number;
  durationMin: number;
  placeId: string;
  placeName: string;
  status: "programada" | "cancelada";
  rosterSize: number;
  marked: number;
  presente: number;
  ausente: number;
  justificado: number;
  canMark: boolean;
};

export type RosterData = {
  session: { id: string; date: string; time: string; durationMin: number; status: string; categoryName: string | null; placeName: string };
  canMark: boolean;
  summary: { total: number; marked: number; presente: number; ausente: number; justificado: number; percent: number | null };
  players: { playerId: string; name: string; provisional: boolean; position: string | null; number: number | null; categoryName: string | null; status: AttendanceStatus | null }[];
};

export type AttendanceSummary = {
  desde: string;
  hasta: string;
  club: { percent: number | null; sessions: number };
  categories: { id: string; name: string; sessions: number; percent: number | null }[];
  players: { playerId: string; name: string; provisional: boolean; categoryName: string | null; presente: number; ausente: number; justificado: number; percent: number | null }[];
};

export type CategoryOption = { id: string; name: string };
