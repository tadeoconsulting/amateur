"use client";

import Link from "next/link";
import { Children, Fragment, isValidElement, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { TextField } from "@/_components/text-field";
import { fieldClass, picklistInlinePanelClass, picklistMenuItemClass, picklistMenuPanelClass, picklistOptionClass, picklistPanelClass } from "@/_components/field-styles";
import { firstEnabled, indexOfValue, lastEnabled, picklistLabel, stepEnabled, typeaheadIndex, type PicklistOption } from "@/_lib/picklist";

export type { PicklistOption };

/** Una acción de la variante `menu`. */
export type PicklistItem = {
  key: string;
  label: string;
  /** Un ícono de `actionIcons` (o cualquier nodo de 18 px). */
  icon?: ReactNode;
  /** Lleva a otra pantalla (se dibuja como enlace). Sin `href`, ejecuta `onSelect`. */
  href?: string;
  onSelect?: () => void;
  /** `danger` para lo destructivo: se dibuja en rojo y, con `separated`, aparte. */
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Una línea fina encima, para separar un grupo (por ejemplo, lo destructivo). */
  separated?: boolean;
};

type FieldProps = {
  variant?: "field";
  id?: string;
  name?: string;
  value: string | number;
  onChange: (value: string) => void;
  options?: PicklistOption[];
  children?: ReactNode;
  placeholder?: string;
  /** El panel va en el flujo de la página, no flotando (dentro de un modal con scroll). */
  inline?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

type MenuProps = {
  variant: "menu";
  items: PicklistItem[];
  /** El nombre del botón y del menú para los lectores de pantalla; también el texto del botón por omisión. */
  label: string;
  /** El contenido del botón en lugar del texto y la flecha por omisión (por ejemplo, el avatar y el nombre de la cuenta). */
  trigger?: ReactNode;
  /** `outline` (por omisión): botón con borde. `ghost`: sin borde, para la barra de navegación. */
  triggerStyle?: "outline" | "ghost";
  /** Un bloque encima de las acciones (por ejemplo, el nombre y el rol de la cuenta). */
  header?: ReactNode;
  className?: string;
};

/** Una opción de la variante `multi`. `hint` es un texto chico a la derecha (por ejemplo, un código); `icon` y `description`, para opciones con más contenido (los perfiles). */
export type PicklistMultiOption = { value: string; label: string; hint?: string; icon?: ReactNode; description?: string };

type MultiProps = {
  variant: "multi";
  id?: string;
  options: PicklistMultiOption[];
  /** Los valores elegidos. Sin ninguno, el desplegable no filtra («todos»). */
  selected: string[];
  onChange: (next: string[]) => void;
  /** Lo que dice el botón cuando no hay nada elegido: «Todos los equipos». */
  allLabel: string;
  /** El plural para el resumen: «equipos» → «3 equipos». */
  noun: string;
  /** Cómo resumir lo elegido en el botón; por omisión, el nombre si es uno y «N <plural>» si son varios. */
  summarize?: (selected: PicklistMultiOption[]) => string;
  /** Con más de 6 opciones trae un buscador; este es su texto. */
  searchPlaceholder?: string;
  /** El panel va en el flujo de la página, no flotando (dentro de un modal con scroll). */
  inline?: boolean;
  /** Muestra «N seleccionados» y el botón «Limpiar» (por omisión sí; los perfiles de registro no lo llevan). */
  clearable?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

export type PicklistProps = FieldProps | MenuProps | MultiProps;

/**
 * EL desplegable de la plataforma (especificación 022): un solo componente con dos variantes, con el mismo panel, las mismas
 * opciones y el mismo cierre (clic fuera, Escape, Tab).
 *
 * - `variant="field"` (por omisión): el **selector** de un valor, que reemplaza al `<select>` nativo. El botón es un `combobox` y
 *   el panel un `listbox`; el foco no sale del botón. `value` / `onChange(value)` / `options` (o `<option>` como hijos; la opción
 *   con valor `""` es el marcador). `invalid`, `disabled`, `name` (un `<input type="hidden">` para formularios nativos).
 *   Teclado: ↓ ↑ abren y mueven; Inicio y Fin saltan; Enter o Espacio eligen; Escape cierra; escribir salta a la opción.
 * - `variant="multi"`: el **selector de varios** (filtros de tablas, perfiles): casillas, resumen en el botón («3 equipos»),
 *   buscador si hay más de 6 opciones y «Limpiar». `selected` / `onChange(next)`; sin nada elegido no filtra.
 * - `variant="menu"`: el **menú de acciones** (por ejemplo «Acciones» de un torneo o el menú de la cuenta): `items` con ícono,
 *   enlace o acción, `tone="danger"` y `separated`. El panel es un `menu`; el foco se mueve entre los ítems. Teclado: Enter,
 *   Espacio o ↓ abren; ↑ ↓ recorren con vuelta; Inicio y Fin saltan; Escape cierra y devuelve el foco al botón; Tab cierra.
 *
 * `className` es solo para disposición (ancho, márgenes); el aspecto sale de `field-styles`.
 */
export function Picklist(props: PicklistProps) {
  if (props.variant === "menu") return <MenuPicklist {...props} />;
  if (props.variant === "multi") return <MultiPicklist {...props} />;
  return <FieldPicklist {...props} />;
}

// ———— Comportamiento compartido ————

/** Cierra el desplegable con un clic o toque fuera de `ref`. */
function useCloseOnOutside(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
    // `close` es estable en quien lo llama.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

const Chevron = ({ open, className = "" }: { open: boolean; className?: string }) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""} ${className}`}>
    <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ———— Variante «field»: el selector ————

// El texto de un nodo (los `<option>` suelen traer textos y números mezclados: «Fecha {d}»).
function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

// Las opciones escritas como `<option value disabled>texto</option>` (también dentro de fragmentos y de `.map`).
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

function FieldPicklist({
  id,
  name,
  value: rawValue,
  onChange,
  options: optionsProp,
  children,
  placeholder: placeholderProp,
  inline = false,
  invalid = false,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: FieldProps) {
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
  const close = useCallback(() => setOpen(false), []);
  useCloseOnOutside(open, close, rootRef);

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
          // Escape cierra solo la lista; sin esto cerraría también el modal que la contiene.
          e.preventDefault();
          e.stopPropagation();
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
    <div ref={rootRef} className={`${inline ? "" : "relative"} ${className}`.trim()}>
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
        <Chevron open={open} />
      </button>

      {open && (
        <ul id={listId} role="listbox" aria-labelledby={controlId} tabIndex={-1} className={inline ? picklistInlinePanelClass : picklistPanelClass}>
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

// ———— Variante «multi»: varias opciones a la vez ————

function MultiPicklist({
  id,
  options,
  selected,
  onChange,
  allLabel,
  noun,
  summarize,
  searchPlaceholder = "Buscar...",
  inline = false,
  clearable = true,
  invalid = false,
  disabled = false,
  className = "",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: MultiProps) {
  const autoId = useId();
  const controlId = id ?? `picklist-${autoId}`;
  const listId = `${controlId}-lista`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const close = useCallback(() => setOpen(false), []);
  useCloseOnOutside(open, close, rootRef);

  const chosen = new Set(selected);
  const chosenOptions = options.filter((o) => chosen.has(o.value));
  const summary = summarize
    ? summarize(chosenOptions)
    : selected.length === 0
      ? allLabel
      : selected.length === 1
        ? (chosenOptions[0]?.label ?? `1 ${noun.replace(/s$/, "")}`)
        : `${selected.length} ${noun}`;

  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q) || o.hint?.toLowerCase().includes(q)) : options;
  const toggle = (value: string) => onChange(chosen.has(value) ? selected.filter((v) => v !== value) : [...selected, value]);

  // Escape cierra solo la lista; sin stopPropagation cerraría también el modal que la contiene.
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div ref={rootRef} onKeyDown={onKeyDown} className={`${inline ? "" : "relative"} ${className}`.trim()}>
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`${fieldClass(invalid)} flex cursor-pointer items-center justify-between gap-2 pr-3 text-left ${selected.length > 0 ? "border-border-primary" : ""} ${open ? "border-text-primary bg-surface-primary" : ""}`}
      >
        <span className={`min-w-0 flex-1 truncate ${selected.length === 0 ? "text-text-primary/60" : ""}`}>{summary}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div className={inline ? picklistInlinePanelClass : picklistPanelClass}>
          {options.length > 6 && (
            <div className="border-b border-border-primary pb-2">
              <TextField autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
            </div>
          )}
          {clearable && (
            <div className="flex items-center justify-between px-3 py-2">
              <span className="font-body text-xs text-text-secondary">
                {selected.length === 0 ? "Sin filtro" : `${selected.length} seleccionado${selected.length === 1 ? "" : "s"}`}
              </span>
              <button
                type="button"
                onClick={() => onChange([])}
                disabled={selected.length === 0}
                className="cursor-pointer font-body text-xs font-bold text-text-primary underline disabled:cursor-default disabled:opacity-40 disabled:no-underline"
              >
                Limpiar
              </button>
            </div>
          )}
          <ul id={listId} role="listbox" aria-multiselectable="true">
            {visible.map((o) => (
              <li key={o.value} role="option" aria-selected={chosen.has(o.value)}>
                <label className={`${picklistOptionClass} gap-2.5`}>
                  <input type="checkbox" checked={chosen.has(o.value)} onChange={() => toggle(o.value)} className="h-4 w-4 shrink-0 cursor-pointer accent-surface-secondary" />
                  {o.icon && <span className="shrink-0 text-text-primary [&>svg]:h-6 [&>svg]:w-6">{o.icon}</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{o.label}</span>
                    {o.description && <span className="block font-body text-xs font-normal text-text-secondary">{o.description}</span>}
                  </span>
                  {o.hint && <span className="shrink-0 font-body text-xs text-text-secondary">{o.hint}</span>}
                </label>
              </li>
            ))}
            {visible.length === 0 && <li className="px-3 py-4 text-center font-body text-sm text-text-secondary">Sin resultados</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// ———— Variante «menu»: las acciones ————

function MenuPicklist({ items, label, trigger, triggerStyle = "outline", header, className = "" }: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // A qué ítem enfocar cuando el panel termine de abrirse.
  const focusOnOpen = useRef<"first" | "last">("first");
  const menuId = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);
  const closeQuiet = useCallback(() => setOpen(false), []);
  useCloseOnOutside(open, closeQuiet, rootRef);

  useEffect(() => {
    if (!open) return;
    const index = focusOnOpen.current === "last" ? lastEnabled(items) : firstEnabled(items);
    itemRefs.current[index]?.focus();
    // Solo al abrir: si `items` cambia con el menú abierto no se le quita el foco al ítem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (items.length === 0) return null;

  function onTriggerKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusOnOpen.current = e.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }
  }

  function onMenuKeyDown(e: KeyboardEvent) {
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    const goTo = (index: number) => {
      e.preventDefault();
      if (index >= 0) itemRefs.current[index]?.focus();
    };
    if (e.key === "ArrowDown") goTo(stepEnabled(items, current, 1));
    else if (e.key === "ArrowUp") goTo(stepEnabled(items, current, -1));
    else if (e.key === "Home") goTo(firstEnabled(items));
    else if (e.key === "End") goTo(lastEnabled(items));
    else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") setOpen(false);
  }

  const triggerClass =
    triggerStyle === "ghost"
      ? "inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-lg px-2 font-body text-sm font-semibold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary"
      : "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border-primary px-0 font-body text-sm font-bold text-text-primary transition-colors hover:bg-btn-regular focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-text-primary sm:px-4";

  return (
    <div ref={rootRef} className={`relative ${triggerStyle === "ghost" ? "min-w-0" : "shrink-0"} ${className}`.trim()}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => {
          focusOnOpen.current = "first";
          setOpen((o) => !o);
        }}
        onKeyDown={onTriggerKeyDown}
        className={`${triggerClass} ${open && triggerStyle === "outline" ? "bg-btn-regular" : ""}`}
      >
        {trigger ?? (
          <>
            {/* En el celular solo el ícono (tres puntos); desde `sm`, el texto y la flecha. */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className="sm:hidden">
              <circle cx="4" cy="10" r="1.7" />
              <circle cx="10" cy="10" r="1.7" />
              <circle cx="16" cy="10" r="1.7" />
            </svg>
            <span className="hidden sm:inline">{label}</span>
            <Chevron open={open} className="hidden sm:block" />
          </>
        )}
      </button>

      {open && (
        <div id={menuId} role="menu" aria-label={label} onKeyDown={onMenuKeyDown} className={picklistMenuPanelClass}>
          {header && <div className="border-b border-border-primary px-3 pb-2.5 pt-2">{header}</div>}
          <div className={header ? "pt-1.5" : ""}>
            {items.map((item, i) => {
              const content = (
                <>
                  {item.icon && <span className="shrink-0 text-text-secondary">{item.icon}</span>}
                  <span className="min-w-0 flex-1">{item.label}</span>
                </>
              );
              const itemClass = `${picklistMenuItemClass} ${item.tone === "danger" ? "text-red" : "text-text-primary"}`;
              return (
                <div key={item.key}>
                  {item.separated && i > 0 ? <div role="separator" className="my-1.5 h-px bg-border-primary" /> : null}
                  {item.href && !item.disabled ? (
                    <Link
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      href={item.href}
                      role="menuitem"
                      tabIndex={-1}
                      onClick={() => setOpen(false)}
                      className={itemClass}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      ref={(el) => {
                        itemRefs.current[i] = el;
                      }}
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      disabled={item.disabled}
                      onClick={() => {
                        close(false);
                        item.onSelect?.();
                      }}
                      className={itemClass}
                    >
                      {content}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
