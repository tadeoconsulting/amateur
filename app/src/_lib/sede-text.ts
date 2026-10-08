// La sede de un torneo (y de sus partidos) se guarda como un solo texto: "Nombre, dirección".
// Lógica pura, sin alias `@/`: la usan el asistente, la API de sedes y las pruebas unitarias.

/** "Cancha Ensenada" + "Av. Perú 123" → "Cancha Ensenada, Av. Perú 123"; sin dirección, solo el nombre. */
export function sedeText(sede: { name: string; address?: string | null }): string {
  const name = sede.name.trim();
  const address = sede.address?.trim();
  return address ? `${name}, ${address}` : name;
}
