import Link from "next/link";

interface Screen {
  path: string;
  name: string;
  description: string;
  figmaNode?: string;
  status: "done" | "wip" | "pending";
}

const screens: Screen[] = [
  // === Onboarding & Auth ===
  {
    path: "/onboarding",
    name: "Onboarding",
    description: "Carousel de bienvenida con 3 slides, botones de login y registro",
    figmaNode: "4375:11765",
    status: "done",
  },
  {
    path: "/login",
    name: "Login",
    description: "Inicio de sesión con Google o email, términos legales y recuperar contraseña",
    figmaNode: "4372:18839",
    status: "done",
  },
  {
    path: "/seleccion-perfil",
    name: "Selección de perfil",
    description: "Pantalla para elegir tipo de perfil: organizador, club o jugador",
    status: "done",
  },
  // === Torneos ===
  {
    path: "/torneos",
    name: "Mis torneos",
    description: "Dashboard con LiveMatchBar, torneos activos y torneos del organizador agrupados por estado",
    status: "done",
  },
  {
    path: "/torneos/todos",
    name: "Mis torneos - Lista",
    description: "Lista completa de torneos del organizador con filtro por estado",
    status: "done",
  },
  {
    path: "/torneos/t1",
    name: "Torneo - Partidos",
    description: "Detalle de torneo: selector de torneo, sub-tabs (Partidos/Llaves/Tabla/Goleadores), match cards por grupo",
    figmaNode: "2517:5957",
    status: "done",
  },
  {
    path: "/torneos/t1",
    name: "Torneo - Tabla",
    description: "Tab Tabla: tabla de posiciones de 8 equipos con indicadores de clasificacion/descenso y leyenda",
    figmaNode: "2517:6333",
    status: "done",
  },
  {
    path: "/torneos/t1",
    name: "Torneo - Goleadores",
    description: "Tab Goleadores: top 10 goleadores con primer lugar destacado y conteo de goles",
    figmaNode: "2796:11687",
    status: "done",
  },
  {
    path: "/torneos/t2",
    name: "Torneo - Convocatoria",
    description: "Torneo en estado de inscripcion: tabs Inscritos/Solicitudes/Invitados con empty state y agregar equipo",
    status: "done",
  },
  // === Crear torneo ===
  {
    path: "/crear-torneo",
    name: "Crear torneo - Paso 1",
    description: "Formulario de creacion: nombre, deporte, formato, genero, categoria",
    status: "done",
  },
  {
    path: "/crear-torneo/paso-2",
    name: "Crear torneo - Paso 2",
    description: "Configuracion de equipos, fechas y ubicacion del torneo",
    status: "done",
  },
  {
    path: "/crear-torneo/paso-3",
    name: "Crear torneo - Paso 3",
    description: "Reglas del torneo y confirmacion final",
    status: "done",
  },
  // === Agregar equipo ===
  {
    path: "/torneos/t2/agregar-equipo",
    name: "Agregar equipo",
    description: "Opciones para agregar equipo al torneo: buscar existente o crear nuevo",
    status: "done",
  },
  {
    path: "/torneos/t2/agregar-equipo/buscar",
    name: "Agregar equipo - Buscar",
    description: "Busqueda de equipos existentes para vincular al torneo",
    status: "done",
  },
  {
    path: "/torneos/t2/agregar-equipo/crear",
    name: "Agregar equipo - Crear",
    description: "Formulario para crear un nuevo equipo y agregarlo al torneo",
    status: "done",
  },
  // === Fixture ===
  {
    path: "/torneos/t4/iniciar",
    name: "Iniciar torneo",
    description: "Pantalla para iniciar el fixture del torneo con opciones de programacion automatica o manual",
    figmaNode: "5053:19318",
    status: "done",
  },
  {
    path: "/torneos/t1/fixture",
    name: "Fixture automático",
    description: "Configuracion de fixture automatico con fechas y horarios generados",
    status: "done",
  },
  {
    path: "/torneos/t1/manual",
    name: "Fixture manual",
    description: "Configuracion manual del fixture partido por partido",
    status: "done",
  },
  {
    path: "/torneos/t1/partidos",
    name: "Fixture - Partidos",
    description: "Lista de partidos del fixture con carousel de proximos y resultados por grupo",
    figmaNode: "2796:10344",
    status: "done",
  },
  // === Partidos ===
  {
    path: "/partidos",
    name: "Partidos - Hub",
    description: "Hub central del organizador: todos los partidos agrupados por estado (en vivo, proximos, finalizados)",
    status: "done",
  },
  {
    path: "/torneos/t1/configurar/m1",
    name: "Configurar partido",
    description: "Configuracion de partido: convocatoria, arbitros y sede",
    status: "done",
  },
  {
    path: "/torneos/t1/partido/m6",
    name: "Partido - Previo",
    description: "Detalle de partido programado con countdown, ilustracion y mensaje de espera",
    figmaNode: "2796:10846",
    status: "done",
  },
  {
    path: "/torneos/t1/en-vivo/m6",
    name: "En vivo - Gestión",
    description: "Gestión del partido en vivo: cronometro, marcador, registro de goles/tarjetas/cambios con lista de jugadores",
    figmaNode: "4928:27555",
    status: "done",
  },
  {
    path: "/torneos/t1/resultado/m1",
    name: "Resultado",
    description: "Timeline de eventos del partido finalizado: goles, tarjetas, cambios con cards de color",
    figmaNode: "2522:6200",
    status: "done",
  },
  // === Jugadores ===
  {
    path: "/jugadores",
    name: "Jugadores - Home",
    description: "Lista de categorias de jugadores con tabs de genero (Masculino/Femenino/Mixto) y bottom nav",
    figmaNode: "4922:30651",
    status: "done",
  },
  {
    path: "/jugadores/cat-sub15",
    name: "Jugadores - Categoria",
    description: "Lista de jugadores por categoria con checkboxes, verificacion, boton Agregar y acciones Liberar/Asignar",
    figmaNode: "2816:20389",
    status: "done",
  },
  {
    path: "/jugadores/cat-sin",
    name: "Jugadores - Sin categoria",
    description: "Lista sin categoria con banner informativo, tabs genero, dialogs de liberar y asignar",
    figmaNode: "4956:38084",
    status: "done",
  },
  {
    path: "/jugadores/invitar",
    name: "Jugadores - Invitar",
    description: "Buscar talento en la comunidad y compartir link por WhatsApp",
    figmaNode: "9304:31900",
    status: "done",
  },
  {
    path: "/jugadores/buscar",
    name: "Jugadores - Buscar",
    description: "Busqueda de jugadores con resultados recientes y boton Invitar",
    figmaNode: "9304:31996",
    status: "done",
  },
  // === Ajustes ===
  {
    path: "/ajustes",
    name: "Ajustes",
    description: "Menu de configuracion: Mi Perfil, Mis sedes, Centro de ayuda, legales y cerrar sesion",
    figmaNode: "4845:28748",
    status: "done",
  },
  {
    path: "/ajustes/perfil",
    name: "Ajustes - Perfil",
    description: "Formulario de perfil del organizador: nombre, organizacion, telefono, correo",
    figmaNode: "2958:23192",
    status: "done",
  },
  {
    path: "/ajustes/sedes",
    name: "Ajustes - Mis sedes",
    description: "Lista de sedes del organizador con opcion de agregar nueva sede",
    figmaNode: "4830:27948",
    status: "done",
  },
  {
    path: "/ajustes/sedes/agregar",
    name: "Ajustes - Agregar sede",
    description: "Formulario para crear nueva sede: nombre, ciudad, ubicacion, referencia",
    figmaNode: "4830:27948",
    status: "done",
  },
  // === Notificaciones ===
  {
    path: "/notificaciones",
    name: "Notificaciones",
    description: "Lista de notificaciones del organizador con titulo, descripcion y fecha",
    figmaNode: "2979:40784",
    status: "done",
  },
  // === Design System & Legales ===
  {
    path: "/design-system",
    name: "Crono DS",
    description: "Design system en línea: color, tipografía, tokens, buttons, inputs y referencia completa",
    status: "done",
  },
  {
    path: "/ayuda",
    name: "Centro de ayuda",
    description: "FAQ con tabs de categoría y preguntas accordion expandibles/colapsables",
    figmaNode: "9374:34852",
    status: "done",
  },
  {
    path: "/terminos",
    name: "Términos y condiciones",
    description: "Página legal con términos de uso de la plataforma",
    figmaNode: "9374:34867",
    status: "done",
  },
  {
    path: "/privacidad",
    name: "Políticas de privacidad",
    description: "Página legal con política de privacidad y tratamiento de datos",
    figmaNode: "9374:34873",
    status: "done",
  },
  // === Club — Torneos ===
  {
    path: "/club/torneos",
    name: "Club - Mis torneos",
    description: "Tabs Mis torneos/Solicitudes, sub-tabs Libre/Sub 18, cards de torneo con logo/nombre/ubicación/formato",
    figmaNode: "2517:5025",
    status: "done",
  },
  {
    path: "/club/torneos",
    name: "Club - Solicitudes",
    description: "Tab Solicitudes: cards de invitación con botones Rechazar/Aceptar o Cancelar solicitud",
    figmaNode: "2517:5590",
    status: "done",
  },
  {
    path: "/club/torneos/buscar",
    name: "Club - Buscar torneo",
    description: "Búsqueda de torneos con resultados y botón Inscribirme por cada torneo encontrado",
    figmaNode: "2789:8290",
    status: "done",
  },
  {
    path: "/club/torneos/t1",
    name: "Club - Torneo detalle (Torneo)",
    description: "Detalle de torneo: card resumen, tabs Torneo/Fixture/Resultados, sub-tabs Partidos/Amonestados/Inscritos",
    figmaNode: "9246:36024",
    status: "done",
  },
  {
    path: "/club/torneos/t1",
    name: "Club - Torneo detalle (Fixture)",
    description: "Tab Fixture: carousel próximos partidos, lista completa de partidos por grupo",
    figmaNode: "9245:33140",
    status: "done",
  },
  {
    path: "/club/torneos/t1",
    name: "Club - Torneo detalle (Resultados)",
    description: "Tab Resultados: sub-tabs Tabla/Goleadores/Compartir, tabla de posiciones y top 10 goleadores",
    figmaNode: "2796:11687",
    status: "done",
  },
  {
    path: "/club/torneos/t1/partido/m1",
    name: "Club - Partido en vivo",
    description: "Vista de partido en vivo: marcador con tiempo, cronología de eventos (goles/tarjetas) en timeline bilateral",
    figmaNode: "2522:6021",
    status: "done",
  },
  {
    path: "/club/torneos/t1/partido/m1",
    name: "Club - Partido finalizado",
    description: "Vista de partido finalizado: marcador FT, timeline de eventos, link a definir titulares",
    figmaNode: "2522:6200",
    status: "done",
  },
  {
    path: "/club/torneos/t1/titulares",
    name: "Club - Definir titulares",
    description: "Selección de titulares con checkboxes, contador X/15 jugadores y botón Guardar cambios",
    figmaNode: "4853:28411",
    status: "done",
  },
  // === Club — Jugadores ===
  {
    path: "/club/jugadores",
    name: "Club - Jugadores Home",
    description: "Lista de categorías con tabs de género (Masculino/Femenino/Mixto), link Definir categorías, bottom nav Club",
    figmaNode: "4922:30651",
    status: "done",
  },
  {
    path: "/club/jugadores/cat-sub15",
    name: "Club - Categoría detalle",
    description: "Lista de jugadores por categoría con checkboxes, verificación, Agregar, acciones Liberar/Asignar con dialogs",
    figmaNode: "2816:20389",
    status: "done",
  },
  {
    path: "/club/jugadores/cat-sin",
    name: "Club - Sin categoría",
    description: "Lista sin categoría con banner informativo, tabs género, dialogs de liberar y asignar categoría",
    figmaNode: "4956:38084",
    status: "done",
  },
  {
    path: "/club/jugadores/invitar",
    name: "Club - Invitar jugador",
    description: "Buscar talento en la comunidad y compartir link de invitación por WhatsApp",
    figmaNode: "9304:31900",
    status: "done",
  },
  {
    path: "/club/jugadores/buscar",
    name: "Club - Buscar jugador",
    description: "Búsqueda de jugadores con resultados recientes y botón Invitar por cada jugador",
    figmaNode: "9304:31996",
    status: "done",
  },
  // === Club — Equipo ===
  {
    path: "/club/equipo",
    name: "Club - Equipo (Categorías)",
    description: "Tabs Categorías/Planilla, categorías agrupadas por género con integrantes, botón Agregar categoría",
    figmaNode: "4881:10610",
    status: "done",
  },
  {
    path: "/club/equipo",
    name: "Club - Equipo (Planilla)",
    description: "Tab Planilla: lista de staff (DT/Delegado/Asistente) con avatar, verificación, rol y edad, botón Agregar planilla",
    figmaNode: "9373:14639",
    status: "done",
  },
  {
    path: "/club/equipo/crear-categoria",
    name: "Club - Crear categoría",
    description: "Formulario: género, tipo categoría, edad, selector de DT con bottom sheet y link Agregar DT",
    figmaNode: "4908:30356",
    status: "done",
  },
  {
    path: "/club/equipo/planilla/st1",
    name: "Club - Editar miembro",
    description: "Editar datos del staff: avatar, nombre, rol (Delegado/Asistente/DT), teléfono, correo, eliminar cuenta con dialog",
    figmaNode: "2852:33620",
    status: "done",
  },
  {
    path: "/club/equipo/buscar-delegado",
    name: "Club - Buscar delegado",
    description: "Buscar DT por ID/usuario, resultados con Vincular/Seleccionado, botón Guardar Cambios",
    figmaNode: "4921:11475",
    status: "done",
  },
  // === Club — Ajustes ===
  {
    path: "/club/ajustes",
    name: "Club - Ajustes",
    description: "Menú: Mi Ajustes, Centro de ayuda, Términos, Cambiar de perfil (Organizador/Jugador/Otro club), Cerrar sesión",
    figmaNode: "4922:30371",
    status: "done",
  },
  {
    path: "/club/ajustes/perfil",
    name: "Club - Editar perfil",
    description: "Formulario del club: avatar, equipo, nombre corto, color representativo, delegado (nombre/teléfono/correo)",
    figmaNode: "9420:41323",
    status: "done",
  },
  {
    path: "/club/ajustes/otro-club",
    name: "Club - Otro club",
    description: "Lista de otros clubs del usuario para cambiar de club activo",
    figmaNode: "9420:41274",
    status: "done",
  },
  // === Jugador — Invitación ===
  {
    path: "/jugador/invitacion",
    name: "Jugador - Invitación por mail",
    description: "Flujo de onboarding: formulario de registro con posición, departamento, fecha de nacimiento, sexo. Bottom sheets para selección. Pantalla de éxito.",
    figmaNode: "9421:42866",
    status: "done",
  },
  // === Jugador — Actividad ===
  {
    path: "/jugador/torneos",
    name: "Jugador - Actividad",
    description: "Dashboard de actividad del jugador: torneos vinculados agrupados por equipo, sponsor, sección auxiliar",
    figmaNode: "9425:43222",
    status: "done",
  },
  {
    path: "/jugador/equipos",
    name: "Jugador - Mis Equipos",
    description: "Lista de equipos vinculados al jugador con categoría y rol. Estado vacío con CTA para vincular equipo.",
    figmaNode: "9425:43222",
    status: "done",
  },
  // === Jugador — Torneo ===
  {
    path: "/jugador/torneos/t1",
    name: "Jugador - Torneo detalle",
    description: "Detalle de torneo desde vista jugador: tabs Partidos/Llaves/Tabla/Goleadores/Equipos, selector de torneo, bracket de eliminación",
    figmaNode: "9538:31195",
    status: "done",
  },
  // === Jugador — Ajustes ===
  {
    path: "/jugador/ajustes",
    name: "Jugador - Ajustes",
    description: "Menú: Mi Perfil, Centro de ayuda, Términos y condiciones, Políticas de privacidad, Cerrar sesión",
    figmaNode: "4712:26516",
    status: "done",
  },
  {
    path: "/jugador/ajustes/perfil",
    name: "Jugador - Editar perfil",
    description: "Formulario del jugador: avatar, nombre, apellidos, posición, fecha nacimiento, sexo, teléfono, departamento",
    figmaNode: "4712:26541",
    status: "done",
  },
];

const statusConfig = {
  done: { label: "Listo", color: "bg-verification text-white" },
  wip: { label: "En progreso", color: "bg-yellow text-brand-900" },
  pending: { label: "Pendiente", color: "bg-brand-200 text-text-secondary" },
};

export default function DevIndexPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-text-primary">
        Amateur — Glosario de pantallas
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        Índice de desarrollo. Todas las pantallas creadas en el proyecto.
      </p>

      <div className="mt-8 space-y-3">
        {screens.map((screen, i) => {
          const st = statusConfig[screen.status];
          return (
            <Link
              key={`${screen.path}-${i}`}
              href={screen.path}
              className="group block rounded-xl border border-brand-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-text-primary group-hover:underline">
                      {screen.name}
                    </h2>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-secondary">
                    {screen.description}
                  </p>
                </div>
                <code className="shrink-0 rounded bg-brand-300 px-2 py-1 text-xs text-text-secondary">
                  {screen.path}
                </code>
              </div>
              {screen.figmaNode && (
                <p className="mt-2 text-xs text-brand-500">
                  Figma node: {screen.figmaNode}
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-text-secondary">
        {screens.filter((s) => s.status === "done").length}/{screens.length} pantallas completadas
      </p>
    </div>
  );
}
