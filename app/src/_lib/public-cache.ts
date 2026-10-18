// Caché de borde de las lecturas públicas (OBS-58). Lógica pura, sin Next ni Prisma: la usan las rutas de la API y las
// pruebas.
//
// Un partido con miles de espectadores hace que cada gol dispare, por cada uno, la misma lectura (partidos, tabla,
// goleadores). Sin caché, todas llegan a la base. Las pantallas públicas piden sus lecturas con `?pub=1`: solo
// entonces la API deja que el borde (CDN) las guarde unos segundos y las atienda de ahí. Quien no manda `pub=1`
// (organizador, club, jugador, pruebas) recibe lo de siempre, al momento y sin caché, así que una edición se ve en
// el acto en sus pantallas.
//
// Para que un gol se vea de inmediato aunque haya caché, el aviso en vivo lleva una versión (`v`) y todos los
// espectadores piden la lectura con esa misma `v`: es una dirección nueva, no está en caché, y las miles de
// consultas iguales se resuelven con una sola ida a la base. La API ignora `v`: solo cambia la clave de caché.

/** El nombre del parámetro con el que una pantalla pública pide una lectura que puede guardarse en caché. */
export const PUBLIC_READ_PARAM = "pub";
/** El parámetro con la versión del último aviso en vivo; solo diferencia la clave de caché. */
export const VERSION_PARAM = "v";

/**
 * Cuánto guarda el borde una lectura pública. Corto a propósito: quien abre la pantalla justo después de un gol, sin
 * haber recibido el aviso, puede ver hasta estos segundos de retraso. `max-age=0`: el navegador sí vuelve a preguntar.
 */
export const PUBLIC_CACHE_SECONDS = 3;
export const PUBLIC_CACHE_CONTROL = `public, max-age=0, s-maxage=${PUBLIC_CACHE_SECONDS}, must-revalidate`;

/** ¿Es una lectura de una pantalla pública (`?pub=1`)? Acepta la URL completa o solo su query. */
export function isPublicRead(urlOrSearch: string): boolean {
  const query = urlOrSearch.includes("?") ? urlOrSearch.slice(urlOrSearch.indexOf("?") + 1) : urlOrSearch;
  return new URLSearchParams(query).get(PUBLIC_READ_PARAM) === "1";
}

/**
 * Los encabezados de una respuesta exitosa: con `?pub=1` se puede guardar en el borde; sin él, no cambia nada
 * (queda el comportamiento de siempre). Las respuestas de error no deben pasar por acá.
 */
export function publicCacheHeaders(urlOrSearch: string): Record<string, string> {
  return isPublicRead(urlOrSearch) ? { "Cache-Control": PUBLIC_CACHE_CONTROL } : {};
}

/**
 * Agrega a una ruta de la API lo que hace falta para pedirla como pantalla pública: `pub=1` y, si ya llegó un aviso
 * en vivo, su versión. `version` 0 = todavía no llegó ninguno (primera carga: sin `v`).
 */
export function withPublicRead(path: string, version = 0): string {
  const hash = path.indexOf("#");
  const base = hash === -1 ? path : path.slice(0, hash);
  const tail = hash === -1 ? "" : path.slice(hash);
  const [pathname, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  params.set(PUBLIC_READ_PARAM, "1");
  if (version > 0) params.set(VERSION_PARAM, String(version));
  return `${pathname}?${params.toString()}${tail}`;
}
