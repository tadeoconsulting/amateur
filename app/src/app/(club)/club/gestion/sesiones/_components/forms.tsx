"use client";

import { useState } from "react";
import { Sheet } from "@/_components/sheet";
import { Spinner } from "@/_components/spinner";
import { btnOutline, btnSolid, btnText } from "@/_components/button-styles";
import { MAX_DURATION_MIN, MIN_DURATION_MIN, WEEKDAYS, isDuration, isTime, placeError, timeRange } from "@/_lib/club-training";
import { GestionError, gestionRequest, type CategoryOption, type PlaceItem, type ScheduleItem, type SessionItem } from "@/_lib/club-training-client";

export const inputClass =
  "w-full rounded-lg border border-brand-200 bg-btn-regular px-3 py-3 font-body text-base text-text-primary transition-colors " +
  "hover:bg-surface-primary focus:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20";

const labelClass = "font-heading text-sm font-bold text-text-primary";
const DURATIONS = [60, 75, 90, 120];

function ErrorLine({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
      {message}
    </p>
  );
}

function DurationField({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Duración (minutos)
      </label>
      <input id={id} inputMode="numeric" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} className={`${inputClass} mt-1.5`} aria-describedby={`${id}-help`} />
      <div className="mt-2 flex flex-wrap gap-2">
        {DURATIONS.map((d) => (
          <button key={d} type="button" onClick={() => onChange(String(d))} aria-pressed={value === String(d)} className={`min-h-11 cursor-pointer rounded-lg px-3 font-heading text-sm font-medium ${value === String(d) ? "bg-surface-secondary text-text-invert" : "border border-border-primary text-text-primary"}`}>
            {d} min
          </button>
        ))}
      </div>
      <p id={`${id}-help`} className="mt-1.5 font-body text-xs text-text-secondary">
        De {MIN_DURATION_MIN} a {MAX_DURATION_MIN} minutos.
      </p>
    </div>
  );
}

function PlaceSelect({ id, places, value, onChange }: { id: string; places: PlaceItem[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Lugar
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1.5`}>
        {places.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}

function CategorySelect({ id, categories, value, onChange }: { id: string; categories: CategoryOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        Categoría
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputClass} mt-1.5`}>
        <option value="">Todo el club</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Crear o editar un horario semanal. */
export function ScheduleSheet({ base, schedule, places, categories, onSaved, onClose }: { base: string; schedule: ScheduleItem | null; places: PlaceItem[]; categories: CategoryOption[]; onSaved: (message: string) => void; onClose: () => void }) {
  const [weekday, setWeekday] = useState(String(schedule?.weekday ?? 2));
  const [startTime, setStartTime] = useState(schedule?.startTime ?? "19:00");
  const [duration, setDuration] = useState(String(schedule?.durationMin ?? 90));
  const [categoryId, setCategoryId] = useState(schedule?.categoryId ?? categories[0]?.id ?? "");
  const [placeId, setPlaceId] = useState(schedule?.placeId ?? places[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const invalid = !isTime(startTime) || !isDuration(Number(duration)) || !placeId;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    setError("");
    const body = { categoryId: categoryId || null, weekday: Number(weekday), startTime, durationMin: Number(duration), placeId };
    try {
      if (schedule) await gestionRequest("PATCH", `${base}/horarios/${schedule.id}`, body);
      else await gestionRequest("POST", `${base}/horarios`, body);
      onSaved(schedule ? "Horario actualizado" : "Horario creado");
    } catch (err) {
      setError(err instanceof GestionError ? err.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <Sheet title={schedule ? "Editar horario" : "Nuevo horario"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        <div>
          <label htmlFor="sch-weekday" className={labelClass}>
            Día de la semana
          </label>
          <select id="sch-weekday" value={weekday} onChange={(e) => setWeekday(e.target.value)} className={`${inputClass} mt-1.5`}>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {WEEKDAYS[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="sch-time" className={labelClass}>
            Hora de inicio
          </label>
          <input id="sch-time" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={`${inputClass} mt-1.5`} />
          {isTime(startTime) && isDuration(Number(duration)) && <p className="mt-1.5 font-body text-xs text-text-secondary">Entrenan de {timeRange(startTime, Number(duration)).replace("–", " a ")}, hora de Lima.</p>}
        </div>
        <DurationField id="sch-duration" value={duration} onChange={setDuration} />
        <CategorySelect id="sch-category" categories={categories} value={categoryId} onChange={setCategoryId} />
        <PlaceSelect id="sch-place" places={places} value={placeId} onChange={setPlaceId} />
        {schedule && <p className="rounded-lg bg-btn-regular px-3 py-2.5 font-body text-xs text-text-secondary">Al guardar se rehacen las sesiones que todavía no empiezan. Las que ya moviste a mano o tienen asistencia se quedan como están.</p>}
        <ErrorLine message={error} />
        <button type="submit" disabled={invalid || busy} className={`${btnSolid} w-full`}>
          {busy && <Spinner size={16} label="Guardando" />}
          Guardar horario
        </button>
      </form>
    </Sheet>
  );
}

/** Crear una sesión suelta o mover y cancelar una existente. */
export function SessionSheet({ base, session, today, places, categories, onSaved, onClose }: { base: string; session: SessionItem | null; today: string; places: PlaceItem[]; categories: CategoryOption[]; onSaved: (message: string) => void; onClose: () => void }) {
  const [date, setDate] = useState(session?.date ?? today);
  const [time, setTime] = useState(session?.time ?? "19:00");
  const [duration, setDuration] = useState(String(session?.durationMin ?? 90));
  const [categoryId, setCategoryId] = useState(session ? (session.categoryId ?? "") : (categories[0]?.id ?? ""));
  const [placeId, setPlaceId] = useState(session?.placeId ?? places[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const invalid = !date || !isTime(time) || !isDuration(Number(duration)) || !placeId;
  // El lugar de una sesión existente puede ser uno ya archivado: se muestra aparte para no perderlo.
  const placeOptions = session && !places.some((p) => p.id === session.placeId) ? [{ id: session.placeId, name: session.placeName, address: null, archived: true }, ...places] : places;

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      onSaved(message);
    } catch (err) {
      setError(err instanceof GestionError ? err.message : "No se pudo completar la acción");
      setBusy(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    if (session) run(() => gestionRequest("PATCH", `${base}/sesiones/${session.id}`, { date, time, durationMin: Number(duration), placeId }), "Entrenamiento actualizado");
    else run(() => gestionRequest("POST", `${base}/sesiones`, { date, time, durationMin: Number(duration), placeId, categoryId: categoryId || null }), "Entrenamiento creado");
  }

  return (
    <Sheet title={session ? "Mover o cancelar" : "Nuevo entrenamiento"} onClose={onClose}>
      <form onSubmit={save} className="flex flex-col gap-4">
        {session && (
          <p className="font-body text-sm text-text-secondary">
            {session.categoryName ?? "Todo el club"} · {session.status === "cancelada" ? "cancelado" : "programado"}. Moverlo cambia solo este día; el horario no se toca.
          </p>
        )}
        <div>
          <label htmlFor="ses-date" className={labelClass}>
            Fecha
          </label>
          <input id="ses-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="ses-time" className={labelClass}>
            Hora de inicio
          </label>
          <input id="ses-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={`${inputClass} mt-1.5`} />
        </div>
        <DurationField id="ses-duration" value={duration} onChange={setDuration} />
        {!session && <CategorySelect id="ses-category" categories={categories} value={categoryId} onChange={setCategoryId} />}
        <PlaceSelect id="ses-place" places={placeOptions} value={placeId} onChange={setPlaceId} />
        <ErrorLine message={error} />
        <button type="submit" disabled={invalid || busy} className={`${btnSolid} w-full`}>
          {busy && <Spinner size={16} label="Guardando" />}
          {session ? "Guardar cambios" : "Crear entrenamiento"}
        </button>
        {session && (
          <div className="flex flex-col gap-2">
            {session.status === "programada" ? (
              <button type="button" disabled={busy} onClick={() => run(() => gestionRequest("PATCH", `${base}/sesiones/${session.id}`, { status: "cancelada" }), "Entrenamiento cancelado")} className={btnOutline}>
                Cancelar este entrenamiento
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => run(() => gestionRequest("PATCH", `${base}/sesiones/${session.id}`, { status: "programada" }), "Entrenamiento restaurado")} className={btnOutline}>
                Restaurar entrenamiento
              </button>
            )}
            {!session.scheduleId &&
              (confirmDelete ? (
                <div className="flex items-center justify-center gap-2">
                  <button type="button" disabled={busy} onClick={() => run(() => gestionRequest("DELETE", `${base}/sesiones/${session.id}`), "Entrenamiento borrado")} className={btnText}>
                    Sí, borrar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className={btnText}>
                    No
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)} className={btnText}>
                  Borrar este entrenamiento
                </button>
              ))}
          </div>
        )}
      </form>
    </Sheet>
  );
}

/** Crear o editar un lugar de entrenamiento. */
export function PlaceSheet({ base, place, onSaved, onClose }: { base: string; place: PlaceItem | null; onSaved: (message: string) => void; onClose: () => void }) {
  const [name, setName] = useState(place?.name ?? "");
  const [address, setAddress] = useState(place?.address ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const invalid = placeError({ name, address }) !== null;

  async function run(action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      onSaved(message);
    } catch (err) {
      setError(err instanceof GestionError ? err.message : "No se pudo completar la acción");
      setBusy(false);
    }
  }

  return (
    <Sheet title={place ? "Editar lugar" : "Nuevo lugar"} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (invalid) return;
          const body = { name, address };
          if (place) run(() => gestionRequest("PATCH", `${base}/lugares/${place.id}`, body), "Lugar actualizado");
          else run(() => gestionRequest("POST", `${base}/lugares`, body), "Lugar creado");
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label htmlFor="place-name" className={labelClass}>
            Nombre del lugar
          </label>
          <input id="place-name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder="Colegio Perú Suizo" className={`${inputClass} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="place-address" className={labelClass}>
            Dirección o referencia (opcional)
          </label>
          <input id="place-address" autoComplete="off" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Av. Brasil, puerta 3" className={`${inputClass} mt-1.5`} />
        </div>
        <ErrorLine message={error} />
        <button type="submit" disabled={invalid || busy} className={`${btnSolid} w-full`}>
          {busy && <Spinner size={16} label="Guardando" />}
          Guardar lugar
        </button>
        {place &&
          (confirm ? (
            <div className="flex flex-col items-center gap-1">
              <p className="text-center font-body text-xs text-text-secondary">Si ya tiene entrenamientos se archiva y sus horarios se desactivan. Si no, se borra.</p>
              <div className="flex items-center gap-2">
                <button type="button" disabled={busy} onClick={() => run(() => gestionRequest("DELETE", `${base}/lugares/${place.id}`), "Lugar quitado")} className={btnText}>
                  Sí, quitar
                </button>
                <button type="button" onClick={() => setConfirm(false)} className={btnText}>
                  No
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} className={btnText}>
              Quitar este lugar
            </button>
          ))}
      </form>
    </Sheet>
  );
}
