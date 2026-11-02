"use client";

import { useState } from "react";
import type { PlayerListItem } from "@/_lib/api";

const field =
  "w-full rounded border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none disabled:opacity-60";
const label = "mb-1.5 block font-heading text-xs font-semibold text-text-primary";

export type EventToEdit = {
  id: string;
  /** "gol", "tarjeta amarilla"… tal como se dice en el título de la hoja. */
  title: string;
  /** Con su artículo, para preguntar si se elimina: "este gol", "esta tarjeta amarilla". */
  deleteLabel: string;
  /** ¿Suma al marcador? Un gol o un penal convertido: al eliminarla se descuenta. */
  affectsScore: boolean;
  teamName: string;
  minute: number;
  playerId: string | null;
  /** ¿Se puede cambiar el jugador? Solo en un gol o una tarjeta. */
  canChangePlayer: boolean;
  /** ¿Se puede eliminar? No, en un cruce de eliminación ya terminado (ahí se reabre el partido). */
  canDelete: boolean;
};

/**
 * Editar una jugada ya registrada (especificación 018): corregir el minuto y cambiar o asignar el jugador de un gol o una
 * tarjeta, o eliminarla (se quita del marcador y de las estadísticas). El minuto original llega ya escrito, así que corregir
 * el jugador no lo pierde. Habla con `PATCH` y `DELETE /api/matches/:id/events/:eventId` a través de `onSave` y `onDelete`.
 */
export function EditEventSheet({
  event,
  players,
  saving,
  error,
  onSave,
  onDelete,
  onClose,
}: {
  event: EventToEdit;
  /** Los jugadores del equipo de la jugada. */
  players: PlayerListItem[];
  saving: boolean;
  error: string;
  onSave: (edit: { minute?: number; playerId?: string | null }) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [minute, setMinute] = useState(String(event.minute));
  const [playerId, setPlayerId] = useState(event.playerId ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const minuteValue = Number(minute);
  const minuteOk = minute.trim() !== "" && Number.isInteger(minuteValue) && minuteValue >= 0 && minuteValue <= 200;
  const minuteChanged = minuteOk && minuteValue !== event.minute;
  const playerChanged = event.canChangePlayer && playerId !== (event.playerId ?? "");
  const canSave = minuteOk && (minuteChanged || playerChanged) && !saving;

  const sorted = [...players].sort((a, b) => (a.number ?? 999) - (b.number ?? 999) || a.user.firstName.localeCompare(b.user.firstName, "es"));
  const nameOf = (p: PlayerListItem) => `${p.number != null ? `#${p.number} ` : ""}${p.user.firstName} ${p.user.lastName}`.trim();
  const currentName = players.find((p) => p.id === event.playerId);

  const save = () => {
    if (!canSave) return;
    onSave({
      ...(minuteChanged ? { minute: minuteValue } : {}),
      ...(playerChanged ? { playerId: playerId === "" ? null : playerId } : {}),
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => !saving && onClose()} />
      <div className="fixed inset-x-0 bottom-0 z-[110]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Editar ${event.title}`}
          className="mx-auto max-h-[92dvh] max-w-[430px] overflow-y-auto rounded-t-2xl bg-surface-primary px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5"
        >
          <div className="mb-4 flex justify-center">
            <div className="h-1 w-10 rounded-full bg-brand-300" />
          </div>
          <h3 className="text-center font-heading text-lg font-bold text-text-primary">Editar {event.title}</h3>
          <p className="mb-4 text-center font-body text-xs text-text-secondary">{event.teamName}</p>

          <div className="flex flex-col gap-4">
            <div>
              <label htmlFor="ej-minuto" className={label}>Minuto</label>
              <input
                id="ej-minuto"
                type="number"
                inputMode="numeric"
                min={0}
                max={200}
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                disabled={saving}
                aria-invalid={!minuteOk}
                className={field}
              />
              {!minuteOk && <p className="mt-1 font-body text-xs text-red-600">El minuto es un número de 0 a 200.</p>}
            </div>

            {event.canChangePlayer && (
              <div>
                <label htmlFor="ej-jugador" className={label}>Jugador</label>
                <select id="ej-jugador" value={playerId} onChange={(e) => setPlayerId(e.target.value)} disabled={saving} className={field}>
                  <option value="">Sin jugador</option>
                  {sorted.map((p) => (
                    <option key={p.id} value={p.id}>{nameOf(p)}</option>
                  ))}
                </select>
                {event.playerId && !currentName && (
                  <p className="mt-1 font-body text-xs text-text-secondary">El jugador actual ya no está en el plantel de este equipo.</p>
                )}
                <p className="mt-1 font-body text-xs text-text-secondary">El minuto no cambia al elegir otro jugador.</p>
              </div>
            )}
          </div>

          {error && <p role="alert" className="mt-4 font-body text-sm text-red-600">{error}</p>}

          {confirmDelete ? (
            <div className="mt-5 rounded-xl bg-btn-regular p-4" role="alertdialog" aria-label={`Eliminar ${event.title}`}>
              <p className="text-center font-heading text-sm font-bold text-text-primary">¿Eliminar {event.deleteLabel}?</p>
              <p className="mt-1 text-center font-body text-xs text-text-secondary">
                Se borra la jugada{event.affectsScore ? " y se quita del marcador" : ""}
                {event.playerId ? " y de las estadísticas del jugador" : ""}.
              </p>
              <div className="mt-3 flex gap-3">
                <button
                  onClick={onDelete}
                  disabled={saving}
                  className="min-h-12 flex-1 cursor-pointer rounded-lg bg-red-600 px-3 font-heading text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-40"
                >
                  {saving ? "Eliminando..." : "Sí, eliminar"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                  className="min-h-12 flex-1 cursor-pointer rounded-lg border border-border-primary px-3 font-heading text-sm font-bold text-text-primary transition-colors hover:bg-surface-primary disabled:opacity-40"
                >
                  No
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={save}
                disabled={!canSave}
                className="min-h-12 w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="w-full cursor-pointer py-2 font-heading text-sm font-semibold text-text-primary disabled:opacity-40"
              >
                Cancelar
              </button>
              {event.canDelete && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={saving}
                  className="w-full cursor-pointer py-2 font-heading text-sm font-bold text-red-600 underline disabled:opacity-40"
                >
                  Eliminar {event.title}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
