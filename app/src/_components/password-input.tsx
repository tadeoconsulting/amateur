"use client";

import { useState, type InputHTMLAttributes } from "react";

/**
 * Un campo de contraseña con un botón para verla u ocultarla (el ojo, a la derecha). Se usa en lugar de
 * `<input type="password">` en todas las pantallas donde alguien escribe una contraseña: en el celular es fácil
 * equivocarse al escribir sin ver lo que se escribe.
 *
 * - Recibe lo mismo que un `<input>`, salvo `type`. `className` va al campo (se le deja espacio a la derecha para el
 *   botón); `wrapperClassName`, al contenedor (por ejemplo, un margen de arriba).
 * - Arranca oculta. El botón se anuncia como "Mostrar contraseña" / "Ocultar contraseña" y dice si está activado.
 * - Al mostrarla el campo sigue siendo el mismo (mantiene el foco y el cursor): solo cambia el `type`.
 */
export function PasswordInput({
  className = "",
  wrapperClassName = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { wrapperClassName?: string }) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Ocultar contraseña" : "Mostrar contraseña";

  return (
    <div className={`relative ${wrapperClassName}`}>
      <input {...props} type={visible ? "text" : "password"} className={`${className} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-text-primary"
      >
        {visible ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c5 0 8.5 4 9.5 7a12.6 12.6 0 0 1-2.7 4.3M6.5 6.5A12.7 12.7 0 0 0 2.5 12c1 3 4.5 7 9.5 7a9.6 9.6 0 0 0 4.1-.9" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7S2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
