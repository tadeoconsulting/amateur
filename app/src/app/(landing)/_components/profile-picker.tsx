"use client";

import { useId } from "react";
import { Field } from "@/_components/field";
import { Picklist } from "@/_components/picklist";
import { PROFILES, type ProfileRole } from "@/lib/profiles";

/**
 * El selector de perfiles del registro («¿Cómo vas a usar Amateur?»). No es un desplegable propio: arma las opciones (con su ícono
 * y descripción) y las pasa al desplegable único `Picklist`, en su variante `multi` y con el panel en el flujo de la página para
 * que no lo corte el scroll del modal.
 */
export function ProfilePicker({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: ProfileRole[];
  onChange: (value: ProfileRole[]) => void;
}) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} help={hint} className="mt-1">
      <Picklist
        variant="multi"
        id={id}
        inline
        clearable={false}
        options={PROFILES.map((p) => ({ value: p.role, label: p.label, description: p.description, icon: p.icon }))}
        selected={value}
        onChange={(next) => onChange(next as ProfileRole[])}
        allLabel={placeholder}
        noun="perfiles"
        summarize={(chosen) => (chosen.length === 0 ? placeholder : chosen.map((c) => c.label).join(", "))}
      />
    </Field>
  );
}
