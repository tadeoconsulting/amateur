import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { fieldClass } from "@/_components/field-styles";

/**
 * El campo de texto de toda la plataforma (especificación 022): una sola caja, con los estados normal, foco, error y
 * deshabilitado. Sirve para texto, correo, número, fecha, hora, etc. (`type`). Para contraseñas, `PasswordInput`.
 *
 * - `invalid`: pinta el borde de error y avisa a los lectores de pantalla.
 * - `icon`: un ícono a la derecha, dentro del campo (por ejemplo, el pin de la sede).
 * - `className`: solo para disposición (ancho, márgenes); el aspecto sale de `field-styles`.
 */
export function TextField({
  invalid = false,
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; icon?: ReactNode }) {
  const input = (
    <input aria-invalid={invalid || undefined} {...props} className={`${fieldClass(invalid)} ${icon ? "pr-11" : ""} ${className}`.trim()} />
  );
  if (!icon) return input;
  return (
    <div className="relative">
      {input}
      <span aria-hidden className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
        {icon}
      </span>
    </div>
  );
}

/** El área de texto: la misma caja que `TextField`, con alto mínimo y que crece hacia abajo. */
export function TextArea({
  invalid = false,
  className = "",
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea rows={rows} aria-invalid={invalid || undefined} {...props} className={`${fieldClass(invalid)} resize-y ${className}`.trim()} />;
}
