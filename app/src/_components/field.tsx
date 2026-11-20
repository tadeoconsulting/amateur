import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { Label } from "@/_components/label";
import { fieldErrorClass, fieldHelpClass } from "@/_components/field-styles";

/**
 * Una etiqueta, un control y su ayuda o error: el bloque de formulario único de la plataforma (especificación 022).
 *
 * - `htmlFor` debe ser el `id` del control (`TextField`, `TextArea`, `Picklist`…); `Field` le agrega `aria-describedby`
 *   (hacia la ayuda o el error) y `aria-invalid` cuando hay error.
 * - `error` tiene prioridad sobre `help` y se anuncia a los lectores de pantalla (`role="alert"`).
 * - `required` y `optional` marcan la etiqueta (ver `Label`).
 */
export function Field({
  label,
  htmlFor,
  help,
  error,
  required = false,
  optional = false,
  className = "",
  children,
}: {
  label: string;
  htmlFor: string;
  help?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactElement<{ "aria-describedby"?: string; invalid?: boolean }>;
}) {
  const messageId = `${htmlFor}-mensaje`;
  const hasMessage = Boolean(error || help);
  const control = isValidElement(children)
    ? cloneElement(children, {
        "aria-describedby": hasMessage ? messageId : undefined,
        ...(error ? { invalid: true } : {}),
      })
    : children;
  return (
    <div className={className}>
      <Label htmlFor={htmlFor} required={required} optional={optional} className="mb-2 block">
        {label}
      </Label>
      {control}
      {error ? (
        <p id={messageId} role="alert" className={fieldErrorClass}>
          {error}
        </p>
      ) : help ? (
        <p id={messageId} className={fieldHelpClass}>
          {help}
        </p>
      ) : null}
    </div>
  );
}
