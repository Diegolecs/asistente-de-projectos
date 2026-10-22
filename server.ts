import './fix-dirname.js';
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { isProjectOSIntent } from './src/utils/intentDetection';

dotenv.config();

const currentFilename = typeof __filename !== 'undefined'
  ? __filename
  : (typeof import.meta !== 'undefined' && (import.meta as any).url ? fileURLToPath((import.meta as any).url) : process.cwd());

const currentDirname = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(currentFilename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// Enable CORS middleware for local network mobile device testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '');
  res.json({
    status: 'ok',
    hasGeminiKey,
    model: 'gemini-3.8-flash',
    timestamp: new Date().toISOString(),
  });
});

// Helper for Gemini AI instance
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Candidate models in order of priority (flagship fast reasoning models first, with quota-resilient cascade)
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
];

interface DeviceTimeContext {
  currentDate: string; // YYYY-MM-DD
  currentTime: string; // HH:mm:ss
  formattedDate: string;
  weekday: string;
  timezone: string;
  timezoneOffsetMinutes: number;
  tomorrowDate: string;
  yesterdayDate: string;
}

interface ActionExecuted {
  type: string;
  label: string;
  details: string;
  projectId?: string;
}

export interface PendingProjectDeletion {
  projectId: string;
  projectName: string;
  confirmationCode: string;
  createdAt: number;
}

let activePendingDeletion: PendingProjectDeletion | null = null;

export function generateConfirmationCode(projectName: string): string {
  const clean = projectName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let prefix = '';
  if (words.length === 0) {
    prefix = 'PROYECTO';
  } else if (words.length === 1) {
    prefix = words[0].toUpperCase().slice(0, 8);
  } else if (words[0].length <= 3 && words[1]) {
    // e.g. "CV Smart" -> "CVSMART", "App Web" -> "APPWEB"
    prefix = (words[0] + words[1]).toUpperCase().slice(0, 8);
  } else {
    // e.g. "Limonada Los Cedros" -> "LIMONADA"
    prefix = words[0].toUpperCase().slice(0, 8);
  }
  if (!prefix) prefix = 'PROYECTO';
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randNum}`;
}

export function resolvePendingDeletion(messages: any[], liveProjects: any[]): PendingProjectDeletion | null {
  if (activePendingDeletion) {
    const exists = liveProjects.some((p) => p.id === activePendingDeletion!.projectId);
    if (exists) {
      return activePendingDeletion;
    } else {
      activePendingDeletion = null;
    }
  }

  // Fallback: search conversation history
  if (Array.isArray(messages) && messages.length >= 2) {
    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'assistant' && typeof msg.content === 'string') {
        const codeMatch = msg.content.match(/escribe exactamente:\s*([A-Z0-9]+-\d+)/i);
        if (codeMatch) {
          const code = codeMatch[1].trim().toUpperCase();
          const nameMatch = msg.content.match(/(?:eliminar permanentemente el proyecto|proyecto)\s+[‘'"]([^’'"]+)[’'"]/i);
          const name = nameMatch ? nameMatch[1].trim() : '';
          const found =
            liveProjects.find((p) => p.name.toLowerCase() === name.toLowerCase()) ||
            liveProjects.find((p) => code.startsWith(p.name.slice(0, 3).toUpperCase()));
          if (found) {
            activePendingDeletion = {
              projectId: found.id,
              projectName: found.name,
              confirmationCode: code,
              createdAt: Date.now(),
            };
            return activePendingDeletion;
          }
        }
      }
    }
  }

  return null;
}

// ==========================================
// GEMINI FUNCTION CALLING TOOL DECLARATIONS
// ==========================================
const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'create_project',
    description:
      'Crea un nuevo proyecto en Project OS mediante Function Calling. REGLAS CRÍTICAS:\n' +
      '1. SOLICITUD EXPLÍCITA = CREAR INMEDIATAMENTE: Si el usuario pide explícitamente crear un proyecto (ej. "Crea un proyecto llamado CV Smart", "Quiero crear un proyecto para mi negocio de reseñas", "Crea un proyecto con esta idea", "Quiero convertir esto en un proyecto", "Haz de esto un proyecto", "Registra esto como un nuevo proyecto", "Haz de todo lo que hemos hablado un proyecto", "Crea un proyecto para esta idea"), o si responde afirmativamente a una sugerencia previa de crearlo ("Sí, créalo", "Sí, dale"), DEBES llamar inmediatamente a create_project sin pedir confirmación adicional. ¡NUNCA preguntes "¿quieres que lo cree?" si el usuario ya lo pidió explícitamente!\n' +
      '2. MENCIONAR UNA IDEA NO DEBE CREAR UN PROYECTO: Si el usuario simplemente menciona una idea, negocio, aplicación o posibilidad ("Estoy pensando en hacer una app para organizar mis inversiones", "Se me ocurrió hacer una aplicación para comparar precios"), NO llames a create_project. Conversa sobre la idea, analízala y ayúdalo a estructurarla.\n' +
      '3. EL AGENTE PUEDE SUGERIR: Si la conversación muestra claramente que una iniciativa está tomando suficiente forma como para manejarla como un proyecto independiente, puedes sugerir: "Esto parece algo que podríamos manejar como un proyecto independiente. ¿Quieres que lo cree?". En este caso NO crees el proyecto todavía; espera a que el usuario responda.\n' +
      '4. NO CREAR POR CAMBIO DE TEMA: Si el usuario cambia de tema ("También quiero aprender programación", "También quiero aprender fotografía"), NO crees un proyecto.\n' +
      '5. DISPONIBLE EN GENERAL CHAT Y PROJECT CHAT: La función debe poder ejecutarse tanto desde General Chat como desde Project Chat (creando un proyecto nuevo separado sin mezclarlo con el actual).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: {
          type: Type.STRING,
          description:
            'Nombre breve, claro y distintivo del proyecto. Si el usuario lo proporcionó explícitamente, úsalo tal cual. Si no proporcionó un nombre pero el contexto permite identificarlo claramente, genera un nombre breve y descriptivo (ej. "CV Smart", "App de Recetas", "Negocio de Reseñas").',
        },
        description: {
          type: Type.STRING,
          description:
            'Descripción o contexto inicial del proyecto basado exclusivamente en la información compartida por el usuario. No inventes información que el usuario no haya proporcionado.',
        },
        mainGoal: {
          type: Type.STRING,
          description:
            'Objetivo principal identificable del proyecto cuando sea identificable.',
        },
        nextStep: {
          type: Type.STRING,
          description:
            'Primer paso o acción inmediata para comenzar con el proyecto si fue identificado.',
        },
        category: {
          type: Type.STRING,
          description:
            'Categoría del proyecto: "Producto", "Negocio", "Personal", "Experimento" u "Otro". Por defecto "Producto".',
        },
        status: {
          type: Type.STRING,
          description:
            'Estado inicial del proyecto: "Idea", "Planificación" o "Activo". Por defecto "Activo".',
        },
      },
      required: ['name'],
    },
  },
  {
    name: 'delete_project',
    description:
      'Elimina permanentemente un proyecto de Project OS y todas sus tareas, eventos e historial asociados. REGLA DE SEGURIDAD CRÍTICA: SOLO debe ejecutarse cuando el usuario haya introducido exactamente el código de seguridad dinámico de confirmación (ej. LIMONADA-742) solicitado previamente. NUNCA debe llamarse ante solicitudes iniciales ni confirmaciones ambiguas (como "sí", "dale", "hazlo", "bórralo").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID del proyecto a eliminar.',
        },
        projectName: {
          type: Type.STRING,
          description: 'Nombre del proyecto a eliminar.',
        },
        confirmationCode: {
          type: Type.STRING,
          description:
            'Código exacto de seguridad dinámico que el usuario escribió para confirmar la eliminación (ej. LIMONADA-742).',
        },
      },
      required: ['confirmationCode'],
    },
  },
  {
    name: 'create_project_task',
    description:
      'Crea una nueva tarea en un proyecto de Project OS. Se debe invocar SIEMPRE que el usuario mencione algo que tiene que hacer, terminar, implementar o revisar para un proyecto (ej. "Mañana tengo que terminar la pantalla de login", "Hay que refactorizar el backend").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description:
            'ID o nombre del proyecto al que pertenece la tarea. Si se omite y el usuario está conversando dentro de un proyecto, se asigna a ese proyecto automáticamente.',
        },
        title: {
          type: Type.STRING,
          description: 'Título descriptivo y directo de la tarea (ej. "Terminar la pantalla de login").',
        },
        description: {
          type: Type.STRING,
          description: 'Detalle opcional o contexto de la tarea.',
        },
        dueDate: {
          type: Type.STRING,
          description:
            'Fecha límite en formato YYYY-MM-DD. Si el usuario dice "mañana", "hoy", "el viernes", usa el contexto temporal del usuario para convertirlo a fecha exacta YYYY-MM-DD.',
        },
        dueTime: {
          type: Type.STRING,
          description: 'Hora límite opcional en formato HH:mm (ej. "18:00").',
        },
        priority: {
          type: Type.STRING,
          description: 'Nivel de prioridad: "alta", "media" o "baja".',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'complete_project_task',
    description:
      'Marca una tarea existente como completada. Debe usarse SIEMPRE que el usuario indique que ya terminó, completó o finalizó una tarea (ej. "Ya terminé la pantalla de login", "Completé la tarea del editor").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        taskId: {
          type: Type.STRING,
          description: 'ID de la tarea si se conoce.',
        },
        taskTitleMatch: {
          type: Type.STRING,
          description:
            'Título o palabras clave para buscar e identificar la tarea que se completó (ej. "pantalla de login").',
        },
      },
      required: ['taskTitleMatch'],
    },
  },
  {
    name: 'update_project_task',
    description:
      'Actualiza campos de una tarea existente (título, descripción, fecha límite, hora, prioridad o estado).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        taskId: {
          type: Type.STRING,
          description: 'ID de la tarea.',
        },
        taskTitleMatch: {
          type: Type.STRING,
          description: 'Título o palabras clave para encontrar la tarea.',
        },
        newTitle: {
          type: Type.STRING,
          description: 'Nuevo título si cambia.',
        },
        status: {
          type: Type.STRING,
          description: 'Nuevo estado de la tarea: "pendiente" o "completado".',
        },
        dueDate: {
          type: Type.STRING,
          description: 'Nueva fecha límite en formato YYYY-MM-DD.',
        },
        dueTime: {
          type: Type.STRING,
          description: 'Nueva hora límite en formato HH:mm.',
        },
        priority: {
          type: Type.STRING,
          description: 'Nueva prioridad: "alta", "media" o "baja".',
        },
        description: {
          type: Type.STRING,
          description: 'Nueva descripción de la tarea.',
        },
      },
    },
  },
  {
    name: 'delete_project_task',
    description: 'Elimina una tarea de un proyecto.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        taskId: {
          type: Type.STRING,
          description: 'ID de la tarea a eliminar.',
        },
        taskTitleMatch: {
          type: Type.STRING,
          description: 'Título o búsqueda para identificar la tarea a eliminar.',
        },
      },
      required: ['taskTitleMatch'],
    },
  },
  {
    name: 'set_next_step',
    description:
      'Actualiza el Próximo Paso (Next Step) del proyecto. Debe llamarse cuando el usuario defina o cambie su enfoque inmediato (ej. "Mi próximo paso es desplegar la versión de prueba").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        nextStep: {
          type: Type.STRING,
          description: 'Texto concreto y conciso del nuevo próximo paso.',
        },
      },
      required: ['nextStep'],
    },
  },
  {
    name: 'record_decision',
    description:
      'Registra una decisión clave para el proyecto (arquitectura, producto, modelo de negocio, tecnología, descarte de alternativas, etc.) en su memoria estructurada (ej. "Decidí usar Gemini para esta parte").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        title: {
          type: Type.STRING,
          description: 'Título conciso de la decisión tomada.',
        },
        description: {
          type: Type.STRING,
          description: 'Contexto, justificación o detalles adicionales de la decisión.',
        },
        date: {
          type: Type.STRING,
          description: 'Fecha de la decisión (YYYY-MM-DD). Si no se especifica, se usa la fecha actual.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'record_idea',
    description:
      'Guarda una nueva idea, propuesta o hipótesis para un proyecto en su memoria para evaluación futura.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        title: {
          type: Type.STRING,
          description: 'Título o concepto central de la idea.',
        },
        description: {
          type: Type.STRING,
          description: 'Detalle o posibilidades de desarrollo de la idea.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'record_blocker',
    description:
      'Registra un bloqueo, riesgo, problema o cuello de botella detectado en un proyecto.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        title: {
          type: Type.STRING,
          description: 'Descripción breve del obstáculo o bloqueo.',
        },
        description: {
          type: Type.STRING,
          description: 'Impacto, causas o posibles alternativas de resolución.',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_project_activity',
    description:
      'Registra un hito, evento o actividad significativa en la bitácora del proyecto.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto.',
        },
        description: {
          type: Type.STRING,
          description: 'Descripción de la actividad o evento.',
        },
        type: {
          type: Type.STRING,
          description: 'Tipo de actividad (ej. "project_updated", "milestone_added", "milestone_completed").',
        },
      },
      required: ['description'],
    },
  },
  {
    name: 'create_calendar_event',
    description:
      'Crea y agenda un nuevo evento o reunión en el calendario de Project OS. Se debe invocar SIEMPRE que el usuario mencione una reunión, cita, llamada o evento que ocurre en una fecha y hora determinada (ej. "Agenda una reunión con Juan mañana a las 4 de la tarde", "Mañana tengo una llamada con el cliente a las 3", "Reunión con el equipo el viernes a las 10:00"). NOTA: Para tareas pendientes que solo se deben "hacer" (sin hora específica de reunión), usa create_project_task.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: 'Título directo del evento o reunión (ej. "Reunión con Juan", "Llamada con cliente").',
        },
        date: {
          type: Type.STRING,
          description:
            'Fecha del evento en formato exacto YYYY-MM-DD. Si el usuario dice "mañana", "hoy", "el viernes", usa el contexto temporal para convertirlo a fecha exacta YYYY-MM-DD.',
        },
        startTime: {
          type: Type.STRING,
          description:
            'Hora de inicio en formato HH:mm (ej. "16:00", "09:30", "15:00"). Por ejemplo, "4 de la tarde" o "las 4" de la tarde debe ser "16:00".',
        },
        endTime: {
          type: Type.STRING,
          description: 'Hora de finalización en formato HH:mm (ej. "17:00"). Si no se indica, se calcula con base a la duración.',
        },
        durationMinutes: {
          type: Type.INTEGER,
          description: 'Duración en minutos (ej. 30, 60, 90). Por defecto 60 minutos.',
        },
        location: {
          type: Type.STRING,
          description: 'Ubicación física o enlace (ej. "Google Meet", "Oficina", "Zoom").',
        },
        description: {
          type: Type.STRING,
          description: 'Notas adicionales, temas a tratar o agenda de la reunión.',
        },
        projectId: {
          type: Type.STRING,
          description: 'ID o nombre del proyecto relacionado si la reunión pertenece a uno en particular.',
        },
        status: {
          type: Type.STRING,
          description: 'Estado inicial del evento: "confirmado", "tentativo" o "cancelado". Por defecto "confirmado".',
        },
      },
      required: ['title', 'date', 'startTime'],
    },
  },
  {
    name: 'update_calendar_event',
    description: 'Modifica o reprograma un evento existente en el calendario de Project OS (título, fecha, hora, ubicación, descripción o estado).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: {
          type: Type.STRING,
          description: 'ID del evento si se conoce.',
        },
        eventTitleMatch: {
          type: Type.STRING,
          description: 'Título o palabras clave para buscar e identificar el evento a modificar.',
        },
        newTitle: {
          type: Type.STRING,
          description: 'Nuevo título si cambia.',
        },
        date: {
          type: Type.STRING,
          description: 'Nueva fecha en formato YYYY-MM-DD.',
        },
        startTime: {
          type: Type.STRING,
          description: 'Nueva hora de inicio en formato HH:mm.',
        },
        endTime: {
          type: Type.STRING,
          description: 'Nueva hora de finalización en formato HH:mm.',
        },
        durationMinutes: {
          type: Type.INTEGER,
          description: 'Nueva duración en minutos.',
        },
        location: {
          type: Type.STRING,
          description: 'Nueva ubicación.',
        },
        description: {
          type: Type.STRING,
          description: 'Nueva descripción o notas.',
        },
        status: {
          type: Type.STRING,
          description: 'Nuevo estado: "confirmado", "tentativo" o "cancelado".',
        },
      },
      required: ['eventTitleMatch'],
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Elimina o cancela un evento agendado en el calendario de Project OS.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        eventId: {
          type: Type.STRING,
          description: 'ID del evento si se conoce.',
        },
        eventTitleMatch: {
          type: Type.STRING,
          description: 'Título o palabras clave para buscar el evento a eliminar.',
        },
      },
      required: ['eventTitleMatch'],
    },
  },
  {
    name: 'check_calendar_availability',
    description: 'Consulta eventos agendados y verifica disponibilidad horaria en el calendario para una fecha.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: {
          type: Type.STRING,
          description: 'Fecha a consultar en formato YYYY-MM-DD (ej. "2026-09-24").',
        },
        startTime: {
          type: Type.STRING,
          description: 'Hora de inicio estimada en formato HH:mm a verificar.',
        },
      },
      required: ['date'],
    },
  },
];

// Helper to resolve project in context
function findTargetProject(
  projects: any[],
  projectIdArg?: string,
  activeProjectId?: string,
  contextText?: string
): any | null {
  if (!Array.isArray(projects)) return null;

  // 1. Match by explicit ID or name in projectIdArg
  if (projectIdArg) {
    const clean = projectIdArg.trim().toLowerCase();
    const byId = projects.find((p) => p.id === projectIdArg || p.id.toLowerCase() === clean);
    if (byId) return byId;
    const byName = projects.find(
      (p) =>
        p.name.toLowerCase() === clean ||
        p.name.toLowerCase().includes(clean) ||
        clean.includes(p.name.toLowerCase())
    );
    if (byName) return byName;
  }

  // 2. Specific project conversation context (not in general chat)
  if (activeProjectId && activeProjectId !== 'general') {
    const active = projects.find((p) => p.id === activeProjectId);
    if (active) return active;
  }

  // 3. Match against project names inside contextText (task title, description or prompt)
  if (contextText) {
    const lower = contextText.toLowerCase();
    const sortedByNameLen = [...projects].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
    for (const p of sortedByNameLen) {
      if (p.name && lower.includes(p.name.toLowerCase())) {
        return p;
      }
    }

    // 4. Semantic keyword scoring against category, mainGoal, and existing task keywords
    const stopWords = new Set(['de', 'la', 'el', 'los', 'las', 'un', 'una', 'para', 'por', 'con', 'en', 'y', 'o', 'que', 'tengo', 'hay', 'hacer', 'tarea', 'terminar', 'revisar', 'crear', 'nuevo', 'nueva', 'del', 'al']);
    const words = lower.split(/[^a-záéíóúñ0-9]+/i).filter((w) => w.length > 2 && !stopWords.has(w));

    let bestScore = 0;
    let bestProject = null;

    for (const p of projects) {
      let score = 0;
      const pWords = `${p.name} ${p.category} ${p.mainGoal} ${(p.tasks || []).map((t: any) => t.title).join(' ')}`.toLowerCase();
      for (const w of words) {
        if (pWords.includes(w)) {
          score += 1;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestProject = p;
      }
    }

    if (bestProject && bestScore >= 2) {
      return bestProject;
    }
  }

  // 5. In General Chat or unassigned tasks: DO NOT dump into unrelated business projects!
  // Instead, route to or create a dedicated "Personal & General" bucket
  const generalBucket = projects.find(
    (p) =>
      p.name.toLowerCase().includes('personal') ||
      p.name.toLowerCase().includes('general') ||
      p.name.toLowerCase().includes('cotidiano')
  );
  if (generalBucket) return generalBucket;

  if (projects.length === 0) return null;

  // Create a clean "Personal & General" project so user's tasks are never mixed with unrelated projects
  const newGeneralProject = {
    id: `proj-general-${Date.now()}`,
    name: 'Personal & General',
    description: 'Bandeja de entrada para tareas cotidianas, personales y notas generales.',
    category: 'Personal',
    status: 'Activo',
    mainGoal: 'Organizar tareas y notas generales fuera de proyectos específicos.',
    nextStep: 'Revisar y priorizar pendientes',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    milestones: [],
    decisions: [],
    ideas: [],
    tasks: [],
    activities: [
      {
        id: `act-gen-${Date.now()}`,
        projectId: `proj-general-${Date.now()}`,
        projectName: 'Personal & General',
        type: 'project_created',
        description: 'Bandeja Personal & General creada automáticamente.',
        timestamp: new Date().toISOString(),
      },
    ],
    messages: [],
  };
  projects.push(newGeneralProject);
  return newGeneralProject;
}

// Helper to calculate end time given start time and duration
function calculateEndTime(startTime: string, durationMinutes: number = 60): string {
  try {
    const [h, m] = startTime.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return '17:00';
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  } catch {
    return '17:00';
  }
}

// Helper to convert relative date expressions (e.g. "mañana", "viernes") to YYYY-MM-DD
function resolveDateString(expr: string | undefined, timeContext: DeviceTimeContext): string | undefined {
  if (!expr) return undefined;
  const clean = expr.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (clean === 'hoy' || clean === 'today') return timeContext.currentDate;
  if (clean === 'mañana' || clean === 'tomorrow') return timeContext.tomorrowDate;
  if (clean === 'ayer' || clean === 'yesterday') return timeContext.yesterdayDate;
  if (clean === 'pasado mañana') {
    const [y, m, d] = timeContext.currentDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 2);
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const da = String(date.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  }

  const weekdays: Record<string, number> = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miércoles: 3,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sábado: 6,
    sabado: 6,
  };

  for (const [dayName, dayIdx] of Object.entries(weekdays)) {
    if (clean.includes(dayName)) {
      const [y, m, d] = timeContext.currentDate.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const currentDay = date.getDay();
      let diff = dayIdx - currentDay;
      if (diff <= 0) diff += 7;
      date.setDate(date.getDate() + diff);
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, '0');
      const da = String(date.getDate()).padStart(2, '0');
      return `${yr}-${mo}-${da}`;
    }
  }

  return expr;
}

// ==========================================
// TOOL EXECUTION ENGINE (OPERATES ON PROJECT OS MODELS)
// ==========================================
function executeTool(
  toolName: string,
  args: any,
  liveProjects: any[],
  liveEvents: any[],
  activeProjectId: string | undefined,
  timeContext: DeviceTimeContext,
  accumulatedActions: ActionExecuted[]
): { success: boolean; message?: string; error?: string; [key: string]: any } {
  const nowIso = new Date().toISOString();

  // 0. Project Creation Tool (Autonomous top-level project generator for General Chat and Project Chat)
  if (toolName === 'create_project') {
    const projName = String(args.name || '').trim() || 'Nuevo Proyecto';
    const now = nowIso;
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const validCategories = ['Producto', 'Negocio', 'Personal', 'Experimento', 'Otro'];
    const category = validCategories.includes(args.category) ? args.category : 'Producto';

    const validStatuses = ['Idea', 'Planificación', 'Activo', 'Pausado', 'Completado', 'Archivado'];
    const status = validStatuses.includes(args.status) ? args.status : 'Activo';

    const mainGoal = args.mainGoal ? String(args.mainGoal).trim() : '';
    const nextStep = args.nextStep ? String(args.nextStep).trim() : '';
    const description = args.description ? String(args.description).trim() : '';

    const newProject = {
      id: newId,
      name: projName,
      description,
      category,
      status,
      mainGoal,
      nextStep,
      createdAt: now,
      updatedAt: now,
      milestones: [],
      decisions: [],
      ideas: [],
      tasks: [],
      activities: [
        {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          projectId: newId,
          projectName: projName,
          type: 'project_created',
          description: `Se creó el proyecto "${projName}" desde el chat.`,
          timestamp: now,
        },
      ],
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          projectId: newId,
          role: 'assistant',
          content: `¡Hola! Soy tu copiloto para **${projName}**.\n\n${mainGoal ? `• **Objetivo principal**: ${mainGoal}\n` : ''}${nextStep ? `• **Próximo paso**: ${nextStep}\n` : ''}\nPuedes hablarme de cualquier idea, obstáculo o decisión para continuar avanzando.`,
          timestamp: now,
        },
      ],
    };

    // Insert at beginning of portfolio so it appears immediately in Projects
    liveProjects.unshift(newProject);

    accumulatedActions.push({
      type: 'project_created',
      label: 'Proyecto creado',
      details: projName + (mainGoal ? ` [Objetivo: ${mainGoal}]` : ''),
      projectId: newId,
    });

    return {
      success: true,
      message: `Proyecto "${projName}" creado exitosamente (ID: ${newId}). Categoría: "${category}", Estado: "${status}".${mainGoal ? ` Objetivo: "${mainGoal}".` : ''}${nextStep ? ` Próximo paso: "${nextStep}".` : ''} Aparece de inmediato en Projects y ya puedes continuar trabajando en él.`,
      project: newProject,
      projectId: newId,
    };
  }

  // 0.1 Project Deletion Tool (Autonomous deletion with safety confirmation verification)
  if (toolName === 'delete_project') {
    const codeArg = String(args.confirmationCode || '').trim().toUpperCase();
    const proj = findTargetProject(liveProjects, args.projectId, activeProjectId, args.projectName);

    if (!proj) {
      return {
        success: false,
        error: 'No se encontró el proyecto a eliminar en Project OS.',
      };
    }

    // Verify confirmation code if an active pending deletion exists for this project
    if (activePendingDeletion && activePendingDeletion.projectId === proj.id) {
      if (activePendingDeletion.confirmationCode !== codeArg) {
        return {
          success: false,
          error: `Código de confirmación incorrecto. Se requiere ${activePendingDeletion.confirmationCode}.`,
        };
      }
    }

    // Remove project from liveProjects
    const index = liveProjects.findIndex((p) => p.id === proj.id);
    if (index !== -1) {
      liveProjects.splice(index, 1);
    }

    // Remove calendar events belonging exclusively to this project
    for (let i = liveEvents.length - 1; i >= 0; i--) {
      if (liveEvents[i].projectId === proj.id) {
        liveEvents.splice(i, 1);
      }
    }

    accumulatedActions.push({
      type: 'project_deleted',
      label: 'Proyecto eliminado',
      details: proj.name,
      projectId: proj.id,
    });

    activePendingDeletion = null;

    return {
      success: true,
      message: `Proyecto "${proj.name}" eliminado correctamente de Project OS.`,
      deletedProjectId: proj.id,
      deletedProjectName: proj.name,
    };
  }

  // 1. Calendar Tools (Autonomous top-level scheduling or project-linked)
  if (toolName === 'create_calendar_event') {
    const resolvedDate = resolveDateString(args.date, timeContext) || timeContext.tomorrowDate;
    const resolvedStartTime = args.startTime || '16:00';
    const duration = args.durationMinutes ? Number(args.durationMinutes) : 60;
    const resolvedEndTime = args.endTime || calculateEndTime(resolvedStartTime, duration);
    const hasProjectIntent = Boolean(
      args.projectId ||
      (activeProjectId && activeProjectId !== 'general') ||
      (args.title && liveProjects.some((p: any) => p.name && args.title.toLowerCase().includes(p.name.toLowerCase())))
    );
    const proj = hasProjectIntent ? findTargetProject(liveProjects, args.projectId, activeProjectId, args.title) : null;

    const newEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: String(args.title || 'Reunión').trim(),
      description: args.description ? String(args.description).trim() : undefined,
      date: resolvedDate,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      durationMinutes: duration,
      location: args.location ? String(args.location).trim() : undefined,
      status: args.status || 'confirmado',
      projectId: proj ? proj.id : undefined,
      projectName: proj ? proj.name : undefined,
      createdAt: nowIso,
      provider: 'local',
      syncStatus: 'local_only',
    };

    liveEvents.push(newEvent);

    accumulatedActions.push({
      type: 'event_created',
      label: 'Evento agendado',
      details: `${newEvent.title} [${newEvent.date} a las ${newEvent.startTime}]`,
      projectId: proj?.id,
    });

    if (proj) {
      if (!Array.isArray(proj.activities)) proj.activities = [];
      proj.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: proj.id,
        projectName: proj.name,
        type: 'event_added',
        description: `Evento agendado: "${newEvent.title}" para el ${newEvent.date} a las ${newEvent.startTime}`,
        timestamp: nowIso,
      });
      proj.updatedAt = nowIso;
    }

    return {
      success: true,
      message: `Evento agendado con éxito: "${newEvent.title}" para el ${newEvent.date} a las ${newEvent.startTime} (hasta las ${newEvent.endTime})${newEvent.location ? ` en ${newEvent.location}` : ''}${proj ? ` (Proyecto: "${proj.name}")` : ''}.`,
      event: newEvent,
    };
  }

  if (toolName === 'update_calendar_event') {
    let event = null;
    if (args.eventId) {
      event = liveEvents.find((e: any) => e.id === args.eventId);
    }
    if (!event && args.eventTitleMatch) {
      const q = String(args.eventTitleMatch).toLowerCase().trim();
      event = liveEvents.find((e: any) => e.title.toLowerCase().includes(q) || q.includes(e.title.toLowerCase()));
    }

    if (!event) {
      return {
        success: false,
        error: `No se encontró el evento "${args.eventTitleMatch || args.eventId}" en el calendario.`,
      };
    }

    if (args.newTitle) event.title = String(args.newTitle).trim();
    if (args.date) event.date = resolveDateString(args.date, timeContext) || event.date;
    if (args.startTime) event.startTime = args.startTime;
    if (args.durationMinutes) event.durationMinutes = Number(args.durationMinutes);
    if (args.endTime) event.endTime = args.endTime;
    else if (args.startTime || args.durationMinutes) {
      event.endTime = calculateEndTime(event.startTime, event.durationMinutes || 60);
    }
    if (args.location !== undefined) event.location = args.location ? String(args.location).trim() : undefined;
    if (args.description !== undefined) event.description = args.description ? String(args.description).trim() : undefined;
    if (args.status) event.status = args.status;
    event.updatedAt = nowIso;

    accumulatedActions.push({
      type: 'event_updated',
      label: 'Evento actualizado',
      details: `${event.title} [${event.date} a las ${event.startTime}]`,
      projectId: event.projectId,
    });

    return {
      success: true,
      message: `Evento "${event.title}" actualizado con éxito para el ${event.date} a las ${event.startTime}.`,
      event,
    };
  }

  if (toolName === 'delete_calendar_event') {
    let idx = -1;
    if (args.eventId) {
      idx = liveEvents.findIndex((e: any) => e.id === args.eventId);
    }
    if (idx === -1 && args.eventTitleMatch) {
      const q = String(args.eventTitleMatch).toLowerCase().trim();
      idx = liveEvents.findIndex((e: any) => e.title.toLowerCase().includes(q) || q.includes(e.title.toLowerCase()));
    }

    if (idx === -1) {
      return {
        success: false,
        error: `No se encontró ningún evento que coincida con "${args.eventTitleMatch || args.eventId}".`,
      };
    }

    const removed = liveEvents.splice(idx, 1)[0];
    accumulatedActions.push({
      type: 'event_deleted',
      label: 'Evento eliminado',
      details: `Eliminado: "${removed.title}"`,
      projectId: removed.projectId,
    });

    return {
      success: true,
      message: `Evento "${removed.title}" eliminado correctamente del calendario.`,
    };
  }

  if (toolName === 'check_calendar_availability') {
    const checkDate = resolveDateString(args.date, timeContext) || timeContext.currentDate;
    const dayEvents = liveEvents.filter((e: any) => e.date === checkDate && e.status !== 'cancelado');
    const hasConflict = args.startTime
      ? dayEvents.some((e: any) => e.startTime === args.startTime)
      : false;

    return {
      success: true,
      date: checkDate,
      hasConflicts: hasConflict,
      eventsCount: dayEvents.length,
      events: dayEvents.map((e: any) => ({ title: e.title, start: e.startTime, end: e.endTime, location: e.location })),
      message: dayEvents.length === 0
        ? `No tienes eventos agendados para el ${checkDate}. El día está completamente disponible.`
        : `Tienes ${dayEvents.length} evento(s) para el ${checkDate}: ${dayEvents.map((e: any) => `"${e.title}" (${e.startTime} - ${e.endTime})`).join(', ')}.`,
    };
  }

  // 2. Project Task / Memory Tools
  const project = findTargetProject(liveProjects, args.projectId, activeProjectId, args.title || args.taskTitleMatch);

  if (!project) {
    const projectNames = liveProjects.map((p) => `"${p.name}"`).join(', ');
    return {
      success: false,
      error: `No se identificó el proyecto objetivo. Por favor especifica a cuál de tus proyectos te refieres entre: ${projectNames || 'ninguno registrado'}.`,
    };
  }

  switch (toolName) {
    case 'create_project_task': {
      const resolvedDueDate = resolveDateString(args.dueDate, timeContext);
      const newTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        projectId: project.id,
        title: String(args.title || '').trim(),
        description: args.description ? String(args.description).trim() : undefined,
        status: 'pendiente',
        createdAt: nowIso,
        dueDate: resolvedDueDate,
        dueTime: args.dueTime ? String(args.dueTime).trim() : undefined,
        priority: args.priority || 'media',
      };

      if (!Array.isArray(project.tasks)) project.tasks = [];
      project.tasks.push(newTask);
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'task_added',
        description: `Tarea creada: "${newTask.title}"${newTask.dueDate ? ` (para ${newTask.dueDate})` : ''}`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'task_created',
        label: 'Tarea creada',
        details: `${newTask.title}${newTask.dueDate ? ` [Fecha: ${newTask.dueDate}]` : ''}`,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Tarea creada con éxito: "${newTask.title}" en el proyecto "${project.name}" (ID: ${newTask.id}, Fecha: ${newTask.dueDate || 'sin fecha límite'}).`,
        taskId: newTask.id,
        task: newTask,
      };
    }

    case 'complete_project_task': {
      if (!Array.isArray(project.tasks)) project.tasks = [];
      let task = null;

      if (args.taskId) {
        task = project.tasks.find((t: any) => t.id === args.taskId);
      }

      if (!task && args.taskTitleMatch) {
        const query = String(args.taskTitleMatch).trim().toLowerCase();
        // Exact match
        task = project.tasks.find((t: any) => t.title.toLowerCase() === query);
        // Partial match
        if (!task) {
          task = project.tasks.find(
            (t: any) =>
              t.title.toLowerCase().includes(query) ||
              query.includes(t.title.toLowerCase())
          );
        }
      }

      if (!task) {
        return {
          success: false,
          error: `No se encontró la tarea "${args.taskTitleMatch || args.taskId}" en "${project.name}". Tareas disponibles: ${project.tasks.map((t: any) => `"${t.title}" (${t.status})`).join(', ') || 'ninguna'}.`,
        };
      }

      task.status = 'completado';
      task.completedAt = nowIso;
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'task_completed',
        description: `Tarea completada: "${task.title}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'task_completed',
        label: 'Tarea completada',
        details: task.title,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Tarea "${task.title}" marcada como completada en el proyecto "${project.name}".`,
        task,
      };
    }

    case 'update_project_task': {
      if (!Array.isArray(project.tasks)) project.tasks = [];
      let task = null;

      if (args.taskId) {
        task = project.tasks.find((t: any) => t.id === args.taskId);
      }
      if (!task && args.taskTitleMatch) {
        const query = String(args.taskTitleMatch).trim().toLowerCase();
        task = project.tasks.find(
          (t: any) =>
            t.title.toLowerCase() === query ||
            t.title.toLowerCase().includes(query) ||
            query.includes(t.title.toLowerCase())
        );
      }

      if (!task) {
        return {
          success: false,
          error: `No se encontró la tarea para actualizar en "${project.name}".`,
        };
      }

      if (args.newTitle) task.title = String(args.newTitle).trim();
      if (args.status) {
        task.status = args.status;
        if (args.status === 'completado' && !task.completedAt) task.completedAt = nowIso;
      }
      if (args.dueDate !== undefined) task.dueDate = resolveDateString(args.dueDate, timeContext);
      if (args.dueTime !== undefined) task.dueTime = args.dueTime;
      if (args.priority !== undefined) task.priority = args.priority;
      if (args.description !== undefined) task.description = args.description;
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'task_updated',
        description: `Tarea actualizada: "${task.title}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'task_updated',
        label: 'Tarea actualizada',
        details: task.title,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Tarea "${task.title}" actualizada con éxito en "${project.name}".`,
        task,
      };
    }

    case 'delete_project_task': {
      if (!Array.isArray(project.tasks)) project.tasks = [];
      let taskIndex = -1;

      if (args.taskId) {
        taskIndex = project.tasks.findIndex((t: any) => t.id === args.taskId);
      }
      if (taskIndex === -1 && args.taskTitleMatch) {
        const query = String(args.taskTitleMatch).trim().toLowerCase();
        taskIndex = project.tasks.findIndex(
          (t: any) =>
            t.title.toLowerCase() === query ||
            t.title.toLowerCase().includes(query) ||
            query.includes(t.title.toLowerCase())
        );
      }

      if (taskIndex === -1) {
        return {
          success: false,
          error: `No se encontró la tarea para eliminar en "${project.name}".`,
        };
      }

      const deletedTask = project.tasks.splice(taskIndex, 1)[0];
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'task_deleted',
        description: `Tarea eliminada: "${deletedTask.title}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'task_deleted',
        label: 'Tarea eliminada',
        details: deletedTask.title,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Tarea "${deletedTask.title}" eliminada de "${project.name}".`,
      };
    }

    case 'set_next_step': {
      const oldStep = project.nextStep;
      project.nextStep = String(args.nextStep || '').trim();
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'next_step_changed',
        description: `Próximo paso actualizado: "${project.nextStep}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'next_step_changed',
        label: 'Próximo paso actualizado',
        details: project.nextStep,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Próximo paso de "${project.name}" actualizado a: "${project.nextStep}" (anterior: "${oldStep || 'sin definir'}").`,
      };
    }

    case 'record_decision': {
      const newDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        title: String(args.title || '').trim(),
        description: args.description ? String(args.description).trim() : 'Decisión acordada en la conversación con el asistente.',
        date: args.date || timeContext.currentDate,
        createdAt: nowIso,
      };

      if (!Array.isArray(project.decisions)) project.decisions = [];
      project.decisions.unshift(newDecision);
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'decision_added',
        description: `Decisión registrada: "${newDecision.title}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'decision_added',
        label: 'Decisión registrada',
        details: newDecision.title,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Decisión registrada con éxito en "${project.name}": "${newDecision.title}".`,
        decision: newDecision,
      };
    }

    case 'record_idea': {
      const newIdea = {
        id: `idea-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        title: String(args.title || '').trim(),
        description: args.description ? String(args.description).trim() : '',
        date: timeContext.currentDate,
        createdAt: nowIso,
      };

      if (!Array.isArray(project.ideas)) project.ideas = [];
      project.ideas.unshift(newIdea);
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'idea_added',
        description: `Idea registrada: "${newIdea.title}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'idea_added',
        label: 'Idea registrada',
        details: newIdea.title,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Idea guardada en la memoria de "${project.name}": "${newIdea.title}".`,
        idea: newIdea,
      };
    }

    case 'record_blocker': {
      const title = String(args.title || '').trim();
      const newBlocker = {
        id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        title,
        description: args.description ? String(args.description).trim() : '',
        status: 'activo',
        createdAt: nowIso,
      };

      if (!Array.isArray(project.blockers)) project.blockers = [];
      project.blockers.unshift(newBlocker);
      project.updatedAt = nowIso;

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: 'project_updated',
        description: `Bloqueo detectado: "${title}"`,
        timestamp: nowIso,
      });

      accumulatedActions.push({
        type: 'blocker_recorded',
        label: 'Bloqueo registrado',
        details: title,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Bloqueo registrado en "${project.name}": "${title}".`,
        blocker: newBlocker,
      };
    }

    case 'update_project_activity': {
      const desc = String(args.description || '').trim();
      const newAct = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: args.type || 'project_updated',
        description: desc,
        timestamp: nowIso,
      };

      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift(newAct);
      project.updatedAt = nowIso;

      accumulatedActions.push({
        type: 'activity_logged',
        label: 'Actividad registrada',
        details: desc,
        projectId: project.id,
      });

      return {
        success: true,
        message: `Actividad registrada en "${project.name}": "${desc}".`,
      };
    }

    default:
      return {
        success: false,
        error: `Herramienta desconocida: "${toolName}".`,
      };
  }
}

// ==========================================
// GEMINI MULTI-TURN FUNCTION CALLING LOOP
// ==========================================
async function runGeminiConversationWithTools(
  ai: GoogleGenAI,
  messages: any[],
  systemInstruction: string,
  liveProjects: any[],
  liveEvents: any[],
  activeProjectId: string | undefined,
  timeContext: DeviceTimeContext,
  accumulatedActions: ActionExecuted[],
  enableTools: boolean = true
): Promise<{ reply: string; modelUsed: string } | null> {
  for (const model of CANDIDATE_MODELS) {
    try {
      // Build conversation contents ensuring alternating roles
      const conversationContents: any[] = [];
      const recent = messages.slice(-10);

      for (const m of recent) {
        const role = m.role === 'assistant' ? 'model' : 'user';
        const text = m.content || '';
        conversationContents.push({
          role,
          parts: [{ text }],
        });
      }

      // Ensure last message is from user
      if (conversationContents.length === 0 || conversationContents[conversationContents.length - 1].role !== 'user') {
        const last = messages[messages.length - 1];
        conversationContents.push({
          role: 'user',
          parts: [{ text: last?.content || '' }],
        });
      }

      const generateConfig: any = {
        systemInstruction,
      };
      if (enableTools) {
        generateConfig.tools = [{ functionDeclarations: toolDeclarations }];
      }

      let response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: conversationContents,
          config: generateConfig,
        }),
        new Promise<any>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout model ${model}`)), 10000)
        ),
      ]);

      // If casual conversation without tools, return immediate response
      if (!enableTools) {
        const replyText = response.text || '';
        if (replyText.trim()) {
          return {
            reply: replyText.trim(),
            modelUsed: model,
          };
        }
      }

      let iterations = 0;
      const lastToolMessages: string[] = [];
      while (response && response.functionCalls && response.functionCalls.length > 0 && iterations < 5) {
        iterations++;
        const currentCalls = response.functionCalls;
        console.log(`[Gemini Function Calling] Model (${model}) called ${currentCalls.length} tool(s) in iteration ${iterations}:`, currentCalls.map((c: any) => c.name));

        // Save model's turn into conversation history
        const modelCandidate = response.candidates?.[0]?.content;
        if (modelCandidate) {
          conversationContents.push(modelCandidate);
        }

        // Execute all tools called by Gemini
        const toolResponseParts: any[] = [];
        for (const call of currentCalls) {
          if (!call.name) continue;
          const result = executeTool(
            call.name,
            call.args || {},
            liveProjects,
            liveEvents,
            activeProjectId,
            timeContext,
            accumulatedActions
          );
          if (result && typeof result.message === 'string') {
            lastToolMessages.push(result.message);
          }
          toolResponseParts.push({
            functionResponse: {
              name: call.name,
              id: (call as any).id,
              response: { output: result },
            },
          });
        }

        // Push tool responses turn
        conversationContents.push({
          role: 'tool',
          parts: toolResponseParts,
        });

        // Request next turn from Gemini with the tool execution outputs with timeout protection
        try {
          response = await Promise.race([
            ai.models.generateContent({
              model,
              contents: conversationContents,
              config: {
                systemInstruction,
                tools: [{ functionDeclarations: toolDeclarations }],
              },
            }),
            new Promise<any>((_, reject) =>
              setTimeout(() => reject(new Error('Follow-up turn timeout')), 10000)
            ),
          ]);
        } catch (followUpErr) {
          console.info(`[Gemini Follow-up] Secondary turn finalized with synthesized actions for model ${model}`);
          break;
        }
      }

      let finalReply = response?.text?.trim();
      if (!finalReply || finalReply === 'Entendido.') {
        if (accumulatedActions.length > 0) {
          const actionSummaries = accumulatedActions.map(a => `• **${a.label}**: ${a.details}`).join('\n');
          finalReply = `He procesado tu solicitud y actualizado el proyecto correctamente:\n\n${actionSummaries}\n\n¿Deseas avanzar en el siguiente paso o registrar alguna otra acción?`;
        } else if (lastToolMessages.length > 0) {
          finalReply = lastToolMessages.join('\n\n');
        }
      }
      return { reply: finalReply || 'Entendido.', modelUsed: model };
    } catch (err: any) {
      const statusCode = err?.status || err?.code || (err?.error?.code) || (err?.message?.includes('429') ? 429 : err?.message?.includes('503') ? 503 : 500);
      const isQuotaOrDemand = statusCode === 429 || statusCode === 503 || statusCode === 'RESOURCE_EXHAUSTED' || statusCode === 'UNAVAILABLE';
      const isTimeout = err?.message?.toLowerCase().includes('timeout');
      if (isQuotaOrDemand) {
        console.info(`[Gemini Model Cascade] Model ${model} unavailable (${statusCode}), switching to next candidate...`);
      } else if (isTimeout) {
        console.info(`[Gemini Model Cascade] Model ${model} latency threshold reached, switching to next candidate...`);
      } else {
        console.info(`[Gemini Model Cascade] Model ${model} switching to next candidate (${err?.status || 'fallback'})...`);
      }
      // Wait slightly and try next model candidate in cascade
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  return null;
}

// Transcription candidate models
const TRANSCRIBE_MODELS = [
  'gemini-3.5-transcribe',
  'gemini-3.8-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
];

// Helper to clean markdown text for natural speech synthesis
function cleanTextForSpeech(text: string): string {
  if (!text) return '';
  return text
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Remove inline code
    .replace(/`([^`]+)`/g, '$1')
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, '')
    // Remove bold and italics
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // Remove markdown links [title](url) -> title
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove images ![alt](url) -> empty
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Replace list bullets and numbers with natural pauses
    .replace(/^[\s]*[-*•]\s+/gm, '. ')
    .replace(/^[\s]*\d+\.\s+/gm, '. ')
    // Replace multiple spaces and newlines
    .replace(/\n+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ==========================================
// POST /api/transcribe-audio & /api/transcribe
// Multimodal voice-to-text with Gemini cascade
// ==========================================
const handleTranscription = async (req: express.Request, res: express.Response) => {
  try {
    const { audioBase64, mimeType = 'audio/mp3', clientHint = '' } = req.body;

    if (!audioBase64 || typeof audioBase64 !== 'string') {
      if (clientHint && typeof clientHint === 'string' && clientHint.trim()) {
        return res.json({ success: true, text: clientHint.trim() });
      }
      return res.status(400).json({ error: 'Se requiere audioBase64 para transcribir' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      if (clientHint) {
        return res.json({ success: true, text: clientHint.trim() });
      }
      return res.status(500).json({ error: 'GEMINI_API_KEY no configurada en el servidor' });
    }

    // Clean data URL prefix if present
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const normalizedMime = (mimeType || 'audio/webm').trim();

    let transcribedText = '';
    let lastError: any = null;

    for (const model of TRANSCRIBE_MODELS) {
      try {
        const contents: any[] = [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64,
                },
              },
              {
                text: 'Transcribe este audio con máxima fidelidad en español. Capta susurros, voz suave, murmullos y frases rápidas. Si el audio contiene voz, transcribe palabra por palabra sin omitir nada. Devuelve únicamente el texto transcrito directo, sin comillas ni notas.',
              },
            ],
          },
        ];

        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents,
          }),
          new Promise<any>((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout transcribe on ${model}`)), 15000)
          ),
        ]);

        let extracted = '';
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        for (const p of parts) {
          if ((p as any).audioTranscription?.text) {
            extracted += (p as any).audioTranscription.text;
          } else if (p.text) {
            extracted += p.text;
          }
        }
        if (!extracted && response.text) {
          extracted = response.text;
        }

        extracted = extracted ? extracted.trim() : '';

        if (
          extracted &&
          extracted !== '<noise>' &&
          extracted !== '<silence>' &&
          !extracted.toLowerCase().startsWith('silencio') &&
          !extracted.toLowerCase().includes('no se detecta')
        ) {
          transcribedText = extracted;
          console.log(`[Audio Transcribe] Exitosamente transcrito con modelo ${model}: "${transcribedText.slice(0, 60)}..."`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        if (msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE')) {
          console.info(`[Audio Transcribe] Modelo ${model} no disponible temporalmente (503), pasando al siguiente candidato.`);
        } else {
          console.info(`[Audio Transcribe] Modelo ${model} no completó transcripción, pasando al siguiente candidato.`);
        }
      }
    }

    // If server models couldn't extract or detected silence, check if local whisper recognition captured it
    if (!transcribedText && clientHint && clientHint.trim()) {
      console.log(`[Audio Transcribe] Usando clientHint de alta sensibilidad: "${clientHint}"`);
      return res.json({ success: true, text: clientHint.trim() });
    }

    if (!transcribedText && !lastError) {
      return res.json({
        success: true,
        text: '',
        isSilence: true,
        message: 'No se detectó voz clara en el audio grabado',
      });
    }

    if (!transcribedText) {
      if (clientHint) {
        return res.json({ success: true, text: clientHint.trim() });
      }
      return res.status(200).json({
        success: false,
        text: '',
        error: 'No se pudo transcribir el audio.',
        details: lastError?.message || 'Sin respuesta del modelo',
      });
    }

    return res.json({ success: true, text: transcribedText });
  } catch (err: any) {
    console.error('[Audio Transcribe Error]:', err);
    return res.status(500).json({ error: 'Error procesando el audio', details: err?.message });
  }
};

app.post('/api/transcribe-audio', handleTranscription);
app.post('/api/transcribe', handleTranscription);

// ==========================================
// POST /api/tts
// Convert text to speech using msedge-tts (es-MX-JorgeNeural)
// ==========================================
app.post('/api/tts', async (req, res) => {
  try {
    const { text, voice = 'es-MX-JorgeNeural' } = req.body;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({ error: 'El parámetro "text" es obligatorio.' });
    }

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) {
      return res.status(400).json({ error: 'El texto no contiene contenido legible.' });
    }

    // Truncate to reasonable length for responsive voice reply (up to 1200 chars)
    const truncatedText = cleanText.length > 1200 ? cleanText.slice(0, 1197) + '...' : cleanText;

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const stream = tts.toStream(truncatedText).audioStream;
    const chunks: Buffer[] = [];

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve());
        stream.on('error', (err: any) => reject(err));
      }),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('TTS timeout de generación')), 12000)
      ),
    ]);

    const audioBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(audioBuffer);
  } catch (err: any) {
    console.error('[TTS Error]:', err);
    return res.status(500).json({
      error: 'Error generando la síntesis de voz',
      details: err?.message,
    });
  }
});

// ==========================================
// POST /api/chat - Main Conversational Endpoint
// ==========================================
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, projectContext, eventsContext, isGeneral, projectId, timeContext: clientTimeContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const lastUserMessage = messages[messages.length - 1];
    const ai = getGeminiClient();

    // Reconstruct time context (client device anchor or server current fallback)
    const now = new Date();
    const defaultDate = now.toISOString().split('T')[0];
    const timeContext: DeviceTimeContext = clientTimeContext || {
      currentDate: defaultDate,
      currentTime: now.toTimeString().split(' ')[0],
      formattedDate: defaultDate,
      weekday: 'hoy',
      timezone: 'UTC',
      timezoneOffsetMinutes: 0,
      tomorrowDate: new Date(now.getTime() + 86400000).toISOString().split('T')[0],
      yesterdayDate: new Date(now.getTime() - 86400000).toISOString().split('T')[0],
    };

    // Prepare mutable in-memory live projects array
    let liveProjects: any[] = [];
    if (Array.isArray(projectContext)) {
      liveProjects = JSON.parse(JSON.stringify(projectContext));
    } else if (projectContext && typeof projectContext === 'object') {
      liveProjects = [JSON.parse(JSON.stringify(projectContext))];
    }

    // Prepare mutable in-memory live calendar events array
    let liveEvents: any[] = [];
    if (Array.isArray(eventsContext)) {
      liveEvents = JSON.parse(JSON.stringify(eventsContext));
    }

    const activeProjectId = projectId || (isGeneral ? 'general' : liveProjects[0]?.id);
    const accumulatedActions: ActionExecuted[] = [];

    // Quick intent classification to avoid deep portfolio analysis on casual chat
    const userText = String(lastUserMessage?.content || '').trim();
    const textLower = userText.toLowerCase();

    // ==============================================================
    // CONTROLADOR DE SEGURIDAD Y BORRADO DE PROYECTOS (delete_project)
    // ==============================================================
    const pending = resolvePendingDeletion(messages, liveProjects);

    // Caso D: Si hay una eliminación pendiente y el usuario decide cancelar
    const isCancelRequest =
      /^(?:no|cancelar|cancela|mejor no|d[eé]jalo|olv[ií]dalo|ya no|no lo borres|no borres)$/i.test(userText.trim()) ||
      /(?:mejor no|cancela la eliminaci[oó]n|cancelar la eliminaci[oó]n|no lo borres|no borrar)/i.test(textLower);

    if (pending && isCancelRequest) {
      const cancelledName = pending.projectName;
      activePendingDeletion = null;
      return res.json({
        reply: `Se ha cancelado la eliminación del proyecto ‘${cancelledName}’. El proyecto permanece intacto.`,
        actionsExecuted: [],
        memoryUpdates: [],
        updatedProjects: liveProjects,
        updatedProject: liveProjects.find((p) => p.id === activeProjectId),
        updatedEvents: liveEvents,
        provider: 'system-safety',
      });
    }

    // Detectar si el usuario está solicitando eliminar un proyecto (Turno 1 o cambio de proyecto objetivo)
    const isTaskDeletion = textLower.includes('tarea') || textLower.includes('pendiente');
    const isEventDeletion = textLower.includes('reunión') || textLower.includes('reunion') || textLower.includes('evento') || textLower.includes('cita');
    const isExplicitProjectDeletion =
      !isTaskDeletion &&
      !isEventDeletion &&
      (/(?:borra|borrar|elimina|eliminar|suprime|suprimir|destruye|destruir)\s+(?:este\s+proyecto|ese\s+proyecto|el\s+proyecto|proyecto)/i.test(textLower) ||
        /^(?:borra|borrar|elimina|eliminar)\s+/i.test(userText.trim()) ||
        /(?:quiero|deseo|necesito)\s+(?:borrar|eliminar)\s+(?:este\s+|el\s+)?proyecto/i.test(textLower));

    // Si el usuario solicita borrar un proyecto:
    if (isExplicitProjectDeletion) {
      // 1. Identificar proyecto objetivo
      let targetProj = null;

      // Buscar coincidencia por nombre en liveProjects
      for (const p of liveProjects) {
        if (textLower.includes(p.name.toLowerCase())) {
          targetProj = p;
          break;
        }
      }

      // Si no fue nombrado explícitamente, pero el usuario dice "este proyecto" / "ese proyecto" o está en project chat:
      if (!targetProj) {
        if (activeProjectId && activeProjectId !== 'general') {
          targetProj = liveProjects.find((p) => p.id === activeProjectId) || null;
        } else if (liveProjects.length === 1) {
          targetProj = liveProjects[0];
        }
      }

      if (!targetProj) {
        return res.json({
          reply: '¿Qué proyecto deseas eliminar? Por favor indica el nombre exacto del proyecto que quieres borrar.',
          actionsExecuted: [],
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: 'system-safety',
        });
      }

      // Generar código dinámico vinculado al proyecto objetivo
      const code = generateConfirmationCode(targetProj.name);
      activePendingDeletion = {
        projectId: targetProj.id,
        projectName: targetProj.name,
        confirmationCode: code,
        createdAt: Date.now(),
      };

      return res.json({
        reply: `Vas a eliminar permanentemente el proyecto ‘${targetProj.name}’. Esta acción no se puede deshacer.\n\nPara confirmar, escribe exactamente: ${code}`,
        actionsExecuted: [],
        memoryUpdates: [],
        updatedProjects: liveProjects,
        updatedProject: liveProjects.find((p) => p.id === activeProjectId),
        updatedEvents: liveEvents,
        provider: 'system-safety',
      });
    }

    // Si existe una eliminación pendiente y el usuario envía una respuesta:
    if (pending) {
      const cleanUpper = userText.trim().toUpperCase().replace(/[.,!]/g, '');
      const codeRegex = new RegExp(`\\b${pending.confirmationCode}\\b`, 'i');
      const isExactCode = cleanUpper === pending.confirmationCode || codeRegex.test(userText);

      // Caso C: Usuario escribe exactamente el código de seguridad
      if (isExactCode) {
        executeTool(
          'delete_project',
          {
            projectId: pending.projectId,
            projectName: pending.projectName,
            confirmationCode: pending.confirmationCode,
          },
          liveProjects,
          liveEvents,
          activeProjectId,
          timeContext,
          accumulatedActions
        );

        activePendingDeletion = null;

        return res.json({
          reply: `Proyecto ‘${pending.projectName}’ eliminado correctamente.`,
          actionsExecuted: accumulatedActions,
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: 'system-safety',
        });
      }

      // Caso E: Usuario ingresó un código erróneo o que no coincide
      const codePattern = /\b([A-Z0-9]{3,}-\d{2,})\b/i;
      const matchedOtherCode = userText.match(codePattern);
      if (matchedOtherCode && matchedOtherCode[1].toUpperCase() !== pending.confirmationCode) {
        return res.json({
          reply: `El código de confirmación ingresado no coincide con el código requerido (**${pending.confirmationCode}**) para eliminar ‘${pending.projectName}’. El proyecto permanece intacto. Por favor, escribe exactamente el código mostrado para proceder, o 'cancelar' si cambiaste de idea.`,
          actionsExecuted: [],
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: 'system-safety',
        });
      }

      // Caso B: Confirmación ambigua ("sí", "dale", "confirmo", "hazlo", "bórralo", "ok", etc.)
      const isAmbiguousConfirm =
        /^(?:s[íi]|dale|confirmo|hazlo|b[oó]rralo|elim[ií]nalo|ok|adelante|procede|claro|por favor|s[íi],\s*b[oó]rralo|si,\s*borralo|dale,\s*b[oó]rralo|hazlo\s*ya)$/i.test(userText.trim()) ||
        /(?:s[íi],?\s*b[oó]rralo|dale,?\s*elim[ií]nalo|confirmo\s*la\s*eliminaci[oó]n)/i.test(textLower);

      if (isAmbiguousConfirm) {
        return res.json({
          reply: `Para confirmar la eliminación permanente del proyecto ‘${pending.projectName}’, debes escribir exactamente el código de seguridad: **${pending.confirmationCode}**\n\nSi prefieres no eliminarlo, escribe 'cancelar' o 'mejor no'.`,
          actionsExecuted: [],
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: 'system-safety',
        });
      }
    }

    // Construct comprehensive system instruction with temporal context and tool instructions
    let systemInstruction = '';
    if (isGeneral) {
      systemInstruction = `Eres el Director de Estrategia e Inteligencia de "Project OS", un sistema personal y autónomo de alta fidelidad donde el usuario gestiona sus proyectos, tareas y calendario.

CONTEXTO TEMPORAL DEL USUARIO (DISPOSITIVO):
- Fecha actual: ${timeContext.formattedDate} (${timeContext.currentDate})
- Hora actual: ${timeContext.currentTime} (Zona horaria: ${timeContext.timezone})
- Día de la semana: ${timeContext.weekday}
- Mañana será: ${timeContext.tomorrowDate}
- Ayer fue: ${timeContext.yesterdayDate}

EVENTOS ACTUALMENTE AGENDADOS EN EL CALENDARIO:
${JSON.stringify(
  liveEvents.map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    status: e.status,
    project: e.projectName,
  })),
  null,
  2
)}

PORTFOLIO DE PROYECTOS DEL USUARIO:
${JSON.stringify(
  liveProjects.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    status: p.status,
    mainGoal: p.mainGoal,
    nextStep: p.nextStep,
    pendingTasksCount: p.tasks?.filter((t: any) => t.status === 'pendiente').length || 0,
    tasks: p.tasks?.map((t: any) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, priority: t.priority })),
    decisionsCount: p.decisions?.length || 0,
    ideasCount: p.ideas?.length || 0,
  })),
  null,
  2
)}

CAPACIDAD MULTITAREA Y LENGUAJE NATURAL FLUIDO:
1. El usuario puede hablarte corrido, mezclar varias cosas en una sola frase o párrafo (por ejemplo: una reunión para mañana, dos tareas que tiene que hacer y una idea nueva).
2. TIENES LA INTELIGENCIA para captar cada intención en lenguaje natural sin requerir comandos rígidos ni palabras clave exactas.
3. SI DETECTAS MÚLTIPLES ACCIONES en un solo mensaje, DEBES LLAMAR A LAS HERRAMIENTAS CORRESPONDIENTES TANTAS VECES COMO SEA NECESARIO en la misma respuesta (ej. 2 llamadas a create_project_task y 1 llamada a create_calendar_event).

ASIGNACIÓN INTELIGENTE DE PROYECTO (CRUCIAL):
- Cuando el usuario mencione una tarea, analiza a cuál de sus proyectos pertenece por temática, palabras clave o contexto.
- Si la tarea claramente pertenece a un proyecto existente (ej. "diseñar el logo" ➔ "Negocio de Reseñas" o el proyecto correspondiente), indica el nombre del proyecto en projectId.
- Si la tarea es personal, cotidiana o no tiene relación con ningún proyecto existente (ej. "comprar repuestos para el auto", "comprar leche", "renovar el pasaporte"), NO la asignes a un proyecto de negocios o tecnología no relacionado. Deja projectId vacío o como "Personal & General" para que se guarde en la bandeja adecuada.

REGLA DE ORO DE ACCIONES (SIN ALUCINACIONES):
- Si el usuario menciona una reunión, llamada o cita con fecha/hora (ej. "mañana a las 4", "reunión el viernes", "llamada a las 15:00"): DEBES INVOCAR create_calendar_event. NUNCA respondas en texto que agendaste la reunión si no llamaste a la herramienta.
- Si el usuario menciona tareas o pendientes por hacer: DEBES INVOCAR create_project_task. NUNCA respondas en texto que creaste la tarea si no llamaste a la herramienta.
- Si el usuario solo comparte una charla casual o personal (anécdotas, comida, películas, saludo): responde cálidamente con empatía en 1 o 2 párrafos sin forzar herramientas.

DIRECTIVAS Y FUNCTION CALLING:
1. Tienes herramientas para gestionar eventos del calendario: create_calendar_event, update_calendar_event, delete_calendar_event, check_calendar_availability.
2. Tienes herramientas para gestionar proyectos y tareas: create_project, delete_project, create_project_task, complete_project_task, update_project_task, delete_project_task, set_next_step, record_decision, record_idea, record_blocker.
3. Si el usuario pide crear un proyecto o convertir una idea en proyecto explícitamente, SIEMPRE llama inmediatamente a create_project.
4. Responde con un resumen claro, conciso y natural de lo realizado en español.
`;
    } else {
      const activeProj = liveProjects.find((p) => p.id === activeProjectId) || liveProjects[0];
      systemInstruction = `Eres el Agente Especializado y Copiloto del proyecto "${activeProj?.name || 'Proyecto'}" en "Project OS".

CONTEXTO TEMPORAL DEL USUARIO (DISPOSITIVO):
- Fecha actual: ${timeContext.formattedDate} (${timeContext.currentDate})
- Hora actual: ${timeContext.currentTime} (Zona horaria: ${timeContext.timezone})
- Día de la semana: ${timeContext.weekday}
- Mañana será: ${timeContext.tomorrowDate}
- Ayer fue: ${timeContext.yesterdayDate}

EVENTOS AGENDADOS EN EL CALENDARIO:
${JSON.stringify(
  liveEvents.map((e: any) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: e.location,
    project: e.projectName,
  })),
  null,
  2
)}

CONTEXTO DEL PROYECTO ACTUAL ("${activeProj?.name}"):
- ID: ${activeProj?.id}
- Nombre: ${activeProj?.name}
- Categoría: ${activeProj?.category}
- Estado: ${activeProj?.status}
- Objetivo Principal: ${activeProj?.mainGoal}
- Próximo Paso Actual: ${activeProj?.nextStep}
- Tareas Existentes:
${JSON.stringify(
  activeProj?.tasks?.map((t: any) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    dueDate: t.dueDate,
    dueTime: t.dueTime,
    priority: t.priority,
  })) || [],
  null,
  2
)}
- Decisiones Previas: ${JSON.stringify(activeProj?.decisions?.map((d: any) => ({ title: d.title, date: d.date })) || [])}
- Ideas: ${JSON.stringify(activeProj?.ideas?.map((i: any) => i.title) || [])}
- Hitos: ${JSON.stringify(activeProj?.milestones?.map((m: any) => ({ title: m.title, completed: m.completed })) || [])}

CAPACIDAD MULTITAREA Y LENGUAJE NATURAL FLUIDO:
1. El usuario puede hablarte corrido y expresar múltiples cosas en una sola intervención.
2. Si detectas tareas para este proyecto ("tengo que...", "hay que..."), LLAMA A create_project_task asociadas a este proyecto.
3. Si detectas una reunión o llamada con fecha/hora, LLAMA A create_calendar_event.
4. Si el usuario te habla de forma relajada o casual, responde de forma empática y reflexiva.
5. REGLA DE ORO: NUNCA afirmes haber agendado o creado una tarea o evento si no has ejecutado la herramienta correspondiente.
`;
    }

    if (ai) {
      const geminiResult = await runGeminiConversationWithTools(
        ai,
        messages,
        systemInstruction,
        liveProjects,
        liveEvents,
        activeProjectId,
        timeContext,
        accumulatedActions,
        true // Always enable tools so Gemini can call actions organically from natural language
      );

      if (geminiResult) {
        const updatedProject = liveProjects.find((p) => p.id === activeProjectId);

        return res.json({
          reply: geminiResult.reply,
          actionsExecuted: accumulatedActions,
          memoryUpdates: accumulatedActions.map((act) => ({
            id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            type: act.type.includes('decision')
              ? 'decision'
              : act.type.includes('next_step')
              ? 'next_step'
              : act.type.includes('idea')
              ? 'idea'
              : act.type.includes('blocker')
              ? 'problem'
              : 'task',
            title: act.details,
            description: act.label,
            applied: true,
          })),
          updatedProjects: liveProjects,
          updatedProject: updatedProject || undefined,
          updatedEvents: liveEvents,
          provider: 'gemini',
          model: geminiResult.modelUsed,
        });
      }

      console.warn('[Gemini Provider] External models temporarily unavailable, serving seamlessly with local intelligence engine.');
    }

    // Local fallback with simulated tool executions if Gemini is unavailable or key not configured
    const projectNames = liveProjects.map((p) => p.name).filter(Boolean);
    const isProjectRelated = isProjectOSIntent(userText, projectNames);

    const localResult = executeLocalIntelligentEngine(
      lastUserMessage.content,
      liveProjects,
      liveEvents,
      activeProjectId,
      isGeneral,
      timeContext,
      accumulatedActions,
      isProjectRelated
    );

    const updatedProject = liveProjects.find((p) => p.id === activeProjectId);

    return res.json({
      reply: localResult.reply,
      actionsExecuted: accumulatedActions,
      memoryUpdates: accumulatedActions.map((act) => ({
        id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        type: act.type.includes('decision')
          ? 'decision'
          : act.type.includes('next_step')
          ? 'next_step'
          : act.type.includes('idea')
          ? 'idea'
          : act.type.includes('blocker')
          ? 'problem'
          : 'task',
        title: act.details,
        description: act.label,
        applied: true,
      })),
      updatedProjects: liveProjects,
      updatedProject: updatedProject || undefined,
      updatedEvents: liveEvents,
      provider: 'local-intelligence',
    });
  } catch (error: any) {
    console.warn('[API /api/chat] Error handled gracefully with fallback:', error?.message || error);
    return res.json({
      reply: 'Ha ocurrido un inconveniente temporal procesando la consulta. El sistema se mantiene operativo.',
      actionsExecuted: [],
      memoryUpdates: [],
      provider: 'fallback',
      warning: error?.message,
    });
  }
});

// ==========================================
// LOCAL INTELLIGENT ENGINE (FALLBACK)
// ==========================================
function executeLocalIntelligentEngine(
  userText: string,
  liveProjects: any[],
  liveEvents: any[],
  activeProjectId: string | undefined,
  isGeneral: boolean,
  timeContext: DeviceTimeContext,
  accumulatedActions: ActionExecuted[],
  isProjectRelated?: boolean
): { reply: string } {
  const text = (userText || '').toLowerCase();
  const targetProject = findTargetProject(liveProjects, undefined, activeProjectId, userText);
  const projName = targetProject?.name || 'este proyecto';

  const projectRelated =
    isProjectRelated !== undefined
      ? isProjectRelated
      : isProjectOSIntent(userText, liveProjects.map((p) => p.name));

  // Casual conversation: respond immediately and warmly without analyzing portfolio
  if (!projectRelated) {
    if (text.includes('pizza') || text.includes('comí') || text.includes('comi') || text.includes('comida') || text.includes('cena') || text.includes('almuerzo')) {
      return {
        reply: `¡Qué bien suena eso! Nada como disfrutar de una buena comida para recargar energías. ¿Qué tal estuvo?`,
      };
    }
    if (text.includes('película') || text.includes('pelicula') || text.includes('cine') || text.includes('serie')) {
      return {
        reply: `¡Qué buen plan! ¿Qué película o serie viste? ¿La recomendarías?`,
      };
    }
    if (text.includes('aburrido') || text.includes('aburrida')) {
      return {
        reply: `A veces desconectar y tener un momento libre es genial. Puedes relajarte un rato o, si te dan ganas de hacer algo, aquí estoy para conversar o planificar.`,
      };
    }
    if (text.includes('sabías') || text.includes('sabias')) {
      return {
        reply: `¡No lo sabía! Me encanta aprender datos curiosos e interesantes. Cuéntame más al respecto.`,
      };
    }
    if (text.includes('opinas') || text.includes('crees') || text.includes('qué te parece') || text.includes('que te parece')) {
      return {
        reply: `Me parece un punto muy interesante para reflexionar. Cuéntame un poco más de tu perspectiva.`,
      };
    }
    if (text.includes('te cuento') || text.includes('pasó') || text.includes('paso')) {
      return {
        reply: `¡Cuéntame! Te escucho con total atención.`,
      };
    }
    if (text.includes('hola') || text.includes('buenos') || text.includes('buenas')) {
      return {
        reply: `¡Hola! ¿Cómo va todo hoy? Aquí estoy para conversar o cuando quieras revisar algo de tus proyectos y tareas.`,
      };
    }

    return {
      reply: `¡Qué buen tema! Cuéntame más al respecto o dime si en algún momento deseas consultar o avanzar en algo de Project OS.`,
    };
  }

  // 0. Detect Explicit Project Creation (e.g. "Crea un proyecto llamado CV Smart", "Quiero crear un proyecto para mi negocio de reseñas", "Convierte esto en un proyecto", "Sí, créalo")
  const isExplicitCreateProject =
    text.includes('crea un proyecto') ||
    text.includes('crear un proyecto') ||
    text.includes('quiero crear un proyecto') ||
    text.includes('convierte esto en un proyecto') ||
    text.includes('convertir esto en un proyecto') ||
    text.includes('haz de esto un proyecto') ||
    text.includes('haz de todo lo que hemos hablado un proyecto') ||
    text.includes('registra esto como un nuevo proyecto') ||
    text.includes('crea un proyecto con esta idea') ||
    text.includes('crea un proyecto para esta idea') ||
    text.includes('quiero que esto sea un proyecto') ||
    /^(?:s[íi]|claro|dale)[,\s]+(?:cr[ée]alo|hazlo)/i.test(text);

  if (isExplicitCreateProject) {
    let extractedName = '';
    const namedMatch = userText.match(/(?:crea(?:r)?(?: un)? proyecto(?: llamado| nombrado)?)\s+["']?([^"'\n.,;]+)["']?/i);
    if (namedMatch && namedMatch[1].trim()) {
      extractedName = namedMatch[1].trim();
    } else {
      const forMatch = userText.match(/(?:crea(?:r)?(?: un)? proyecto para|proyecto para mi|proyecto para una?)\s+([^"'\n.,;]+)/i);
      if (forMatch && forMatch[1].trim()) {
        extractedName = forMatch[1].trim();
      }
    }

    if (!extractedName) {
      if (text.includes('cv smart')) extractedName = 'CV Smart';
      else if (text.includes('reseña') || text.includes('resenas')) extractedName = 'Negocio de Reseñas';
      else if (text.includes('inversiones')) extractedName = 'App de Inversiones';
      else if (text.includes('receta')) extractedName = 'App de Recetas';
      else extractedName = 'Nuevo Proyecto';
    }

    extractedName = extractedName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

    executeTool(
      'create_project',
      {
        name: extractedName,
        description: `Proyecto creado a partir de la conversación: "${userText}"`,
        category: extractedName.toLowerCase().includes('negocio') ? 'Negocio' : 'Producto',
        status: 'Activo',
      },
      liveProjects,
      liveEvents,
      activeProjectId,
      timeContext,
      accumulatedActions
    );

    return {
      reply: `He creado el proyecto **"${extractedName}"** inmediatamente según lo solicitado.\n\nYa está visible y disponible en tu lista de **Proyectos** para continuar estructurando sus objetivos, decisiones y tareas.`,
    };
  }

  // 1. Detect Calendar Event creation (e.g. "agenda una reunión con Juan mañana a las 4 de la tarde")
  if (
    text.includes('agenda') ||
    text.includes('agendar') ||
    text.includes('reunión') ||
    text.includes('reunion') ||
    text.includes('cita') ||
    (text.includes('llamada') && (text.includes('mañana') || text.includes('a las') || text.includes('hoy')))
  ) {
    // Resolve date
    let eventDate = timeContext.currentDate;
    if (text.includes('mañana')) eventDate = timeContext.tomorrowDate;
    else if (text.includes('pasado mañana')) {
      const [y, m, d] = timeContext.currentDate.split('-').map(Number);
      const dt = new Date(y, m - 1, d + 2);
      eventDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    }

    // Resolve time
    let startTime = '16:00';
    if (text.includes('4 de la tarde') || text.includes('las cuatro') || text.includes('las 4')) startTime = '16:00';
    else if (text.includes('5 de la tarde') || text.includes('las cinco') || text.includes('las 5')) startTime = '17:00';
    else if (text.includes('3 de la tarde') || text.includes('las tres') || text.includes('las 3')) startTime = '15:00';
    else if (text.includes('2 de la tarde') || text.includes('las dos') || text.includes('las 2')) startTime = '14:00';
    else if (text.includes('10 de la mañana') || text.includes('las diez') || text.includes('las 10')) startTime = '10:00';
    else if (text.includes('11 de la mañana') || text.includes('las once') || text.includes('las 11')) startTime = '11:00';
    else {
      const timeMatch = text.match(/a las (\d{1,2})(?::(\d{2}))?\s*(am|pm|de la tarde|de la mañana)?/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3] || '';
        if ((period.includes('pm') || period.includes('tarde')) && h < 12) h += 12;
        startTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      }
    }

    // Extract title
    let eventTitle = 'Reunión';
    const cleanMatch = userText.match(/(?:agenda(?:r)?|agendar una|agenda una|programa(?:r)?|crea un evento de)\s+([^.,;\n]+?)(?:\s+para\s+mañana|\s+mañana|\s+hoy|\s+a las|\.|$)/i);
    if (cleanMatch && cleanMatch[1].trim()) {
      eventTitle = cleanMatch[1].trim();
      eventTitle = eventTitle.charAt(0).toUpperCase() + eventTitle.slice(1);
    } else if (text.includes('reunión con') || text.includes('reunion con')) {
      const withMatch = userText.match(/reuni[óo]n con\s+([^.,;\n]+?)(?:\s+para\s+mañana|\s+mañana|\s+hoy|\s+a las|\.|$)/i);
      if (withMatch) eventTitle = `Reunión con ${withMatch[1].trim()}`;
    }

    const result = executeTool(
      'create_calendar_event',
      {
        title: eventTitle,
        date: eventDate,
        startTime,
        durationMinutes: 60,
        location: text.includes('meet') ? 'Google Meet' : text.includes('zoom') ? 'Zoom' : undefined,
      },
      liveProjects,
      liveEvents,
      activeProjectId,
      timeContext,
      accumulatedActions
    );

    return {
      reply: `He agendado en tu calendario: **"${eventTitle}"** para el día **${eventDate}** a las **${startTime}**.\n\nPuedes verlo y gestionarlo en la sección de **Calendario**, con la opción de exportarlo directamente a Google Calendar.`,
    };
  }

  // 2. Detect task completion (e.g. "ya terminé la pantalla de login")
  if (text.includes('ya terminé') || text.includes('ya termine') || text.includes('completé') || text.includes('complete la tarea') || text.includes('finalicé')) {
    const match = userText.match(/(?:ya terminé|ya termine|completé|complete|finalicé|terminé)(?:\s+la tarea)?\s+([^.,;\n]+)/i);
    const query = match ? match[1].trim() : userText;
    const result = executeTool('complete_project_task', { taskTitleMatch: query }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    if (result.success) {
      return {
        reply: `¡Excelente trabajo! He marcado la tarea **"${result.task?.title}"** como completada en **${projName}**.\n\nEsto hace avanzar el progreso de este ciclo. ¿Cuál es el siguiente ítem en el que quieres concentrarte?`,
      };
    }
  }

  // 3. Detect task creation (e.g. "para mañana crea una tarea llamada revisar la memoria", "mañana tengo que...")
  if (
    text.includes('crea una tarea') ||
    text.includes('crear una tarea') ||
    text.includes('tengo que') ||
    text.includes('hay que') ||
    text.includes('falta') ||
    text.includes('debo') ||
    text.includes('tarea:')
  ) {
    const isTomorrow = text.includes('mañana');
    const isToday = text.includes('hoy');
    const dueDate = isTomorrow ? timeContext.tomorrowDate : isToday ? timeContext.currentDate : undefined;

    let title = '';
    const namedMatch = userText.match(/(?:crea(?:r)? una tarea(?: para mañana)?(?: llamada| nombrada)?)\s+["']?([^"'\n.,;]+)["']?/i);
    if (namedMatch && namedMatch[1].trim()) {
      title = namedMatch[1].trim();
    } else {
      const match = userText.match(/(?:tengo que|hay que|falta|debo|tarea:?)\s+([^.,;\n]+)/i);
      title = match ? match[1].trim() : userText.substring(0, 50);
    }

    if (title.length > 3) {
      const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
      const result = executeTool('create_project_task', { title: cleanTitle, dueDate }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);

      return {
        reply: `He creado la tarea **"${cleanTitle}"**${dueDate ? ` con fecha límite para el **${dueDate}**` : ''} en **${targetProject?.name || 'Project OS'}**.\n\nAparecerá de inmediato en tu vista de **Tareas** para que no pierdas el foco.`,
      };
    }
  }

  // 3. Detect decisions (e.g. "decidí usar Gemini para esta parte")
  if (text.includes('decid') || text.includes('vamos a usar') || text.includes('optamos por') || text.includes('elegimos')) {
    const clean = userText.replace(/^(he decidido que|hemos decidido que|decidí que|decisión:|decidido:)/i, '').trim();
    const result = executeTool('record_decision', { title: clean, description: userText }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    return {
      reply: `He registrado formalmente la decisión en la memoria de **${projName}**:\n\n• **Decisión**: "${clean}"\n\nQueda documentada con fecha de hoy (${timeContext.currentDate}) para mantener trazabilidad estratégica del proyecto.`,
    };
  }

  // 4. Detect next steps (e.g. "mi próximo paso es...")
  if (text.includes('próximo paso') || text.includes('proximo paso') || text.includes('siguiente paso') || text.includes('ahora toca')) {
    const match = userText.match(/(?:próximo paso|proximo paso|siguiente paso|ahora toca)(?:\s+es|\s*:)?\s+([^.\n]+)/i);
    const nextStep = match ? match[1].trim() : userText.substring(0, 60);
    executeTool('set_next_step', { nextStep }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    return {
      reply: `Próximo paso de **${projName}** actualizado a:\n\n👉 **"${nextStep}"**\n\nTener un próximo paso singular y claro es la forma más rápida de avanzar sin sobrepensar.`,
    };
  }

  // 5. Detect ideas (e.g. "se me ocurrió...")
  if (text.includes('idea') || text.includes('se me ocurrió') || text.includes('podríamos')) {
    executeTool('record_idea', { title: userText }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    return {
      reply: `Idea registrada en la memoria de **${projName}**: "${userText}". La guardamos para cuando llegue el momento oportuno de iteración.`,
    };
  }

  // Caso B: Proyectos activos o consulta de proyectos
  if (text.includes('activos') || (text.includes('proyectos') && (text.includes('tengo') || text.includes('cuáles') || text.includes('cuales') || text.includes('estado')))) {
    const activeProjects = liveProjects.filter((p) => p.status === 'Activo');
    const listText = (activeProjects.length > 0 ? activeProjects : liveProjects)
      .map((p) => `• **${p.name}** [${p.status}] (${p.category}): Próximo paso ➔ _${p.nextStep || 'Sin definir'}_`)
      .join('\n');

    return {
      reply: `Actualmente tienes **${activeProjects.length} proyecto${activeProjects.length === 1 ? '' : 's'} activo${activeProjects.length === 1 ? '' : 's'}**:\n\n${listText}\n\n¿Quieres que profundicemos en alguno en particular?`,
    };
  }

  // Caso C: Tareas pendientes
  if (text.includes('pendiente') || text.includes('pendientes') || text.includes('tengo que hacer')) {
    const isTomorrow = text.includes('mañana');
    const targetDate = isTomorrow ? timeContext.tomorrowDate : timeContext.currentDate;
    const allTasks: string[] = [];
    liveProjects.forEach((p) => {
      (p.tasks || []).forEach((t: any) => {
        if (t.status === 'pendiente') {
          if (!isTomorrow || !t.dueDate || t.dueDate === targetDate) {
            allTasks.push(`• **${t.title}** (en _${p.name}_)${t.dueDate ? ` - Límite: ${t.dueDate}` : ''}`);
          }
        }
      });
    });

    if (allTasks.length > 0) {
      return {
        reply: `Aquí tienes las tareas pendientes ${isTomorrow ? 'para mañana' : 'actuales'}:\n\n${allTasks.slice(0, 6).join('\n')}\n\n¿Quieres que marquemos alguna como completada o agregar otra?`,
      };
    } else {
      return {
        reply: `¡Al día! No tienes tareas pendientes registradas para ${isTomorrow ? 'mañana' : 'hoy'}.`,
      };
    }
  }

  // Caso E: Memoria / en qué estaba trabajando
  if (text.includes('acuerdas') || text.includes('recuerdas') || text.includes('estaba trabajando') || text.includes('en qué estaba') || text.includes('en que estaba')) {
    const activeProj = liveProjects.find((p) => p.id === activeProjectId) || liveProjects.find((p) => p.status === 'Activo') || liveProjects[0];
    if (activeProj) {
      return {
        reply: `Sí, recuerdo perfectamente. En **${activeProj.name}** estuviste concentrado en:\n\n• **Objetivo**: ${activeProj.mainGoal || 'En desarrollo'}\n• **Próximo paso**: ${activeProj.nextStep || 'Por definir'}\n${activeProj.tasks?.find((t: any) => t.status === 'pendiente') ? `• **Tarea prioritaria**: ${activeProj.tasks.find((t: any) => t.status === 'pendiente')?.title}\n` : ''}\n¿Quieres retomar el trabajo desde este punto?`,
      };
    }
  }

  // General chat queries
  if (isGeneral) {
    const activeCount = liveProjects.filter((p) => p.status === 'Activo').length;
    if (text.includes('priorizar') || text.includes('hoy') || text.includes('enfoque')) {
      return {
        reply: `Analizando tu portfolio de **${liveProjects.length} proyectos** (${activeCount} en estado Activo):\n\n1. **Foco recomendado**: Dedica tu bloque principal al proyecto con el próximo paso más validable hoy.\n2. **Táctica diaria**: No intentes avanzar más de dos proyectos a fondo en la misma jornada para evitar la fatiga por cambio de contexto.\n\n¿Quieres que profundicemos en algún proyecto en particular?`,
      };
    }

    return {
      reply: `Como Director de Proyectos en **Project OS**, tengo visibilidad de todos tus proyectos (${liveProjects.map((p) => p.name).join(', ')}). Puedes pedirme crear tareas, actualizar próximos pasos o debatir estrategias para cualquiera de ellos.`,
    };
  }

  // Default conversational response for specific project
  return {
    reply: `Entendido sobre **${projName}**. Estoy al tanto de tus objetivos, tareas pendientes y próximos pasos. Cuéntame si quieres planificar, registrar alguna decisión o definir qué avanzar a continuación.`,
  };
}

// Development vs Production serving
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      plugins: [
        {
          name: 'silence-vite-hmr-logs',
          transform(code, id) {
            if (id.includes('vite/dist/client') || id.includes('@vite/client')) {
              return code
                .replaceAll('console.error("[vite]"', 'console.debug("[vite]"')
                .replaceAll('console.error(`[vite]', 'console.debug(`[vite]')
                .replaceAll('throw e;', '/* silenced HMR error */');
            }
          },
        },
      ],
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Project OS Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
