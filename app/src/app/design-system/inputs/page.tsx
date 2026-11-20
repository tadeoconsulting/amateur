"use client";

import { useState, type ReactNode } from "react";
import { DatePicker } from "@/_components/date-picker";
import { Field } from "@/_components/field";
import { fieldBox, fieldInvalidStates, fieldStates, picklistOptionClass, picklistPanelClass } from "@/_components/field-styles";
import { Label, labelText } from "@/_components/label";
import { PasswordInput } from "@/_components/password-input";
import { Picklist } from "@/_components/picklist";
import { TextArea, TextField } from "@/_components/text-field";
import { TimePicker } from "@/_components/time-picker";

// Esta página usa los componentes REALES de la plataforma, no copias: lo que se ve aquí es lo que se ve en el organizador, el
// administrador, el club, el jugador y el acceso. Si se cambia un campo, se cambia en `src/_components/` y esta página lo refleja;
// si se agrega un componente de formulario, hay que mostrarlo aquí (una prueba lo vigila). Especificación 022.

const FORMATOS = [
  { value: "liga", label: "Liga (todos contra todos)" },
  { value: "copa", label: "Copa (eliminación directa)" },
  { value: "grupos", label: "Fase de grupos y llaves" },
  { value: "relampago", label: "Relámpago", disabled: true },
];

const SEDES = ["Estadio Central", "Parque Zonal", "Complejo Norte", "Cancha Municipal", "Polideportivo Sur", "Campo Deportivo Este", "Club Atlético", "Estadio Sur"].map((s) => ({
  value: s,
  label: s,
}));

function Seccion({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <section className="mt-14">
      <h2 className="font-heading text-xl font-bold text-text-primary">{titulo}</h2>
      {descripcion && <p className="mt-1 max-w-xl font-body text-sm text-text-secondary">{descripcion}</p>}
      <div className="mt-5 grid gap-6 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function InputsPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [formato, setFormato] = useState("");
  const [formatoLiga, setFormatoLiga] = useState("liga");
  const [sede, setSede] = useState("");
  const [fecha, setFecha] = useState<Date | null>(null);
  const [hora, setHora] = useState<string | null>(null);
  const [clave, setClave] = useState("");
  const [notas, setNotas] = useState("");


  return (
    <>
      <header className="mb-10">
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.08em] text-verification">Components</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-text-primary">Campos, selectores y desplegables</h1>
        <p className="mt-3 max-w-xl font-body text-base leading-relaxed text-text-secondary">
          Un solo estilo para todos los campos de la plataforma. Cada control de esta página es el componente real: pruébalo con el
          ratón, el teclado y el dedo. Medidas: radio de 8 px, relleno de 12 px (alto de unos 46 px en escritorio y 50 px en el celular), letra de 16 px en el celular y 14 px desde 768 px.
        </p>
      </header>

      <Seccion titulo="Etiqueta y campo de texto" descripcion="Field junta la etiqueta (DM Sans, 14 px, peso 600), el control y la ayuda o el error.">
        <Field label="Nombre del torneo" htmlFor="ds-nombre">
          <TextField id="ds-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ingresar nombre" />
        </Field>
        <Field label="Correo del delegado" htmlFor="ds-correo" optional help="Le enviaremos la invitación.">
          <TextField id="ds-correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="nombre@correo.com" />
        </Field>
        <Field label="Con error" htmlFor="ds-error" error="Ingresa un correo válido (debe contener @).">
          <TextField id="ds-error" defaultValue="ana" />
        </Field>
        <Field label="Deshabilitado" htmlFor="ds-off">
          <TextField id="ds-off" defaultValue="No se puede editar" disabled />
        </Field>
        <Field label="Con ícono" htmlFor="ds-icono">
          <TextField
            id="ds-icono"
            defaultValue="Estadio Central"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
              </svg>
            }
          />
        </Field>
        <Field label="Notas" htmlFor="ds-notas" optional>
          <TextArea id="ds-notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Escribe aquí" />
        </Field>
      </Seccion>

      <Seccion titulo="Contraseña" descripcion="Con el botón para verla u ocultarla; mismo campo y mismos estados.">
        <Field label="Contraseña nueva" htmlFor="ds-clave" help="Mínimo 8 caracteres, con una mayúscula.">
          <PasswordInput id="ds-clave" autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} placeholder="••••••••" />
        </Field>
      </Seccion>

      <Seccion
        titulo="Selector (Picklist)"
        descripcion="Reemplaza al select nativo. Teclado: ↓ ↑ abren y mueven, Inicio y Fin saltan, Enter o Espacio eligen, Escape cierra, y al escribir salta a la opción."
      >
        <Field label="Formato del torneo" htmlFor="ds-formato">
          <Picklist id="ds-formato" value={formato} onChange={setFormato} options={FORMATOS} placeholder="Elige un formato" />
        </Field>
        <Field label="Con valor elegido" htmlFor="ds-formato2">
          <Picklist id="ds-formato2" value={formatoLiga} onChange={setFormatoLiga} options={FORMATOS} />
        </Field>
        <Field label="Con error" htmlFor="ds-formato3" error="Selecciona un formato de torneo.">
          <Picklist id="ds-formato3" value="" onChange={() => {}} options={FORMATOS} placeholder="Elige un formato" />
        </Field>
        <Field label="Deshabilitado" htmlFor="ds-formato4">
          <Picklist id="ds-formato4" value="copa" onChange={() => {}} options={FORMATOS} disabled />
        </Field>
        <Field label="Lista larga (se desplaza)" htmlFor="ds-sede" className="sm:col-span-2">
          <Picklist id="ds-sede" value={sede} onChange={setSede} options={SEDES} placeholder="Elige una sede" />
        </Field>
      </Seccion>

      <Seccion titulo="Fecha y hora" descripcion="Los selectores de fecha y de hora usan la misma caja.">
        <Field label="Fecha de inicio" htmlFor="ds-fecha">
          <DatePicker value={fecha} onChange={setFecha} placeholder="dd/mm/aaaa" />
        </Field>
        <Field label="Hora" htmlFor="ds-hora">
          <TimePicker value={hora} onChange={setHora} placeholder="--:--" />
        </Field>
      </Seccion>

      <section className="mt-14">
        <h2 className="font-heading text-xl font-bold text-text-primary">Tokens (salen del código)</h2>
        <p className="mt-1 max-w-xl font-body text-sm text-text-secondary">
          Estas son las clases exactas de <code className="font-mono text-xs">field-styles.ts</code> y de <code className="font-mono text-xs">label.tsx</code>.
          Se muestran tal como están en el código: si cambian allí, cambian aquí.
        </p>
        <dl className="mt-5 space-y-4 font-mono text-xs text-text-secondary">
          {[
            ["Etiqueta (labelText)", labelText],
            ["Caja del campo (fieldBox)", fieldBox],
            ["Estados normales (fieldStates)", fieldStates],
            ["Estado con error (fieldInvalidStates)", fieldInvalidStates],
            ["Panel del selector (picklistPanelClass)", picklistPanelClass],
            ["Opción del selector (picklistOptionClass)", picklistOptionClass],
          ].map(([nombre, clases]) => (
            <div key={nombre} className="rounded-lg border border-border-primary p-3">
              <dt className="font-body text-sm font-semibold text-text-primary">{nombre}</dt>
              <dd className="mt-1 break-words">{clases}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Label as="span">Ejemplo de etiqueta</Label>
          <span className="font-body text-sm text-text-secondary">DM Sans · 14 px · 600</span>
        </div>
      </section>
    </>
  );
}
