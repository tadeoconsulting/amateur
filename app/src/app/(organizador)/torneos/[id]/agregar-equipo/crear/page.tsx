"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const presetColors = [
  "#FF6363", "#FF9F43", "#FFD039", "#00CA81",
  "#1565C0", "#7C3AED", "#EC4899", "#1B1B1B",
];

export default function CrearEquipoPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [color, setColor] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [success, setSuccess] = useState(false);

  const canSubmit = nombre.trim() && nombreCorto.trim();

  function handleSubmit() {
    if (!canSubmit) return;
    setSuccess(true);
  }

  if (success) {
    return (
      <div className="flex w-full flex-col items-center justify-center px-6 py-16 text-center">
        {/* Celebration illustration */}
        <div className="mb-8">
          <svg width="200" height="180" viewBox="0 0 200 180" fill="none">
            <ellipse cx="100" cy="165" rx="70" ry="10" fill="var(--color-brand-300)" />
            {/* Player left */}
            <rect x="35" y="50" width="24" height="55" rx="3" fill="#FF6363" />
            <circle cx="47" cy="42" r="11" fill="#FFCDD2" />
            <rect x="38" y="105" width="8" height="35" fill="#1B1B1B" rx="2" />
            <rect x="48" y="105" width="8" height="35" fill="#1B1B1B" rx="2" />
            {/* Arms up */}
            <rect x="27" y="40" width="8" height="25" rx="3" fill="#FF6363" transform="rotate(-20 27 40)" />
            <rect x="59" y="35" width="8" height="25" rx="3" fill="#FF6363" transform="rotate(20 59 35)" />
            {/* Player center */}
            <rect x="85" y="40" width="28" height="60" rx="3" fill="#1565C0" />
            <circle cx="99" cy="30" r="13" fill="#BBDEFB" />
            <rect x="89" y="100" width="9" height="38" fill="#1B1B1B" rx="2" />
            <rect x="101" y="100" width="9" height="38" fill="#1B1B1B" rx="2" />
            {/* Arms up */}
            <rect x="77" y="28" width="8" height="28" rx="3" fill="#1565C0" transform="rotate(-25 77 28)" />
            <rect x="113" y="25" width="8" height="28" rx="3" fill="#1565C0" transform="rotate(25 113 25)" />
            {/* Player right */}
            <rect x="140" y="50" width="24" height="55" rx="3" fill="#00CA81" />
            <circle cx="152" cy="42" r="11" fill="#A5D6A7" />
            <rect x="143" y="105" width="8" height="35" fill="#1B1B1B" rx="2" />
            <rect x="153" y="105" width="8" height="35" fill="#1B1B1B" rx="2" />
            {/* Arms up */}
            <rect x="132" y="40" width="8" height="25" rx="3" fill="#00CA81" transform="rotate(-20 132 40)" />
            <rect x="164" y="35" width="8" height="25" rx="3" fill="#00CA81" transform="rotate(20 164 35)" />
            {/* Confetti */}
            <rect x="20" y="15" width="6" height="6" rx="1" fill="#FFD039" transform="rotate(15 20 15)" />
            <rect x="60" y="5" width="5" height="5" rx="1" fill="#FF6363" transform="rotate(-10 60 5)" />
            <rect x="130" y="8" width="6" height="6" rx="1" fill="#00CA81" transform="rotate(25 130 8)" />
            <rect x="170" y="18" width="5" height="5" rx="1" fill="#1565C0" transform="rotate(-15 170 18)" />
            <circle cx="45" cy="10" r="3" fill="#7C3AED" />
            <circle cx="155" cy="5" r="3" fill="#FFD039" />
            <circle cx="100" cy="2" r="2.5" fill="#EC4899" />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-bold text-text-primary mb-3">
          ¡Es un gran equipo!
        </h1>
        <p className="font-body text-sm text-text-secondary leading-relaxed max-w-[280px] mb-10">
          <span className="font-semibold">Juan</span> será notificado por correo a{" "}
          <span className="font-semibold">JuanPeña@gmail.com</span> y deberá completar el perfil de su club.
        </p>

        <button
          onClick={() => router.back()}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700"
        >
          Volver al torneo
        </button>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <header className="px-4 py-3">
        <button
          onClick={() => router.back()}
          className="flex cursor-pointer items-center gap-1 font-heading text-sm font-semibold text-text-primary"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="rotate-180">
            <path d="M7.5 4L13.5 10L7.5 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Volver
        </button>
      </header>

      {/* Avatar */}
      <div className="mt-4 flex justify-center">
        <div className="relative">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-brand-200"
            style={color ? { backgroundColor: color + "20", borderColor: color } : undefined}
          >
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 2h8v4a4 4 0 01-8 0V2zM3 3H1.5a.5.5 0 00-.5.5v1a2 2 0 002 2H3M13 3h1.5a.5.5 0 01.5.5v1a2 2 0 01-2 2h-.5M6 10v2M10 10v2M5 12h6a1 1 0 011 1v1H4v-1a1 1 0 011-1z"
                stroke={color || "var(--color-text-secondary)"}
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <button className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-secondary text-text-invert shadow-md">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M6.5 2.5L7.5 1.5h1l1 1h2.5a1 1 0 011 1v8a1 1 0 01-1 1h-9a1 1 0 01-1-1v-8a1 1 0 011-1H6.5z"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="mt-8 flex flex-col gap-5 px-4">
        {/* Nombre de equipo */}
        <div>
          <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
            Nombre de equipo
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Deportivo Ciudad"
            className="w-full rounded-lg border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
          />
        </div>

        {/* Nombre corto */}
        <div>
          <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
            Nombre corto
          </label>
          <input
            type="text"
            value={nombreCorto}
            onChange={(e) => setNombreCorto(e.target.value)}
            placeholder="Ciudad"
            className="w-full rounded-lg border border-transparent bg-btn-regular px-3 py-3 font-body text-sm text-text-primary placeholder:text-text-primary/60 transition-colors hover:border-border-primary hover:bg-surface-primary focus:border-text-primary focus:bg-surface-primary focus:outline-none"
          />
        </div>

        {/* Color representativo */}
        <div>
          <label className="mb-1.5 block font-heading text-sm font-semibold text-text-primary">
            Color representativo
          </label>
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-transparent bg-btn-regular px-3 py-3 font-body text-sm transition-colors hover:border-border-primary hover:bg-surface-primary"
          >
            <div
              className="h-6 w-6 shrink-0 rounded"
              style={{ backgroundColor: color || "var(--color-brand-300)" }}
            />
            <span className={color ? "text-text-primary" : "text-text-primary/60"}>
              {color ? color.toUpperCase() : "Elige un color"}
            </span>
          </button>

          {showColorPicker && (
            <div className="mt-2 flex flex-wrap gap-2 rounded-lg border border-brand-200 bg-surface-primary p-3">
              {presetColors.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setShowColorPicker(false); }}
                  className={`h-9 w-9 cursor-pointer rounded-lg transition-transform hover:scale-110 ${
                    color === c ? "ring-2 ring-text-primary ring-offset-2" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8 px-4">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full cursor-pointer rounded-lg bg-surface-secondary py-3.5 font-heading text-sm font-bold text-text-invert transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Crear equipo
        </button>
      </div>
    </div>
  );
}
