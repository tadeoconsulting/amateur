// Tab elegido en la dirección (`?tab=jugadores`): lógica pura, sin React, para probarla con node:test (especificación 023).
// Sirve para que un tab se pueda compartir, sobreviva a recargar y se pueda volver a él desde una pantalla de detalle.

/** El tab pedido en `search` (`?tab=…`) si es uno de los válidos; si no, `fallback`. */
export function tabFromSearch<K extends string>(search: string, valid: readonly K[], fallback: K): K {
  const pedido = new URLSearchParams(search).get("tab");
  return valid.find((k) => k === pedido) ?? fallback;
}

/** La misma dirección con el tab elegido: el resto de los parámetros se conserva; el tab por omisión no ensucia la dirección. */
export function withTab(search: string, tab: string, fallback: string): string {
  const params = new URLSearchParams(search);
  if (tab === fallback) params.delete("tab");
  else params.set("tab", tab);
  const query = params.toString();
  return query ? `?${query}` : "";
}
