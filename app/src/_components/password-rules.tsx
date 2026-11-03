"use client";

import { MIN_PASSWORD_LENGTH, PASSWORD_HINT, passwordChecks } from "@/_lib/password-rules";

/**
 * La ayuda de una contraseña nueva (observación 65): dice qué hace falta y marca cada requisito mientras se escribe. Va
 * debajo del campo donde alguien **elige** su contraseña (registrarse, restablecerla, cambiarla, aceptar una invitación);
 * al iniciar sesión no se muestra. Las reglas son las de `password-rules.ts`, las mismas que valida el servidor.
 *
 * - Antes de escribir, solo la frase de ayuda (`showHint={false}` si la pantalla ya la trae arriba); con algo escrito, la
 *   lista con ✓ / ○ en cada requisito.
 * - No avisa a gritos (no es un `aria-live`): quien usa un lector de pantalla la lee al pasar por el campo, y cada requisito
 *   dice "cumplido" o "pendiente".
 * - Usa el color del texto que la rodea, para servir sobre fondo claro y oscuro.
 */
export function PasswordRules({ value, className = "", showHint = true }: { value: string; className?: string; showHint?: boolean }) {
  const checks = passwordChecks(value);
  const items = [
    { ok: checks.length, text: `${MIN_PASSWORD_LENGTH} caracteres o más` },
    { ok: checks.uppercase, text: "Una letra mayúscula (A–Z)" },
  ];

  return (
    <div className={`mt-2 font-body text-xs ${className}`}>
      {showHint && <p className="opacity-80">{PASSWORD_HINT}</p>}
      {value !== "" && (
        <ul className="mt-1.5 flex flex-col gap-1" aria-label="Requisitos de la contraseña">
          {items.map((item) => (
            <li key={item.text} className={`flex items-center gap-1.5 ${item.ok ? "font-semibold" : "opacity-70"}`}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0">
                {item.ok ? (
                  <path d="M3 8.5L6.5 12L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
                )}
              </svg>
              <span>{item.text}</span>
              <span className="sr-only">{item.ok ? ": cumplido" : ": pendiente"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
