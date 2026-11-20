"use client";

import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { fieldClass, picklistOptionClass, picklistPanelClass } from "@/_components/field-styles";
import { firstEnabled, indexOfValue, lastEnabled, picklistLabel, stepEnabled, typeaheadIndex, type PicklistOption } from "@/_lib/picklist";

export type { PicklistOption };

// El texto de un nodo (los `<option>` suelen traer textos y números mezclados: «Fecha {d}»).
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

// Las opciones escritas como `<option value disabled>texto</option>` (también dentro de fragmentos y de `.map`), para migrar un
// `<select>` sin reescribir sus opciones.
function optionsFromChildren(children: ReactNode): PicklistOption[] {
  const out: PicklistOption[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>(child)) return;
    if (child.type === Fragment) {
      out.push(...optionsFromChildren(child.props.children));
    } else if (child.type === "option") {
      const label = textOf(child.props.children);
      out.push({ value: String(child.props.value ?? label), label, disabled: Boolean(child.props.disabled) });
    }
  });
  return out;
}

/**
 * El desplegable propio de la plataforma (especificación 022): reemplaza al `<select>` nativo, con el aspecto del design system
 * y el mismo comportamiento en todos los ámbitos. El botón es un `combobox` y el panel un `listbox` (la opción activa se anuncia
 * con `aria-activedescendant`; el foco no sale del botón).
 *
 * Teclado: ↓ / ↑ abren y mueven (con vuelta); Inicio / Fin saltan a la primera / última; Enter o Espacio eligen; Escape cierra; Tab
 * cierra; al escribir letras salta a la opción que empieza con ellas. Con el ratón o el dedo: clic en el botón y en una opción;
 * fuera del panel se cierra.
 *
 * - `value` / `onChange(value)`: controlado; el valor `""` es «sin elegir» y muestra el `placeholder`. `onChange` recibe siempre
 *   un texto (si el estado es un número, conviértelo: `Number(v)`).
 * - `options`: `{ value, label, disabled? }`; o, en su lugar, `<option>` como hijos (la opción con valor `""` es el marcador).
 * - `name`: si se pasa, agrega un `<input type="hidden">` para los formularios nativos.
 * - `invalid`: borde de error. `className`: solo disposición (ancho, márgenes).
 */
export function Picklist({
  id,
  name,
  value: rawValue,
  onChange,
  options: optionsProp,
  children,
  placeholder: placeholderProp,
  invalid = false,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name?: string;
  value: string | number;
  onChange: (value: string) => void;
  options?: PicklistOption[];
  children?: ReactNode;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}) {
  const options = optionsProp ?? optionsFromChildren(children);
  const value = String(rawValue ?? "");
  const placeholder = placeholderProp ?? options.find((o) => o.value === "")?.label ?? "Elige una opción";
  const autoId = useId();
  const controlId = id ?? `picklist-${autoId}`;
  const listId = `${controlId}-lista`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typed = useRef({ text: "", timer: 0 as unknown as ReturnType<typeof setTimeout> });

  const selected = indexOfValue(options, value);
  const { text, isPlaceholder } = picklistLabel(options, value, placeholder);

  function openList(index?: number) {
    if (disabled) return;
    setOpen(true);
    setActive(index ?? (selected >= 0 ? selected : firstEnabled(options)));
  }

  function choose(index: number) {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    setOpen(false);
  }

  // Un clic fuera cierra la lista.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // La opción activa queda a la vista.
  useEffect(() => {
    if (!open || active < 0) return;
    document.getElementById(`${controlId}-opcion-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [open, active, controlId]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    switch (e.key) {
      case "ArrowDown":
      case "ArrowUp": {
        e.preventDefault();
        const step = e.key === "ArrowDown" ? 1 : -1;
        if (!open) openList();
        else setActive((a) => stepEnabled(options, a, step));
        return;
      }
      case "Home":
      case "End":
        if (!open) return;
        e.preventDefault();
        setActive(e.key === "Home" ? firstEnabled(options) : lastEnabled(options));
        return;
      case "Enter":
      case " ":
        e.preventDefault();
        if (!open) openList();
        else if (active >= 0) choose(active);
        return;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        return;
      case "Tab":
        setOpen(false);
        return;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          clearTimeout(typed.current.timer);
          typed.current.text += e.key;
          typed.current.timer = setTimeout(() => (typed.current.text = ""), 700);
          const found = typeaheadIndex(options, typed.current.text, open ? active : selected);
          if (found >= 0) {
            if (!open) setOpen(true);
            setActive(found);
          }
        }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        id={controlId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${controlId}-opcion-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        className={`${fieldClass(invalid)} flex cursor-pointer items-center justify-between gap-2 pr-3 text-left ${open ? "border-text-primary bg-surface-primary" : ""}`}
      >
        <span className={`min-w-0 flex-1 truncate ${isPlaceholder ? "text-text-primary/60" : ""}`}>{text || " "}</span>
        {/* La flecha propia, a 12 px del borde derecho (el mismo margen que el texto a la izquierda). */}
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul id={listId} role="listbox" aria-labelledby={controlId} tabIndex={-1} className={picklistPanelClass}>
          {options.map((option, i) => (
            <li
              key={option.value}
              id={`${controlId}-opcion-${i}`}
              role="option"
              aria-selected={i === selected}
              aria-disabled={option.disabled || undefined}
              // El botón no pierde el foco al elegir con el ratón.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(i)}
              onMouseEnter={() => !option.disabled && setActive(i)}
              className={`${picklistOptionClass} ${i === active ? "bg-btn-regular" : ""} ${option.disabled ? "cursor-not-allowed opacity-40" : ""} ${i === selected ? "font-semibold" : ""}`}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {i === selected && (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden className="shrink-0 text-verification">
                  <path d="M4.5 10.5l3.5 3.5 7.5-8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
