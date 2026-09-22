/**
 * Comparte un link. En el celular abre el menú del sistema (WhatsApp, etc.); si no
 * existe, o falla, lo copia al portapapeles. Devuelve qué pasó para avisar a la persona.
 */
export async function shareLink(input: { title: string; text: string; url: string }): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share(input);
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled"; // cerró el menú
    }
  }
  try {
    await navigator.clipboard.writeText(input.url);
    return "copied";
  } catch {
    return "failed";
  }
}
