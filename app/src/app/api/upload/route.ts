import { put } from "@vercel/blob";
import { type NextRequest } from "next/server";
import { badRequest, requireUser } from "@/_lib/auth";

// Foto de perfil (usuario o club): validada y subida a Vercel Blob. Devuelve la URL pública;
// quien llama es responsable de guardarla (PATCH /api/users/:id o /api/clubs/:id).
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return badRequest("Falta el archivo (file)");
  if (!ALLOWED_TYPES.includes(file.type)) {
    return badRequest(`Tipo de imagen no permitido: usa JPEG, PNG o WebP`);
  }
  if (file.size > MAX_BYTES) {
    return badRequest(`La imagen no puede superar ${MAX_BYTES / (1024 * 1024)}MB`);
  }

  try {
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const blob = await put(`avatars/${auth.user.id}-${Date.now()}.${ext}`, file, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
    });
    return Response.json({ url: blob.url }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "No se pudo subir la imagen" }, { status: 500 });
  }
}
