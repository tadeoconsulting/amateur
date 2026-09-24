"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Sede } from "./crear-sede-modal";
import { useAuth } from "@/lib/auth-context";

// Lo que se completa a lo largo de los tres pasos. Vive en el layout de /crear-torneo,
// así que se conserva al ir y volver entre pasos y se descarta al salir del asistente.
export type WizardState = {
  // Paso 1
  nombre: string;
  fecha: string;
  sede: Sede | null;
  sedes: Sede[];
  // Paso 2
  modalidad: string;
  tipoCompetencia: string;
  genero: string;
  categoria: string;
  cantidadEquipos: number;
  // Paso 3
  minutos: number;
  jugadores: number;
  delegado: boolean;
  costoInscripcion: string;
  costoArbitraje: string;
  condiciones: string[];
  // Solo aplican a eliminación directa, relámpago y copa (ver especificación 007).
  tiempoExtra: number; // minutos de cada tiempo del tiempo extra; 0 = sin definir
  clasificanPorGrupo: number; // solo Copa: 2, 3 o 4
};

const INITIAL: WizardState = {
  nombre: "",
  fecha: "",
  sede: null,
  sedes: [],
  modalidad: "",
  tipoCompetencia: "",
  genero: "",
  categoria: "",
  cantidadEquipos: 0,
  minutos: 0,
  jugadores: 0,
  delegado: false,
  costoInscripcion: "",
  costoArbitraje: "",
  condiciones: [],
  tiempoExtra: 0,
  clasificanPorGrupo: 2,
};

type WizardContextValue = {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
};

const WizardContext = createContext<WizardContextValue | null>(null);

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(INITIAL);
  const update = useCallback((patch: Partial<WizardState>) => setState((prev) => ({ ...prev, ...patch })), []);

  // Crear un torneo es ser organizador. Quien llega directo a /crear-torneo (por ejemplo
  // después de que el proxy lo mandó a iniciar sesión) nunca pasó por "elegir perfil", y
  // sin este rol la API rechaza la creación con 403 justo al final del asistente.
  const { user, addRole } = useAuth();
  useEffect(() => {
    if (user && !user.roles.includes("ORGANIZADOR")) addRole("ORGANIZADOR");
  }, [user, addRole]);

  return <WizardContext.Provider value={{ state, update }}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used within WizardProvider");
  return ctx;
}
