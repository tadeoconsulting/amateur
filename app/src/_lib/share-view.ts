// La vista que se comparte de una pantalla pública de torneo (`/{organizador}/{torneo}`): qué sección se
// está mirando y, dentro de ella, la fecha del fixture o la pestaña de resultados. Va en la URL, así el
// enlace que se comparte abre exactamente donde estaba quien lo compartió. Pura y sin dependencias.

export const FAN_VIEWS = ["fixture", "resultados", "equipos", "detalles"] as const;
export type FanView = (typeof FAN_VIEWS)[number];

export const RESULT_SUBS = ["tabla", "goleadores"] as const;
export type ResultSub = (typeof RESULT_SUBS)[number];

/** Lo que pide una URL (`?vista=resultados&sub=goleadores`); lo inválido se ignora. */
export function parseView(search: string): { vista: FanView | null; sub: ResultSub | null } {
  const params = new URLSearchParams(search);
  const vista = params.get("vista");
  const sub = params.get("sub");
  return {
    vista: (FAN_VIEWS as readonly string[]).includes(vista ?? "") ? (vista as FanView) : null,
    sub: (RESULT_SUBS as readonly string[]).includes(sub ?? "") ? (sub as ResultSub) : null,
  };
}

/**
 * El query con la vista puesta, conservando los demás parámetros (por ejemplo `unirme`). La fecha o la
 * ronda del fixture solo valen en la sección *fixture*; `sub` solo en *resultados*.
 */
export function withView(search: string, view: { vista: FanView; sub?: ResultSub | null }): string {
  const params = new URLSearchParams(search);
  params.delete("vista");
  params.delete("sub");
  params.set("vista", view.vista);
  if (view.vista === "resultados" && view.sub) params.set("sub", view.sub);
  if (view.vista !== "fixture") {
    params.delete("fecha");
    params.delete("ronda");
  }
  return params.toString();
}

/**
 * El query de un enlace para compartir: solo la vista (sección, fecha o ronda, pestaña de resultados),
 * sin nada más — ni `unirme` ni lo de iniciar sesión — para que el enlace sirva a cualquiera.
 */
export function shareSearch(search: string, view: { vista: FanView; sub?: ResultSub | null }): string {
  const source = new URLSearchParams(search);
  const kept = new URLSearchParams();
  kept.set("vista", view.vista);
  if (view.vista === "resultados" && view.sub) kept.set("sub", view.sub);
  if (view.vista === "fixture") {
    for (const key of ["fecha", "ronda"]) {
      const value = source.get(key);
      if (value && /^\d+$/.test(value)) {
        kept.set(key, value);
        break;
      }
    }
  }
  return kept.toString();
}
