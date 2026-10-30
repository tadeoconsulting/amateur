// El texto de partida de cada documento (especificación 016): lo que se muestra mientras el admin no haya guardado
// uno propio, y lo que carga "Empezar desde el texto actual" en el editor.
//
// Los Términos y las Políticas son genéricos: deben pasar por una revisión legal antes de darse por definitivos.
import type { ContentKind, ContentSection } from "./content";

const legal = (title: string, body: string): ContentSection => ({ category: null, title, body });
const faq = (category: string, title: string, body: string): ContentSection => ({ category, title, body });

export const DEFAULT_CONTENT: Record<ContentKind, ContentSection[]> = {
  TERMINOS: [
    legal(
      "",
      "Bienvenido a Amateur. Al acceder y utilizar nuestra plataforma, aceptas los siguientes términos y condiciones. Te pedimos que los leas con atención antes de continuar."
    ),
    legal(
      "1. Uso de la plataforma.",
      "Amateur es una herramienta de gestión para torneos de fútbol amateur. Los organizadores pueden crear torneos, registrar equipos, gestionar calendarios y publicar resultados en tiempo real. Los usuarios se comprometen a utilizar la plataforma únicamente para los fines previstos."
    ),
    legal(
      "2. Registro y cuentas.",
      "Para acceder a las funcionalidades de la plataforma es necesario crear una cuenta. Los datos proporcionados deben ser veraces y actualizados. El usuario es responsable de mantener la confidencialidad de sus credenciales de acceso."
    ),
    legal(
      "3. Roles y responsabilidades.",
      "La plataforma contempla distintos roles: organizador, delegado de club y jugador. Cada rol tiene permisos específicos. Los organizadores son responsables de la veracidad de los datos de sus torneos."
    ),
    legal(
      "4. Datos de menores.",
      "Cuando se registren jugadores menores de edad, el organizador y/o el delegado del club asumen la responsabilidad de contar con el consentimiento de los tutores legales para el tratamiento de sus datos personales."
    ),
    legal(
      "5. Propiedad intelectual.",
      "Todo el contenido, diseño y tecnología de la plataforma es propiedad de Amateur. Queda prohibida la reproducción total o parcial sin autorización previa por escrito."
    ),
    legal(
      "6. Modificaciones.",
      "Amateur se reserva el derecho de modificar estos términos en cualquier momento. Las modificaciones entrarán en vigencia desde su publicación."
    ),
    legal(
      "7. Limitación de responsabilidad.",
      "Amateur no se hace responsable por la suspensión o cancelación de torneos organizados a través de la plataforma, ni por conflictos entre organizadores, clubes o jugadores."
    ),
  ],

  POLITICAS: [
    legal(
      "",
      "En Amateur nos comprometemos a proteger la privacidad de nuestros usuarios. Esta política describe cómo recopilamos, usamos y protegemos tu información personal."
    ),
    legal(
      "1. Información que recopilamos.",
      "Recopilamos los datos que proporcionas al crear tu cuenta (nombre, correo electrónico), la información de perfil de jugador o club, y los datos generados por el uso de la plataforma (resultados, estadísticas, actividad)."
    ),
    legal(
      "2. Uso de la información.",
      "Utilizamos tus datos para operar la plataforma, gestionar torneos, generar estadísticas, enviar notificaciones relevantes y mejorar la experiencia del usuario."
    ),
    legal(
      "3. Datos de menores de edad.",
      "Si eres menor de edad, tu participación en la plataforma requiere el consentimiento de tu padre, madre o tutor legal. Los organizadores y delegados de club son responsables de verificar dicho consentimiento antes de registrar jugadores menores."
    ),
    legal(
      "4. Compartir información.",
      "No vendemos ni compartimos tu información personal con terceros, excepto cuando sea necesario para el funcionamiento de la plataforma (por ejemplo, mostrar la plantilla de un equipo a otros usuarios del torneo) o por requerimiento legal."
    ),
    legal(
      "5. Seguridad.",
      "Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos contra acceso no autorizado, pérdida o alteración."
    ),
    legal(
      "6. Retención de datos.",
      "Conservamos tus datos mientras tu cuenta esté activa. Puedes solicitar la eliminación de tu cuenta y datos asociados en cualquier momento contactando a nuestro equipo de soporte."
    ),
    legal(
      "7. Cambios en esta política.",
      "Podemos actualizar esta política periódicamente. Los cambios entrarán en vigencia desde su publicación."
    ),
  ],

  AYUDA: [
    faq("General", "¿Cómo creo mi cuenta?", "Puedes crear tu cuenta con tu correo electrónico desde la pantalla de inicio de sesión. Solo necesitas un correo válido para comenzar."),
    faq("General", "¿Puedo tener más de un perfil?", "Sí. Una misma cuenta puede ser organizador de torneos, delegado de un club y jugador al mismo tiempo. La plataforma adapta la experiencia según el perfil con el que entras."),
    faq("General", "¿Cómo recupero mi contraseña?", "Desde la pantalla de inicio de sesión, toca «¿Olvidaste tu contraseña?» e ingresa tu correo. Te enviaremos un enlace para restablecerla."),
    faq(
      "Torneos",
      "¿Cómo creo un torneo?",
      "Desde tus torneos, toca «Crear torneo». Completa el nombre, la fecha y la sede, y luego la modalidad, el tipo de competencia y la cantidad de equipos. Con eso ya puedes crearlo; las bases (tiempos, costos y condiciones) son opcionales y las puedes definir después. Luego agregas a los equipos."
    ),
    faq(
      "Torneos",
      "¿Puedo editar un torneo que ya empezó?",
      "Puedes modificar las fechas de los partidos y cargar resultados. El tipo de competencia no se puede cambiar una vez que el torneo tiene partidos."
    ),
    faq(
      "Torneos",
      "¿Cómo cargo los resultados en vivo?",
      "Durante un partido, entra al detalle del encuentro y usa los controles para registrar goles, tarjetas y otras jugadas. Los cambios se reflejan en tiempo real para quienes siguen el torneo."
    ),
  ],
};
