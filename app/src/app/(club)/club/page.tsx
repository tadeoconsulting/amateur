"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useMyClub } from "@/_lib/use-my-club";
import { safeInternalPath } from "@/_lib/safe-next";
import { ClubAvatar } from "@/_components/club-avatar";
import { PageSpinner, Spinner } from "@/_components/spinner";
import { btnSolid } from "@/_components/button-styles";

// Colores oscuros: las iniciales blancas del avatar llegan a 4.5:1 sobre todos.
const COLORS = [
  { name: "Negro", value: "#1B1B1B" },
  { name: "Azul", value: "#1D4ED8" },
  { name: "Rojo", value: "#B91C1C" },
  { name: "Verde", value: "#15803D" },
  { name: "Naranja", value: "#C2410C" },
  { name: "Morado", value: "#7E22CE" },
  { name: "Turquesa", value: "#0E7490" },
  { name: "Rosado", value: "#BE185D" },
] as const;

const NAME_MAX = 80;
const SHORT_MAX = 12;

const inputClass =
  "w-full rounded-lg border bg-btn-regular px-3 py-3 font-body text-base text-text-primary transition-colors " +
  "hover:bg-surface-primary focus:bg-surface-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-text-primary/20";

/** Sugiere un nombre corto de hasta 3 letras a partir del nombre. */
function suggestShortName(name: string) {
  return name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase();
}

function CreateClubForm({ next }: { next: string }) {
  const router = useRouter();
  const { user, addRole } = useAuth();
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [shortEdited, setShortEdited] = useState(false);
  const [color, setColor] = useState<string>(COLORS[0].value);
  const [touched, setTouched] = useState({ name: false, shortName: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shownShort = shortEdited ? shortName : suggestShortName(name);
  const nameError = !name.trim() ? "Escribe el nombre del equipo" : "";
  const shortError = !shownShort.trim() ? "Escribe un nombre corto" : "";
  const valid = !nameError && !shortError;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ name: true, shortName: true });
    if (!valid || busy) return;
    setError("");
    setBusy(true);
    try {
      // Crear un equipo exige el perfil de dueño de club: se activa aquí, no al solo mirar la pantalla.
      if (!user?.roles.includes("CLUB_OWNER")) {
        const role = await addRole("CLUB_OWNER");
        if (!role.ok) {
          setError(role.error ?? "No se pudo activar el perfil de equipo");
          return;
        }
      }
      const res = await fetch("/api/clubs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), shortName: shownShort.trim(), color }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo crear el equipo");
        return;
      }
      router.replace(next);
    } catch {
      setError("No se pudo conectar. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-8 pt-8">
      <h1 className="font-heading text-2xl font-bold text-text-primary">Crea tu equipo</h1>
      <p className="mt-2 font-body text-sm text-text-secondary">
        Con tu equipo puedes pedir unirte a torneos, sumar jugadores y recibir invitaciones de organizadores.
      </p>

      <div className="mt-6 flex items-center gap-4 rounded-xl bg-btn-regular p-4">
        <ClubAvatar shortName={shownShort || "EQ"} color={color} size={56} />
        <div className="min-w-0">
          <p className="truncate font-heading text-base font-bold text-text-primary">{name.trim() || "Nombre del equipo"}</p>
          <p className="font-body text-xs text-text-secondary">Así se verá tu equipo</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate className="mt-6 flex flex-col gap-5">
        <div>
          <label htmlFor="club-name" className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
            Nombre del equipo
          </label>
          <input
            id="club-name"
            value={name}
            maxLength={NAME_MAX}
            autoComplete="off"
            aria-invalid={touched.name && !!nameError}
            aria-describedby="club-name-help"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, name: true }))}
            className={`${inputClass} ${touched.name && nameError ? "border-error" : "border-transparent hover:border-border-primary focus:border-text-primary"}`}
          />
          <p id="club-name-help" className={`mt-1.5 font-body text-xs ${touched.name && nameError ? "text-brand-900" : "text-text-secondary"}`}>
            {touched.name && nameError ? nameError : "Así lo verán los organizadores y los otros equipos."}
          </p>
        </div>

        <div>
          <label htmlFor="club-short" className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
            Nombre corto
          </label>
          <input
            id="club-short"
            value={shownShort}
            maxLength={SHORT_MAX}
            autoComplete="off"
            aria-invalid={touched.shortName && !!shortError}
            aria-describedby="club-short-help"
            onChange={(e) => {
              setShortEdited(true);
              setShortName(e.target.value.toUpperCase());
            }}
            onBlur={() => setTouched((t) => ({ ...t, shortName: true }))}
            className={`${inputClass} uppercase ${touched.shortName && shortError ? "border-error" : "border-transparent hover:border-border-primary focus:border-text-primary"}`}
          />
          <p id="club-short-help" className={`mt-1.5 font-body text-xs ${touched.shortName && shortError ? "text-brand-900" : "text-text-secondary"}`}>
            {touched.shortName && shortError ? shortError : `Hasta ${SHORT_MAX} letras. Aparece en marcadores y tablas.`}
          </p>
        </div>

        <fieldset>
          <legend className="mb-1.5 font-heading text-sm font-semibold text-text-primary">Color del equipo</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Color del equipo">
            {COLORS.map((c) => {
              const selected = color === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={c.name}
                  onClick={() => setColor(c.value)}
                  style={{ backgroundColor: c.value }}
                  className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-white transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary ${
                    selected ? "ring-2 ring-text-primary ring-offset-2" : ""
                  }`}
                >
                  {selected && (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                      <path d="M4 9.5L7.5 13L14 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="rounded-lg bg-error/15 px-3 py-2.5 font-body text-sm text-brand-900">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className={`${btnSolid} min-h-12 w-full`}>
          {busy && <Spinner size={16} label="Creando equipo" />}
          {busy ? "Creando equipo..." : "Crear equipo"}
        </button>
      </form>
    </main>
  );
}

function ClubGate() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeInternalPath(params.get("next"), "/club/torneos");
  const { club, loading } = useMyClub();

  // Quien ya tiene un equipo no ve el formulario: va directo a su destino.
  useEffect(() => {
    if (!loading && club) router.replace(next);
  }, [loading, club, next, router]);

  if (loading || club) return <PageSpinner />;
  return <CreateClubForm next={next} />;
}

export default function ClubIndexPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ClubGate />
    </Suspense>
  );
}
