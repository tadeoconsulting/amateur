"use client";

import { useState } from "react";
import { saveWizardTournament } from "./save-tournament";
import { useWizard } from "./wizard-context";

/** "Guardar cambios" de las pestañas al editar un torneo: guarda todo y avisa el resultado sin salir de la pantalla. */
export function useEditSave() {
  const { state, tournamentId } = useWizard();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    if (saving) return;
    setSaving(true);
    setMessage(null);
    const result = await saveWizardTournament(state, tournamentId);
    setSaving(false);
    setMessage(result.ok ? { ok: true, text: "Cambios guardados." } : { ok: false, text: result.error });
  }

  return { saving, message, save };
}
