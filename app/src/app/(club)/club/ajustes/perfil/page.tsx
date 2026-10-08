"use client";

import { useEffect, useState } from "react";
import { BackHeader } from "@/_components/back-header";
import { Toast } from "@/_components/toast";
import { useMyClub } from "@/_lib/use-my-club";
import { getClub } from "@/_lib/api";
import { AvatarCropper } from "@/_components/avatar-cropper";
import { uploadAvatarBlob } from "@/_lib/upload-avatar";
import { SHORT_NAME_MAX } from "@/_lib/short-name";

export default function ClubPerfilPage() {
  const { club, loading: loadingClub } = useMyClub();
  const [loading, setLoading] = useState(true);
  const [equipo, setEquipo] = useState("");
  const [nombreCorto, setNombreCorto] = useState("");
  const [color, setColor] = useState("#CCCCCC");
  const [delegadoNombre, setDelegadoNombre] = useState("");
  const [delegadoTel, setDelegadoTel] = useState("");
  const [delegadoEmail, setDelegadoEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loadingClub) return;
    if (!club) { setLoading(false); return; }
    let cancelled = false;
    getClub(club.id)
      .then((c) => {
        if (cancelled) return;
        setEquipo(c.name);
        setNombreCorto(c.shortName);
        setColor(c.color ?? "#CCCCCC");
        setDelegadoNombre(c.delegadoNombre ?? "");
        setDelegadoTel(c.delegadoTel ?? "");
        setDelegadoEmail(c.delegadoEmail ?? "");
        setLogoUrl(c.logoUrl);
      })
      .catch(() => setError("No se pudo cargar el club."))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [club, loadingClub]);

  const handleSave = async () => {
    if (!club || saving) return;
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/clubs/${club.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: equipo.trim(),
          shortName: nombreCorto.trim(),
          color,
          delegadoNombre: delegadoNombre.trim() || null,
          delegadoTel: delegadoTel.trim() || null,
          delegadoEmail: delegadoEmail.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar el club.");
        return;
      }
      setToast("Ajustes del club actualizados.");
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // El logo se guarda al toque, sin esperar a "Completar ajustes del club": es lo que la
  // persona espera al ver "Usar esta foto" (igual que cualquier app de fotos de perfil).
  const handleCropped = async (blob: Blob) => {
    if (!club) return;
    setShowCropper(false);
    setUploadingPhoto(true);
    setError("");
    try {
      const url = await uploadAvatarBlob(blob);
      const res = await fetch(`/api/clubs/${club.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: url }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "No se pudo guardar la foto.");
        return;
      }
      setLogoUrl(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loadingClub || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="w-full pb-8">
        <BackHeader label="Editar ajustes" />
        <p className="px-4 py-12 text-center font-body text-sm text-text-secondary">
          Todavía no tienes un club para editar.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      <BackHeader label="Editar ajustes" />

      {/* Avatar */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-brand-200 bg-white">
            {uploadingPhoto ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            ) : logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa (Vercel Blob), no un asset local
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-brand-400">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <button
            onClick={() => setShowCropper(true)}
            aria-label="Cambiar foto"
            className="absolute -bottom-1 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-2 border-white bg-brand-900"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 17a4 4 0 100-8 4 4 0 000 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <AvatarCropper open={showCropper} onClose={() => setShowCropper(false)} onCropped={handleCropped} />

      {/* Form */}
      <div className="mt-6 space-y-5 px-4">
        {error && <p className="font-body text-sm text-red-600">{error}</p>}

        <div>
          <label className="text-sm text-text-secondary">Equipo</label>
          <input
            type="text"
            value={equipo}
            onChange={(e) => setEquipo(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Nombre corto</label>
          <input
            type="text"
            value={nombreCorto}
            onChange={(e) => setNombreCorto(e.target.value)}
            maxLength={SHORT_NAME_MAX}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Color representativo</label>
          <div className="mt-1 flex items-center gap-3 border-b border-brand-200 py-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
            />
            <span className="text-sm text-text-secondary">Elige un color</span>
          </div>
        </div>

        <div>
          <label className="text-sm text-text-secondary">Nombre del delegado</label>
          <input
            type="text"
            value={delegadoNombre}
            onChange={(e) => setDelegadoNombre(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Número del delegado</label>
          <input
            type="tel"
            value={delegadoTel}
            onChange={(e) => setDelegadoTel(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm text-text-secondary">Correo del delegado</label>
          <input
            type="email"
            value={delegadoEmail}
            onChange={(e) => setDelegadoEmail(e.target.value)}
            className="mt-1 w-full border-b border-brand-200 py-2 text-sm text-text-primary focus:border-brand-900 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full cursor-pointer rounded-xl bg-brand-900 py-3.5 font-heading text-sm font-semibold text-text-invert disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Completar ajustes del club"}
        </button>
      </div>
    </div>
  );
}
