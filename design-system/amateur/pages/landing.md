# Landing Page — Design Override

Overrides MASTER.md for the landing page only.

## Style Direction

**Kinetic / Motion-Driven** sobre base Crono DS. La landing tiene personalidad más deportiva que el app interno.

## Color Override

Base Crono DS + acentos fútbol:

| Token | Hex | Uso |
|-------|-----|-----|
| --color-field-green | #00CA81 | Acento principal (ya en Crono DS) |
| --color-field-dark | #00A868 | Verde campo más oscuro para gradientes |
| --color-field-light | #E6FFF5 | Fondo tinted para secciones claras |
| --color-surface-secondary | #1B1B1B | Secciones oscuras "premium sport" |
| --color-surface-primary | #FAFAFA | Secciones claras |
| --color-yellow | #F8E294 | Acentos energéticos secundarios |

## Typography

- **Headings**: Lexend (ya configurada en layout.tsx) — bold, tight tracking
- **Body**: Lato (ya configurada) — clean readability
- **Display sizes**: 48-72px mobile, 64-96px desktop (oversize para impacto)

## Motion Spec

| Elemento | Tipo | Duración | Easing |
|----------|------|----------|--------|
| Hero elements | Stagger fade-in | 300-500ms | ease-out |
| Marquee | Infinite scroll | 20-30s loop | linear |
| Feature cards | Scroll reveal | 350ms | power1.out |
| Stats counters | Count up | 1500ms | ease-out |
| Floating SVGs | Continuous float | 3-6s | ease-in-out |
| Parallax layers | Scroll-tied | scrub | linear |

Respetar `prefers-reduced-motion`: desactivar marquee, parallax y floating. Mantener fade-in estáticos.

## Visual Language — Fútbol

Elementos SVG/CSS que evocan fútbol sin usar fotos:
- **Líneas de campo**: center circle, penalty area, corner arcs como elementos decorativos
- **Balón**: ícono SVG estilizado
- **Texturas**: patrón sutil de césped con gradiente verde
- **Métricas**: goles, tarjetas, minutos — tratados como data points

## Sections

1. **Hero** — Headline + sub + CTA + SVG campo/balón animado + marquee de features
2. **Features** — 4 cards (Organizador, Club, Jugador, Fan) con íconos SVG
3. **How it works** — 3 pasos visuales con líneas de campo como conectores
4. **Stats** — Números animados (counter up) sobre fondo oscuro
5. **CTA final** — Repetición del call to action sobre fondo campo verde

## Responsive

| Breakpoint | Layout |
|------------|--------|
| < 640px | Single column, hero stacked, cards vertical |
| 640-1024px | 2-col feature grid |
| > 1024px | Full layout, parallax activo, marquee visible |
