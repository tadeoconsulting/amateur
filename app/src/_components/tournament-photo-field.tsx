"use client";

import { useState } from "react";
import { AvatarCropper } from "@/_components/avatar-cropper";
import { TournamentLogo } from "@/_components/tournament-logo";
import { uploadAvatarBlob } from "@/_lib/upload-avatar";

/**
 * Elegir la foto del torneo: se encuadra en un círculo (`AvatarCropper`), se sube y queda la URL en
 * `value`. Quien la usa decide cuándo guardarla (al crear/editar el torneo). La usan el organizador
 * en el asistente y el admin en su formulario.
 */
export function TournamentPhotoField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [showCropper, setShowCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleCropped(blob: Blob) {
    setShowCropper(false);
    setError("");
    setUploading(true);
    try {
      onChange(await uploadAvatarBlob(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-2 block font-body text-sm text-text-primary">Foto del torneo (opcional)</span>
      <div className="flex items-center gap-3">
        <TournamentLogo logoUrl={value || null} size="h-16 w-16" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowCropper(true)}
            disabled={uploading}
            className="cursor-pointer rounded-lg border border-border-primary px-3 py-2 font-heading text-xs font-semibold text-text-primary transition-colors hover:bg-btn-regular disabled:cursor-wait disabled:opacity-60"
          >
            {uploading ? "Subiendo..." : value ? "Cambiar foto" : "Subir foto"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="cursor-pointer rounded-lg px-3 py-2 font-heading text-xs font-semibold text-text-secondary underline transition-colors hover:text-text-primary"
            >
              Quitar
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 font-body text-xs text-brand-900">
          {error}
        </p>
      )}
      <AvatarCropper open={showCropper} onClose={() => setShowCropper(false)} onCropped={handleCropped} />
    </div>
  );
}
