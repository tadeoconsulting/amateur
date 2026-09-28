/** Sube el recorte (ver `avatar-cropper.tsx`) a `/api/upload` y devuelve su URL pública. */
export async function uploadAvatarBlob(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "avatar.png");
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir la imagen");
  return data.url as string;
}
