/**
 * Detección rápida de intención en Project OS.
 * Diferencia conversaciones casuales (comida, películas, cháchara, anécdotas, trivia)
 * de consultas que requieren contexto profundo de Project OS (proyectos, tareas,
 * calendario, decisiones, bloqueadores, memoria, etc.).
 */

export function isProjectOSIntent(text: string, projectNames: string[] = []): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();

  // 1. Acciones explícitas sobre proyectos, solicitudes de creación o eliminación
  const projectActionKeywords = [
    'proyecto',
    'proyectos',
    'crea un proyecto',
    'crear un proyecto',
    'nuevo proyecto',
    'convierte esto en un proyecto',
    'convertir esto en un proyecto',
    'haz de esto un proyecto',
    'registra esto como un nuevo proyecto',
    'haz de todo lo que hemos hablado un proyecto',
    'crea un proyecto con esta idea',
    'crea un proyecto para esta idea',
    'quiero que esto sea un proyecto',
    'borra',
    'borrar',
    'elimina',
    'eliminar',
    'bórralo',
    'borralo',
    'elimínalo',
    'eliminalo',
    'suprime',
    'suprimir',
    'destruye',
    'destruir',
  ];
  if (projectActionKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // Códigos de seguridad dinámicos para confirmación de borrado (ej. LIMONADA-742, CVSMART-583)
  if (/^[A-Z0-9]{3,}-\d{2,}$/i.test(text.trim())) {
    return true;
  }

  // Confirmaciones o cancelaciones de acciones de seguridad
  if (/^(?:s[íi]|dale|confirmo|hazlo|ok|b[oó]rralo|elim[ií]nalo|mejor no|cancelar|cancela|d[eé]jalo|olv[ií]dalo)$/i.test(lower)) {
    return true;
  }

  // Aceptación afirmativa de sugerencia para crear proyecto
  if (/^(?:s[íi]|claro|dale)[,\s]+(?:cr[ée]alo|hazlo)/i.test(lower)) {
    return true;
  }

  // 2. Tareas y pendientes
  const taskKeywords = [
    'tarea',
    'tareas',
    'pendiente',
    'pendientes',
    'por hacer',
    'to-do',
    'todo',
    'tengo que',
    'hay que',
    'falta hacer',
    'falta terminar',
    'debo hacer',
    'terminé',
    'termine',
    'completé',
    'complete',
    'completar',
    'finalicé',
    'finalice',
  ];
  if (taskKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // 3. Calendario, agenda, reuniones y llamadas
  const calendarKeywords = [
    'agenda',
    'agendar',
    'reunión',
    'reunion',
    'reuniones',
    'cita',
    'citas',
    'llamada con',
    'llamada a las',
    'calendario',
    'evento',
    'eventos',
    'horario',
  ];
  if (calendarKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  // Patrones temporales con hora fija (ej. "mañana a las 4", "hoy a las 15:00")
  if (/(?:mañana|hoy|el viernes|el lunes|el martes|el miércoles|el miercoles|el jueves)\s+a\s+las\s+\d+/i.test(lower)) {
    return true;
  }

  // 4. Decisiones, próximos pasos, bloqueadores, hitos
  const strategicKeywords = [
    'decisión',
    'decision',
    'decisiones',
    'decidí',
    'decidi',
    'decidimos',
    'optamos por',
    'vamos a usar',
    'próximo paso',
    'proximo paso',
    'siguiente paso',
    'siguientes pasos',
    'ahora toca',
    'bloqueo',
    'bloqueos',
    'bloqueador',
    'bloqueadores',
    'impedimento',
    'hito',
    'hitos',
    'milestone',
    'roadmap',
  ];
  if (strategicKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // 5. Consultas de portfolio, estado, foco y memoria histórica
  const portfolioKeywords = [
    'portfolio',
    'priorizar',
    'prioridad',
    'prioridades',
    'enfoque',
    'en qué me enfoco',
    'en que me enfoco',
    'resumen general',
    'estado de',
    'avance de',
    'progreso',
    'acuerdas de',
    'recuerdas',
    'en qué estaba',
    'en que estaba',
    'qué estaba haciendo',
    'que estaba haciendo',
    'qué estábamos',
    'que estabamos',
    'qué proyectos',
    'que proyectos',
    'cuáles están activos',
    'cuales estan activos',
    'qué tengo',
    'que tengo',
  ];
  if (portfolioKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }

  // 6. Ideas estructurables de negocio / app (iniciativas potenciales)
  if (
    (lower.includes('idea') || lower.includes('ocurrió') || lower.includes('ocurrio') || lower.includes('pensando en')) &&
    (lower.includes('app') || lower.includes('aplicación') || lower.includes('aplicacion') || lower.includes('negocio') || lower.includes('startup') || lower.includes('plataforma') || lower.includes('software') || lower.includes('sistema'))
  ) {
    return true;
  }

  // 7. Nombre de algún proyecto existente del usuario
  for (const name of projectNames) {
    if (name && name.trim().length >= 3) {
      if (lower.includes(name.toLowerCase().trim())) {
        return true;
      }
    }
  }

  return false;
}

export type ContextLevel = 'general' | 'project' | 'portfolio';

/**
 * Mapeo inteligente de arquitectura en 3 niveles de contexto para el agente:
 * - 'general': Charlas casuales, saludos, preguntas genéricas, ayuda puntual (Nivel 1 - Rápido, ~1.5s).
 * - 'project': Consultas sobre un proyecto específico, tareas, calendario, decisiones (Nivel 2 - Dirigido, ~3s).
 * - 'portfolio': Análisis profundo del portfolio completo, estado global y priorización (Nivel 3 - Amplio, ~6s).
 */
export function detectContextLevel(text: string, projectNames: string[] = []): ContextLevel {
  if (!text || typeof text !== 'string') return 'general';
  const lower = text.toLowerCase().trim();

  // Nivel 3: Portfolio Completo (Análisis amplio y comparativo)
  const portfolioKeywords = [
    'portfolio',
    'todos los proyectos',
    'todos mis proyectos',
    'mis proyectos',
    'resumen general',
    'estado de mis proyectos',
    'priorizar portfolio',
    'prioridades generales',
    'cuáles están activos',
    'cuales estan activos',
    'qué proyectos tengo',
    'que proyectos tengo',
    'repasar portfolio',
    'comparar proyectos',
  ];
  if (portfolioKeywords.some((kw) => lower.includes(kw))) {
    return 'portfolio';
  }

  // Nivel 2: Proyecto o Acción concreta (Tareas, calendario, decisiones, proyecto específico)
  if (isProjectOSIntent(text, projectNames)) {
    return 'project';
  }

  // Nivel 1: Conversación General o pregunta genérica sin acción sobre proyectos
  return 'general';
}
