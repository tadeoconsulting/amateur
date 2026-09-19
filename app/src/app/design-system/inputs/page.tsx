"use client";

import { useState } from "react";

export default function InputsPage() {
  return (
    <>
      <header className="mb-10">
        <p className="text-xs font-semibold tracking-[0.08em] text-verification uppercase">
          Components
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">
          Inputs y selection
        </h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Componentes interactivos importados desde la librería amateur 3.0 (IA).
          Escribí, seleccioná y probá cada control en tiempo real.
        </p>
      </header>

      {/* Text field */}
      <Section title="Text field (variantes)">
        <InteractiveInput label="input / normal" inputLabel="Input regular" placeholder="Contraseña" />
        <InteractiveInput label="input / error" inputLabel="Input con validación" placeholder="Ingresa tu email" validate />
        <InteractiveInput label="inputWhite / normal" inputLabel="Input white" placeholder="Placeholder" variant="white" />
        <InteractiveInput label="icon / upload" inputLabel="Upload" placeholder="Seleccionar archivo" icon="upload" />
        <InteractiveColorInput />
      </Section>

      {/* Select */}
      <Section title="Select">
        <InteractiveSelect />
      </Section>

      {/* Date picker */}
      <Section title="Date picker">
        <InteractiveDatePicker />
      </Section>

      {/* Input base */}
      <Section title="Input base">
        <InteractivePasswordInput />
      </Section>

      {/* Switch / Radio / Checkbox */}
      <Section title="Switch / Radio / Checkbox">
        <InteractiveSwitch />
        <InteractiveRadio />
      </Section>

      {/* Cantidad de jugadores */}
      <Section title="Cantidad de jugadores">
        <InteractiveQuantity />
      </Section>

      {/* Selección de categoría / torneo */}
      <Section title="Selección de categoría / torneo">
        <InteractiveTorneoSelect />
      </Section>

      {/* States reference */}
      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">
          Estados
        </h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-brand-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-brand-200 text-[10px] text-text-secondary uppercase tracking-wider">
                <th className="px-4 py-2.5 font-medium">Estado</th>
                <th className="px-4 py-2.5 font-medium">Border</th>
                <th className="px-4 py-2.5 font-medium">Color indicador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-200 text-xs">
              {[
                ["Normal", "1px brand-200", "—"],
                ["Focus", "2px border-primary (#1B1B1B)", "Negro"],
                ["Error", "2px error (#FF6363)", "Rojo"],
                ["Disabled", "1px brand-200, opacity 0.6", "—"],
              ].map(([state, border, color]) => (
                <tr key={state}>
                  <td className="px-4 py-2.5 font-medium text-text-primary">{state}</td>
                  <td className="px-4 py-2.5 font-mono text-text-secondary">{border}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{color}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function InteractiveInput({
  label,
  inputLabel,
  placeholder,
  validate,
  variant,
  icon,
}: {
  label: string;
  inputLabel: string;
  placeholder: string;
  validate?: boolean;
  variant?: "white";
  icon?: "upload";
}) {
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const hasError = validate && touched && value.length > 0 && !value.includes("@");
  const bgClass = variant === "white" ? "bg-white" : "bg-btn-regular";

  return (
    <Variant label={label}>
      <div className="w-full">
        <label className="text-xs font-medium text-text-primary">{inputLabel}</label>
        <div className={`mt-1 flex items-center rounded transition-all ${bgClass} ${
          hasError
            ? "border-2 border-error"
            : "border border-brand-200 focus-within:border-2 focus-within:border-border-primary"
        }`}>
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => setTouched(true)}
            className={`w-full bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none`}
          />
          {icon === "upload" && (
            <div className="pr-3">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M17 13v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3M10 3v10M6 7l4-4 4 4" stroke={hasError ? "#FF6363" : "#6D6D6D"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
        {hasError && <p className="mt-1 text-xs text-error">Ingresa un email válido (debe contener @)</p>}
      </div>
    </Variant>
  );
}

function InteractiveColorInput() {
  const [color, setColor] = useState("#00CA81");

  return (
    <Variant label="color / interactive">
      <div className="w-full">
        <label className="text-xs font-medium text-text-primary">Selection color</label>
        <div className="mt-1 flex items-center gap-2 rounded border border-brand-200 bg-btn-regular px-3 py-2 focus-within:border-2 focus-within:border-border-primary">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
          />
          <span className="font-mono text-sm text-text-primary">{color.toUpperCase()}</span>
        </div>
      </div>
    </Variant>
  );
}

function InteractiveSelect() {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  return (
    <Variant label="select / interactive">
      <div className="w-full">
        <label className="text-xs font-medium text-text-primary">Formato del torneo</label>
        <div className={`mt-1 rounded transition-all ${
          error
            ? "border-2 border-error"
            : "border border-brand-200 focus-within:border-2 focus-within:border-border-primary"
        }`}>
          <select
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            onBlur={() => { if (!value) setError(true); }}
            className="w-full appearance-none bg-btn-regular px-3 py-2.5 text-sm text-text-primary focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%236D6D6D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
          >
            <option value="">Seleccionar...</option>
            <option value="liga">Liga</option>
            <option value="eliminacion">Eliminación directa</option>
            <option value="grupos">Grupos + Eliminación</option>
          </select>
        </div>
        {error && <p className="mt-1 text-xs text-error">Selecciona un formato de torneo</p>}
        {value && <p className="mt-1 text-xs text-verification">Seleccionado: {value}</p>}
      </div>
    </Variant>
  );
}

function InteractiveDatePicker() {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <Variant label="date / interactive">
      <div className="w-full">
        <label className="text-xs font-medium text-text-primary">Fecha del reto</label>
        <div className="mt-1 flex gap-2">
          <select
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="flex-1 appearance-none rounded border border-brand-200 bg-btn-regular px-3 py-2.5 text-sm text-text-primary focus:border-2 focus:border-border-primary focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%236D6D6D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
          >
            <option value="">Día</option>
            {days.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="flex-1 appearance-none rounded border border-brand-200 bg-btn-regular px-3 py-2.5 text-sm text-text-primary focus:border-2 focus:border-border-primary focus:outline-none"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='14' height='14' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M5 7.5L10 12.5L15 7.5' stroke='%236D6D6D' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
          >
            <option value="">Mes</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        {day && month ? (
          <p className="mt-1 text-xs text-verification">Fecha seleccionada: {day} de {month}</p>
        ) : (
          <p className="mt-1 text-xs text-text-secondary">Selecciona una fecha no mayor a 4 meses</p>
        )}
      </div>
    </Variant>
  );
}

function InteractivePasswordInput() {
  const [value, setValue] = useState("");
  const [visible, setVisible] = useState(false);
  const hasError = value.length > 0 && value.length < 6;

  return (
    <Variant label="base / interactive">
      <div className="w-full">
        <div className={`flex items-center rounded transition-all ${
          hasError
            ? "border-2 border-error"
            : "border border-brand-200 focus-within:border-2 focus-within:border-border-primary"
        } bg-btn-regular`}>
          <input
            type={visible ? "text" : "password"}
            placeholder="Contraseña"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
          />
          <button
            onClick={() => setVisible(!visible)}
            className="pr-3 text-text-secondary transition-colors hover:text-text-primary"
            type="button"
          >
            {visible ? (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 17L17 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
        {hasError && <p className="mt-1 text-xs text-error">Mínimo 6 caracteres ({value.length}/6)</p>}
        {value.length >= 6 && <p className="mt-1 text-xs text-verification">Contraseña válida</p>}
      </div>
    </Variant>
  );
}

function InteractiveSwitch() {
  const [on, setOn] = useState(false);

  return (
    <Variant label={`switch / ${on ? "on" : "off"}`}>
      <button
        onClick={() => setOn(!on)}
        className={`flex h-[26px] w-[60px] items-center rounded-full p-[3px] transition-colors ${
          on ? "justify-end bg-verification" : "justify-start bg-brand-200"
        }`}
      >
        <div className="h-5 w-5 rounded-full bg-white shadow transition-all" />
      </button>
    </Variant>
  );
}

function InteractiveRadio() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Variant label={`radio / ${selected ?? "none"}`}>
      <div className="flex items-center gap-6">
        {["Masculino", "Femenino", "Mixto"].map((opt) => (
          <button
            key={opt}
            onClick={() => setSelected(opt)}
            className="flex items-center gap-2"
          >
            <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
              selected === opt ? "border-verification" : "border-brand-500"
            }`}>
              {selected === opt && (
                <div className="h-2.5 w-2.5 rounded-full bg-verification" />
              )}
            </div>
            <span className="text-xs text-text-primary">{opt}</span>
          </button>
        ))}
      </div>
    </Variant>
  );
}

function InteractiveQuantity() {
  const [count, setCount] = useState(12);
  const min = 6;
  const max = 32;
  const atMin = count <= min;
  const atMax = count >= max;

  return (
    <Variant label={`quantity / ${atMin ? "minimum" : atMax ? "maximum" : "validate"}`}>
      <div className="w-full">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-text-primary">Cantidad de</p>
            <p className="text-xs font-medium text-text-primary">jugadores por equipo</p>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => setCount(Math.max(min, count - 1))}
              className={`flex h-8 w-8 items-center justify-center rounded-l border transition-colors ${
                atMin
                  ? "border-error bg-white text-error"
                  : "border-border-primary bg-white text-text-primary hover:bg-brand-300 active:bg-brand-200"
              }`}
            >
              <span className="text-lg leading-none">−</span>
            </button>
            <div className={`flex h-8 w-10 items-center justify-center border-y text-sm font-medium transition-colors ${
              atMin || atMax ? "border-error bg-white text-error" : "border-border-primary bg-white text-text-primary"
            }`}>
              {count}
            </div>
            <button
              onClick={() => setCount(Math.min(max, count + 1))}
              className={`flex h-8 w-8 items-center justify-center rounded-r border transition-colors ${
                atMax
                  ? "border-error bg-white text-error"
                  : "border-border-primary bg-white text-text-primary hover:bg-brand-300 active:bg-brand-200"
              }`}
            >
              <span className="text-lg leading-none">+</span>
            </button>
          </div>
        </div>
        {atMin && <p className="mt-1 text-right text-xs text-error">Requieres de un mínimo de {min} jugadores.</p>}
        {atMax && <p className="mt-1 text-right text-xs text-error">Has llegado al máximo de {max} jugadores por equipo.</p>}
        {!atMin && !atMax && <p className="mt-1 text-right text-xs text-verification">{count} jugadores seleccionados</p>}
      </div>
    </Variant>
  );
}

function InteractiveTorneoSelect() {
  const [selected, setSelected] = useState<number | null>(null);

  const torneos = [
    { name: "Copa Comunidad Futbolera", cat: "Categoría Sub 15 · Femenino" },
    { name: "Liga Primavera 2025", cat: "Categoría Libre · Masculino" },
    { name: "Torneo Apertura 2026", cat: "Categoría Sub 20 · Mixto" },
  ];

  return (
    <>
      {torneos.map((t, i) => {
        const isSelected = selected === i;
        return (
          <Variant key={i} label={isSelected ? "torneoSelect / yes" : "torneoSelect / no"}>
            <button
              onClick={() => setSelected(isSelected ? null : i)}
              className={`flex w-full items-center gap-3 rounded-lg p-3 transition-all ${
                isSelected ? "bg-surface-secondary" : "border border-brand-200 bg-white hover:border-border-primary"
              }`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                isSelected ? "bg-brand-700" : "bg-brand-300"
              }`}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L4 5.5v5L10 14l6-3.5v-5L10 2z" stroke={isSelected ? "#FAFAFA" : "#1B1B1B"} strokeWidth="1.2" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className={`text-sm font-semibold ${isSelected ? "text-text-invert" : "text-text-primary"}`}>
                  {t.name}
                </p>
                <p className={`text-xs ${isSelected ? "text-brand-500" : "text-text-secondary"}`}>
                  {t.cat}
                </p>
              </div>
              {isSelected ? (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M16 4L8 16L4 11" stroke="#00CA81" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M7.5 4L13.5 10L7.5 16" stroke="#6D6D6D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          </Variant>
        );
      })}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="mb-4 font-heading text-xl font-bold text-text-primary">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Variant({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-brand-200 bg-white p-4">
      <div className="flex min-h-[42px] w-full max-w-[380px] items-center justify-center rounded-lg bg-brand-100 p-3">
        {children}
      </div>
      <code className="shrink-0 rounded bg-brand-300 px-2 py-1 text-xs text-text-secondary">
        {label}
      </code>
    </div>
  );
}
