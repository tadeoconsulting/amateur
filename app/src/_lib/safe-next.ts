/**
 * Solo se acepta un destino interno ("/algo"), nunca una URL externa ("//sitio.com" o
 * "/\sitio.com"): evita que un link de `?next=` mande a la persona a otro sitio.
 */
export function safeInternalPath(next: string | null | undefined, fallback: string): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : fallback;
}
