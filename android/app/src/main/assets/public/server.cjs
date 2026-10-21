var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  generateConfirmationCode: () => generateConfirmationCode,
  resolvePendingDeletion: () => resolvePendingDeletion
});
module.exports = __toCommonJS(server_exports);

// fix-dirname.js
delete globalThis.__dirname;

// server.ts
var import_express = __toESM(require("express"), 1);
var import_http = __toESM(require("http"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_vite = require("vite");
var import_msedge_tts = require("msedge-tts");

// src/utils/intentDetection.ts
function isProjectOSIntent(text, projectNames = []) {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase().trim();
  const projectActionKeywords = [
    "proyecto",
    "proyectos",
    "crea un proyecto",
    "crear un proyecto",
    "nuevo proyecto",
    "convierte esto en un proyecto",
    "convertir esto en un proyecto",
    "haz de esto un proyecto",
    "registra esto como un nuevo proyecto",
    "haz de todo lo que hemos hablado un proyecto",
    "crea un proyecto con esta idea",
    "crea un proyecto para esta idea",
    "quiero que esto sea un proyecto",
    "borra",
    "borrar",
    "elimina",
    "eliminar",
    "b\xF3rralo",
    "borralo",
    "elim\xEDnalo",
    "eliminalo",
    "suprime",
    "suprimir",
    "destruye",
    "destruir"
  ];
  if (projectActionKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  if (/^[A-Z0-9]{3,}-\d{2,}$/i.test(text.trim())) {
    return true;
  }
  if (/^(?:s[íi]|dale|confirmo|hazlo|ok|b[oó]rralo|elim[ií]nalo|mejor no|cancelar|cancela|d[eé]jalo|olv[ií]dalo)$/i.test(lower)) {
    return true;
  }
  if (/^(?:s[íi]|claro|dale)[,\s]+(?:cr[ée]alo|hazlo)/i.test(lower)) {
    return true;
  }
  const taskKeywords = [
    "tarea",
    "tareas",
    "pendiente",
    "pendientes",
    "por hacer",
    "to-do",
    "todo",
    "tengo que",
    "hay que",
    "falta hacer",
    "falta terminar",
    "debo hacer",
    "termin\xE9",
    "termine",
    "complet\xE9",
    "complete",
    "completar",
    "finalic\xE9",
    "finalice"
  ];
  if (taskKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  const calendarKeywords = [
    "agenda",
    "agendar",
    "reuni\xF3n",
    "reunion",
    "reuniones",
    "cita",
    "citas",
    "llamada con",
    "llamada a las",
    "calendario",
    "evento",
    "eventos",
    "horario"
  ];
  if (calendarKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  if (/(?:mañana|hoy|el viernes|el lunes|el martes|el miércoles|el miercoles|el jueves)\s+a\s+las\s+\d+/i.test(lower)) {
    return true;
  }
  const strategicKeywords = [
    "decisi\xF3n",
    "decision",
    "decisiones",
    "decid\xED",
    "decidi",
    "decidimos",
    "optamos por",
    "vamos a usar",
    "pr\xF3ximo paso",
    "proximo paso",
    "siguiente paso",
    "siguientes pasos",
    "ahora toca",
    "bloqueo",
    "bloqueos",
    "bloqueador",
    "bloqueadores",
    "impedimento",
    "hito",
    "hitos",
    "milestone",
    "roadmap"
  ];
  if (strategicKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  const portfolioKeywords = [
    "portfolio",
    "priorizar",
    "prioridad",
    "prioridades",
    "enfoque",
    "en qu\xE9 me enfoco",
    "en que me enfoco",
    "resumen general",
    "estado de",
    "avance de",
    "progreso",
    "acuerdas de",
    "recuerdas",
    "en qu\xE9 estaba",
    "en que estaba",
    "qu\xE9 estaba haciendo",
    "que estaba haciendo",
    "qu\xE9 est\xE1bamos",
    "que estabamos",
    "qu\xE9 proyectos",
    "que proyectos",
    "cu\xE1les est\xE1n activos",
    "cuales estan activos",
    "qu\xE9 tengo",
    "que tengo"
  ];
  if (portfolioKeywords.some((kw) => lower.includes(kw))) {
    return true;
  }
  if ((lower.includes("idea") || lower.includes("ocurri\xF3") || lower.includes("ocurrio") || lower.includes("pensando en")) && (lower.includes("app") || lower.includes("aplicaci\xF3n") || lower.includes("aplicacion") || lower.includes("negocio") || lower.includes("startup") || lower.includes("plataforma") || lower.includes("software") || lower.includes("sistema"))) {
    return true;
  }
  for (const name of projectNames) {
    if (name && name.trim().length >= 3) {
      if (lower.includes(name.toLowerCase().trim())) {
        return true;
      }
    }
  }
  return false;
}

// server.ts
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "25mb" }));
app.use(import_express.default.urlencoded({ limit: "25mb", extended: true }));
app.get("/api/health", (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== "");
  res.json({
    status: "ok",
    hasGeminiKey,
    model: "gemini-3.8-flash",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new import_genai.GoogleGenAI({ apiKey });
}
var CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest"
];
var activePendingDeletion = null;
function generateConfirmationCode(projectName) {
  const clean = projectName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  let prefix = "";
  if (words.length === 0) {
    prefix = "PROYECTO";
  } else if (words.length === 1) {
    prefix = words[0].toUpperCase().slice(0, 8);
  } else if (words[0].length <= 3 && words[1]) {
    prefix = (words[0] + words[1]).toUpperCase().slice(0, 8);
  } else {
    prefix = words[0].toUpperCase().slice(0, 8);
  }
  if (!prefix) prefix = "PROYECTO";
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randNum}`;
}
function resolvePendingDeletion(messages, liveProjects) {
  if (activePendingDeletion) {
    const exists = liveProjects.some((p) => p.id === activePendingDeletion.projectId);
    if (exists) {
      return activePendingDeletion;
    } else {
      activePendingDeletion = null;
    }
  }
  if (Array.isArray(messages) && messages.length >= 2) {
    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && typeof msg.content === "string") {
        const codeMatch = msg.content.match(/escribe exactamente:\s*([A-Z0-9]+-\d+)/i);
        if (codeMatch) {
          const code = codeMatch[1].trim().toUpperCase();
          const nameMatch = msg.content.match(/(?:eliminar permanentemente el proyecto|proyecto)\s+[‘'"]([^’'"]+)[’'"]/i);
          const name = nameMatch ? nameMatch[1].trim() : "";
          const found = liveProjects.find((p) => p.name.toLowerCase() === name.toLowerCase()) || liveProjects.find((p) => code.startsWith(p.name.slice(0, 3).toUpperCase()));
          if (found) {
            activePendingDeletion = {
              projectId: found.id,
              projectName: found.name,
              confirmationCode: code,
              createdAt: Date.now()
            };
            return activePendingDeletion;
          }
        }
      }
    }
  }
  return null;
}
var toolDeclarations = [
  {
    name: "create_project",
    description: 'Crea un nuevo proyecto en Project OS mediante Function Calling. REGLAS CR\xCDTICAS:\n1. SOLICITUD EXPL\xCDCITA = CREAR INMEDIATAMENTE: Si el usuario pide expl\xEDcitamente crear un proyecto (ej. "Crea un proyecto llamado CV Smart", "Quiero crear un proyecto para mi negocio de rese\xF1as", "Crea un proyecto con esta idea", "Quiero convertir esto en un proyecto", "Haz de esto un proyecto", "Registra esto como un nuevo proyecto", "Haz de todo lo que hemos hablado un proyecto", "Crea un proyecto para esta idea"), o si responde afirmativamente a una sugerencia previa de crearlo ("S\xED, cr\xE9alo", "S\xED, dale"), DEBES llamar inmediatamente a create_project sin pedir confirmaci\xF3n adicional. \xA1NUNCA preguntes "\xBFquieres que lo cree?" si el usuario ya lo pidi\xF3 expl\xEDcitamente!\n2. MENCIONAR UNA IDEA NO DEBE CREAR UN PROYECTO: Si el usuario simplemente menciona una idea, negocio, aplicaci\xF3n o posibilidad ("Estoy pensando en hacer una app para organizar mis inversiones", "Se me ocurri\xF3 hacer una aplicaci\xF3n para comparar precios"), NO llames a create_project. Conversa sobre la idea, anal\xEDzala y ay\xFAdalo a estructurarla.\n3. EL AGENTE PUEDE SUGERIR: Si la conversaci\xF3n muestra claramente que una iniciativa est\xE1 tomando suficiente forma como para manejarla como un proyecto independiente, puedes sugerir: "Esto parece algo que podr\xEDamos manejar como un proyecto independiente. \xBFQuieres que lo cree?". En este caso NO crees el proyecto todav\xEDa; espera a que el usuario responda.\n4. NO CREAR POR CAMBIO DE TEMA: Si el usuario cambia de tema ("Tambi\xE9n quiero aprender programaci\xF3n", "Tambi\xE9n quiero aprender fotograf\xEDa"), NO crees un proyecto.\n5. DISPONIBLE EN GENERAL CHAT Y PROJECT CHAT: La funci\xF3n debe poder ejecutarse tanto desde General Chat como desde Project Chat (creando un proyecto nuevo separado sin mezclarlo con el actual).',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        name: {
          type: import_genai.Type.STRING,
          description: 'Nombre breve, claro y distintivo del proyecto. Si el usuario lo proporcion\xF3 expl\xEDcitamente, \xFAsalo tal cual. Si no proporcion\xF3 un nombre pero el contexto permite identificarlo claramente, genera un nombre breve y descriptivo (ej. "CV Smart", "App de Recetas", "Negocio de Rese\xF1as").'
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Descripci\xF3n o contexto inicial del proyecto basado exclusivamente en la informaci\xF3n compartida por el usuario. No inventes informaci\xF3n que el usuario no haya proporcionado."
        },
        mainGoal: {
          type: import_genai.Type.STRING,
          description: "Objetivo principal identificable del proyecto cuando sea identificable."
        },
        nextStep: {
          type: import_genai.Type.STRING,
          description: "Primer paso o acci\xF3n inmediata para comenzar con el proyecto si fue identificado."
        },
        category: {
          type: import_genai.Type.STRING,
          description: 'Categor\xEDa del proyecto: "Producto", "Negocio", "Personal", "Experimento" u "Otro". Por defecto "Producto".'
        },
        status: {
          type: import_genai.Type.STRING,
          description: 'Estado inicial del proyecto: "Idea", "Planificaci\xF3n" o "Activo". Por defecto "Activo".'
        }
      },
      required: ["name"]
    }
  },
  {
    name: "delete_project",
    description: 'Elimina permanentemente un proyecto de Project OS y todas sus tareas, eventos e historial asociados. REGLA DE SEGURIDAD CR\xCDTICA: SOLO debe ejecutarse cuando el usuario haya introducido exactamente el c\xF3digo de seguridad din\xE1mico de confirmaci\xF3n (ej. LIMONADA-742) solicitado previamente. NUNCA debe llamarse ante solicitudes iniciales ni confirmaciones ambiguas (como "s\xED", "dale", "hazlo", "b\xF3rralo").',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID del proyecto a eliminar."
        },
        projectName: {
          type: import_genai.Type.STRING,
          description: "Nombre del proyecto a eliminar."
        },
        confirmationCode: {
          type: import_genai.Type.STRING,
          description: "C\xF3digo exacto de seguridad din\xE1mico que el usuario escribi\xF3 para confirmar la eliminaci\xF3n (ej. LIMONADA-742)."
        }
      },
      required: ["confirmationCode"]
    }
  },
  {
    name: "create_project_task",
    description: 'Crea una nueva tarea en un proyecto de Project OS. Se debe invocar SIEMPRE que el usuario mencione algo que tiene que hacer, terminar, implementar o revisar para un proyecto (ej. "Ma\xF1ana tengo que terminar la pantalla de login", "Hay que refactorizar el backend").',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto al que pertenece la tarea. Si se omite y el usuario est\xE1 conversando dentro de un proyecto, se asigna a ese proyecto autom\xE1ticamente."
        },
        title: {
          type: import_genai.Type.STRING,
          description: 'T\xEDtulo descriptivo y directo de la tarea (ej. "Terminar la pantalla de login").'
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Detalle opcional o contexto de la tarea."
        },
        dueDate: {
          type: import_genai.Type.STRING,
          description: 'Fecha l\xEDmite en formato YYYY-MM-DD. Si el usuario dice "ma\xF1ana", "hoy", "el viernes", usa el contexto temporal del usuario para convertirlo a fecha exacta YYYY-MM-DD.'
        },
        dueTime: {
          type: import_genai.Type.STRING,
          description: 'Hora l\xEDmite opcional en formato HH:mm (ej. "18:00").'
        },
        priority: {
          type: import_genai.Type.STRING,
          description: 'Nivel de prioridad: "alta", "media" o "baja".'
        }
      },
      required: ["title"]
    }
  },
  {
    name: "complete_project_task",
    description: 'Marca una tarea existente como completada. Debe usarse SIEMPRE que el usuario indique que ya termin\xF3, complet\xF3 o finaliz\xF3 una tarea (ej. "Ya termin\xE9 la pantalla de login", "Complet\xE9 la tarea del editor").',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        taskId: {
          type: import_genai.Type.STRING,
          description: "ID de la tarea si se conoce."
        },
        taskTitleMatch: {
          type: import_genai.Type.STRING,
          description: 'T\xEDtulo o palabras clave para buscar e identificar la tarea que se complet\xF3 (ej. "pantalla de login").'
        }
      },
      required: ["taskTitleMatch"]
    }
  },
  {
    name: "update_project_task",
    description: "Actualiza campos de una tarea existente (t\xEDtulo, descripci\xF3n, fecha l\xEDmite, hora, prioridad o estado).",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        taskId: {
          type: import_genai.Type.STRING,
          description: "ID de la tarea."
        },
        taskTitleMatch: {
          type: import_genai.Type.STRING,
          description: "T\xEDtulo o palabras clave para encontrar la tarea."
        },
        newTitle: {
          type: import_genai.Type.STRING,
          description: "Nuevo t\xEDtulo si cambia."
        },
        status: {
          type: import_genai.Type.STRING,
          description: 'Nuevo estado de la tarea: "pendiente" o "completado".'
        },
        dueDate: {
          type: import_genai.Type.STRING,
          description: "Nueva fecha l\xEDmite en formato YYYY-MM-DD."
        },
        dueTime: {
          type: import_genai.Type.STRING,
          description: "Nueva hora l\xEDmite en formato HH:mm."
        },
        priority: {
          type: import_genai.Type.STRING,
          description: 'Nueva prioridad: "alta", "media" o "baja".'
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Nueva descripci\xF3n de la tarea."
        }
      }
    }
  },
  {
    name: "delete_project_task",
    description: "Elimina una tarea de un proyecto.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        taskId: {
          type: import_genai.Type.STRING,
          description: "ID de la tarea a eliminar."
        },
        taskTitleMatch: {
          type: import_genai.Type.STRING,
          description: "T\xEDtulo o b\xFAsqueda para identificar la tarea a eliminar."
        }
      },
      required: ["taskTitleMatch"]
    }
  },
  {
    name: "set_next_step",
    description: 'Actualiza el Pr\xF3ximo Paso (Next Step) del proyecto. Debe llamarse cuando el usuario defina o cambie su enfoque inmediato (ej. "Mi pr\xF3ximo paso es desplegar la versi\xF3n de prueba").',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        nextStep: {
          type: import_genai.Type.STRING,
          description: "Texto concreto y conciso del nuevo pr\xF3ximo paso."
        }
      },
      required: ["nextStep"]
    }
  },
  {
    name: "record_decision",
    description: 'Registra una decisi\xF3n clave para el proyecto (arquitectura, producto, modelo de negocio, tecnolog\xEDa, descarte de alternativas, etc.) en su memoria estructurada (ej. "Decid\xED usar Gemini para esta parte").',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        title: {
          type: import_genai.Type.STRING,
          description: "T\xEDtulo conciso de la decisi\xF3n tomada."
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Contexto, justificaci\xF3n o detalles adicionales de la decisi\xF3n."
        },
        date: {
          type: import_genai.Type.STRING,
          description: "Fecha de la decisi\xF3n (YYYY-MM-DD). Si no se especifica, se usa la fecha actual."
        }
      },
      required: ["title"]
    }
  },
  {
    name: "record_idea",
    description: "Guarda una nueva idea, propuesta o hip\xF3tesis para un proyecto en su memoria para evaluaci\xF3n futura.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        title: {
          type: import_genai.Type.STRING,
          description: "T\xEDtulo o concepto central de la idea."
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Detalle o posibilidades de desarrollo de la idea."
        }
      },
      required: ["title"]
    }
  },
  {
    name: "record_blocker",
    description: "Registra un bloqueo, riesgo, problema o cuello de botella detectado en un proyecto.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        title: {
          type: import_genai.Type.STRING,
          description: "Descripci\xF3n breve del obst\xE1culo o bloqueo."
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Impacto, causas o posibles alternativas de resoluci\xF3n."
        }
      },
      required: ["title"]
    }
  },
  {
    name: "update_project_activity",
    description: "Registra un hito, evento o actividad significativa en la bit\xE1cora del proyecto.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto."
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Descripci\xF3n de la actividad o evento."
        },
        type: {
          type: import_genai.Type.STRING,
          description: 'Tipo de actividad (ej. "project_updated", "milestone_added", "milestone_completed").'
        }
      },
      required: ["description"]
    }
  },
  {
    name: "create_calendar_event",
    description: 'Crea y agenda un nuevo evento o reuni\xF3n en el calendario de Project OS. Se debe invocar SIEMPRE que el usuario mencione una reuni\xF3n, cita, llamada o evento que ocurre en una fecha y hora determinada (ej. "Agenda una reuni\xF3n con Juan ma\xF1ana a las 4 de la tarde", "Ma\xF1ana tengo una llamada con el cliente a las 3", "Reuni\xF3n con el equipo el viernes a las 10:00"). NOTA: Para tareas pendientes que solo se deben "hacer" (sin hora espec\xEDfica de reuni\xF3n), usa create_project_task.',
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        title: {
          type: import_genai.Type.STRING,
          description: 'T\xEDtulo directo del evento o reuni\xF3n (ej. "Reuni\xF3n con Juan", "Llamada con cliente").'
        },
        date: {
          type: import_genai.Type.STRING,
          description: 'Fecha del evento en formato exacto YYYY-MM-DD. Si el usuario dice "ma\xF1ana", "hoy", "el viernes", usa el contexto temporal para convertirlo a fecha exacta YYYY-MM-DD.'
        },
        startTime: {
          type: import_genai.Type.STRING,
          description: 'Hora de inicio en formato HH:mm (ej. "16:00", "09:30", "15:00"). Por ejemplo, "4 de la tarde" o "las 4" de la tarde debe ser "16:00".'
        },
        endTime: {
          type: import_genai.Type.STRING,
          description: 'Hora de finalizaci\xF3n en formato HH:mm (ej. "17:00"). Si no se indica, se calcula con base a la duraci\xF3n.'
        },
        durationMinutes: {
          type: import_genai.Type.INTEGER,
          description: "Duraci\xF3n en minutos (ej. 30, 60, 90). Por defecto 60 minutos."
        },
        location: {
          type: import_genai.Type.STRING,
          description: 'Ubicaci\xF3n f\xEDsica o enlace (ej. "Google Meet", "Oficina", "Zoom").'
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Notas adicionales, temas a tratar o agenda de la reuni\xF3n."
        },
        projectId: {
          type: import_genai.Type.STRING,
          description: "ID o nombre del proyecto relacionado si la reuni\xF3n pertenece a uno en particular."
        },
        status: {
          type: import_genai.Type.STRING,
          description: 'Estado inicial del evento: "confirmado", "tentativo" o "cancelado". Por defecto "confirmado".'
        }
      },
      required: ["title", "date", "startTime"]
    }
  },
  {
    name: "update_calendar_event",
    description: "Modifica o reprograma un evento existente en el calendario de Project OS (t\xEDtulo, fecha, hora, ubicaci\xF3n, descripci\xF3n o estado).",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        eventId: {
          type: import_genai.Type.STRING,
          description: "ID del evento si se conoce."
        },
        eventTitleMatch: {
          type: import_genai.Type.STRING,
          description: "T\xEDtulo o palabras clave para buscar e identificar el evento a modificar."
        },
        newTitle: {
          type: import_genai.Type.STRING,
          description: "Nuevo t\xEDtulo si cambia."
        },
        date: {
          type: import_genai.Type.STRING,
          description: "Nueva fecha en formato YYYY-MM-DD."
        },
        startTime: {
          type: import_genai.Type.STRING,
          description: "Nueva hora de inicio en formato HH:mm."
        },
        endTime: {
          type: import_genai.Type.STRING,
          description: "Nueva hora de finalizaci\xF3n en formato HH:mm."
        },
        durationMinutes: {
          type: import_genai.Type.INTEGER,
          description: "Nueva duraci\xF3n en minutos."
        },
        location: {
          type: import_genai.Type.STRING,
          description: "Nueva ubicaci\xF3n."
        },
        description: {
          type: import_genai.Type.STRING,
          description: "Nueva descripci\xF3n o notas."
        },
        status: {
          type: import_genai.Type.STRING,
          description: 'Nuevo estado: "confirmado", "tentativo" o "cancelado".'
        }
      },
      required: ["eventTitleMatch"]
    }
  },
  {
    name: "delete_calendar_event",
    description: "Elimina o cancela un evento agendado en el calendario de Project OS.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        eventId: {
          type: import_genai.Type.STRING,
          description: "ID del evento si se conoce."
        },
        eventTitleMatch: {
          type: import_genai.Type.STRING,
          description: "T\xEDtulo o palabras clave para buscar el evento a eliminar."
        }
      },
      required: ["eventTitleMatch"]
    }
  },
  {
    name: "check_calendar_availability",
    description: "Consulta eventos agendados y verifica disponibilidad horaria en el calendario para una fecha.",
    parameters: {
      type: import_genai.Type.OBJECT,
      properties: {
        date: {
          type: import_genai.Type.STRING,
          description: 'Fecha a consultar en formato YYYY-MM-DD (ej. "2026-09-24").'
        },
        startTime: {
          type: import_genai.Type.STRING,
          description: "Hora de inicio estimada en formato HH:mm a verificar."
        }
      },
      required: ["date"]
    }
  }
];
function findTargetProject(projects, projectIdArg, activeProjectId, contextText) {
  if (!Array.isArray(projects)) return null;
  if (projectIdArg) {
    const clean = projectIdArg.trim().toLowerCase();
    const byId = projects.find((p) => p.id === projectIdArg || p.id.toLowerCase() === clean);
    if (byId) return byId;
    const byName = projects.find(
      (p) => p.name.toLowerCase() === clean || p.name.toLowerCase().includes(clean) || clean.includes(p.name.toLowerCase())
    );
    if (byName) return byName;
  }
  if (activeProjectId && activeProjectId !== "general") {
    const active = projects.find((p) => p.id === activeProjectId);
    if (active) return active;
  }
  if (contextText) {
    const lower = contextText.toLowerCase();
    const sortedByNameLen = [...projects].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
    for (const p of sortedByNameLen) {
      if (p.name && lower.includes(p.name.toLowerCase())) {
        return p;
      }
    }
    const stopWords = /* @__PURE__ */ new Set(["de", "la", "el", "los", "las", "un", "una", "para", "por", "con", "en", "y", "o", "que", "tengo", "hay", "hacer", "tarea", "terminar", "revisar", "crear", "nuevo", "nueva", "del", "al"]);
    const words = lower.split(/[^a-záéíóúñ0-9]+/i).filter((w) => w.length > 2 && !stopWords.has(w));
    let bestScore = 0;
    let bestProject = null;
    for (const p of projects) {
      let score = 0;
      const pWords = `${p.name} ${p.category} ${p.mainGoal} ${(p.tasks || []).map((t) => t.title).join(" ")}`.toLowerCase();
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
  const generalBucket = projects.find(
    (p) => p.name.toLowerCase().includes("personal") || p.name.toLowerCase().includes("general") || p.name.toLowerCase().includes("cotidiano")
  );
  if (generalBucket) return generalBucket;
  if (projects.length === 0) return null;
  const newGeneralProject = {
    id: `proj-general-${Date.now()}`,
    name: "Personal & General",
    description: "Bandeja de entrada para tareas cotidianas, personales y notas generales.",
    category: "Personal",
    status: "Activo",
    mainGoal: "Organizar tareas y notas generales fuera de proyectos espec\xEDficos.",
    nextStep: "Revisar y priorizar pendientes",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    milestones: [],
    decisions: [],
    ideas: [],
    tasks: [],
    activities: [
      {
        id: `act-gen-${Date.now()}`,
        projectId: `proj-general-${Date.now()}`,
        projectName: "Personal & General",
        type: "project_created",
        description: "Bandeja Personal & General creada autom\xE1ticamente.",
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      }
    ],
    messages: []
  };
  projects.push(newGeneralProject);
  return newGeneralProject;
}
function calculateEndTime(startTime, durationMinutes = 60) {
  try {
    const [h, m] = startTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return "17:00";
    const totalMinutes = h * 60 + m + durationMinutes;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  } catch {
    return "17:00";
  }
}
function resolveDateString(expr, timeContext) {
  if (!expr) return void 0;
  const clean = expr.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (clean === "hoy" || clean === "today") return timeContext.currentDate;
  if (clean === "ma\xF1ana" || clean === "tomorrow") return timeContext.tomorrowDate;
  if (clean === "ayer" || clean === "yesterday") return timeContext.yesterdayDate;
  if (clean === "pasado ma\xF1ana") {
    const [y, m, d] = timeContext.currentDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 2);
    const yr = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, "0");
    const da = String(date.getDate()).padStart(2, "0");
    return `${yr}-${mo}-${da}`;
  }
  const weekdays = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    mi\u00E9rcoles: 3,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    s\u00E1bado: 6,
    sabado: 6
  };
  for (const [dayName, dayIdx] of Object.entries(weekdays)) {
    if (clean.includes(dayName)) {
      const [y, m, d] = timeContext.currentDate.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const currentDay = date.getDay();
      let diff = dayIdx - currentDay;
      if (diff <= 0) diff += 7;
      date.setDate(date.getDate() + diff);
      const yr = date.getFullYear();
      const mo = String(date.getMonth() + 1).padStart(2, "0");
      const da = String(date.getDate()).padStart(2, "0");
      return `${yr}-${mo}-${da}`;
    }
  }
  return expr;
}
function executeTool(toolName, args, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  if (toolName === "create_project") {
    const projName = String(args.name || "").trim() || "Nuevo Proyecto";
    const now = nowIso;
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const validCategories = ["Producto", "Negocio", "Personal", "Experimento", "Otro"];
    const category = validCategories.includes(args.category) ? args.category : "Producto";
    const validStatuses = ["Idea", "Planificaci\xF3n", "Activo", "Pausado", "Completado", "Archivado"];
    const status = validStatuses.includes(args.status) ? args.status : "Activo";
    const mainGoal = args.mainGoal ? String(args.mainGoal).trim() : "";
    const nextStep = args.nextStep ? String(args.nextStep).trim() : "";
    const description = args.description ? String(args.description).trim() : "";
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
          type: "project_created",
          description: `Se cre\xF3 el proyecto "${projName}" desde el chat.`,
          timestamp: now
        }
      ],
      messages: [
        {
          id: `msg-welcome-${Date.now()}`,
          projectId: newId,
          role: "assistant",
          content: `\xA1Hola! Soy tu copiloto para **${projName}**.

${mainGoal ? `\u2022 **Objetivo principal**: ${mainGoal}
` : ""}${nextStep ? `\u2022 **Pr\xF3ximo paso**: ${nextStep}
` : ""}
Puedes hablarme de cualquier idea, obst\xE1culo o decisi\xF3n para continuar avanzando.`,
          timestamp: now
        }
      ]
    };
    liveProjects.unshift(newProject);
    accumulatedActions.push({
      type: "project_created",
      label: "Proyecto creado",
      details: projName + (mainGoal ? ` [Objetivo: ${mainGoal}]` : ""),
      projectId: newId
    });
    return {
      success: true,
      message: `Proyecto "${projName}" creado exitosamente (ID: ${newId}). Categor\xEDa: "${category}", Estado: "${status}".${mainGoal ? ` Objetivo: "${mainGoal}".` : ""}${nextStep ? ` Pr\xF3ximo paso: "${nextStep}".` : ""} Aparece de inmediato en Projects y ya puedes continuar trabajando en \xE9l.`,
      project: newProject,
      projectId: newId
    };
  }
  if (toolName === "delete_project") {
    const codeArg = String(args.confirmationCode || "").trim().toUpperCase();
    const proj = findTargetProject(liveProjects, args.projectId, activeProjectId, args.projectName);
    if (!proj) {
      return {
        success: false,
        error: "No se encontr\xF3 el proyecto a eliminar en Project OS."
      };
    }
    if (activePendingDeletion && activePendingDeletion.projectId === proj.id) {
      if (activePendingDeletion.confirmationCode !== codeArg) {
        return {
          success: false,
          error: `C\xF3digo de confirmaci\xF3n incorrecto. Se requiere ${activePendingDeletion.confirmationCode}.`
        };
      }
    }
    const index = liveProjects.findIndex((p) => p.id === proj.id);
    if (index !== -1) {
      liveProjects.splice(index, 1);
    }
    for (let i = liveEvents.length - 1; i >= 0; i--) {
      if (liveEvents[i].projectId === proj.id) {
        liveEvents.splice(i, 1);
      }
    }
    accumulatedActions.push({
      type: "project_deleted",
      label: "Proyecto eliminado",
      details: proj.name,
      projectId: proj.id
    });
    activePendingDeletion = null;
    return {
      success: true,
      message: `Proyecto "${proj.name}" eliminado correctamente de Project OS.`,
      deletedProjectId: proj.id,
      deletedProjectName: proj.name
    };
  }
  if (toolName === "create_calendar_event") {
    const resolvedDate = resolveDateString(args.date, timeContext) || timeContext.tomorrowDate;
    const resolvedStartTime = args.startTime || "16:00";
    const duration = args.durationMinutes ? Number(args.durationMinutes) : 60;
    const resolvedEndTime = args.endTime || calculateEndTime(resolvedStartTime, duration);
    const hasProjectIntent = Boolean(
      args.projectId || activeProjectId && activeProjectId !== "general" || args.title && liveProjects.some((p) => p.name && args.title.toLowerCase().includes(p.name.toLowerCase()))
    );
    const proj = hasProjectIntent ? findTargetProject(liveProjects, args.projectId, activeProjectId, args.title) : null;
    const newEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: String(args.title || "Reuni\xF3n").trim(),
      description: args.description ? String(args.description).trim() : void 0,
      date: resolvedDate,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      durationMinutes: duration,
      location: args.location ? String(args.location).trim() : void 0,
      status: args.status || "confirmado",
      projectId: proj ? proj.id : void 0,
      projectName: proj ? proj.name : void 0,
      createdAt: nowIso,
      provider: "local",
      syncStatus: "local_only"
    };
    liveEvents.push(newEvent);
    accumulatedActions.push({
      type: "event_created",
      label: "Evento agendado",
      details: `${newEvent.title} [${newEvent.date} a las ${newEvent.startTime}]`,
      projectId: proj?.id
    });
    if (proj) {
      if (!Array.isArray(proj.activities)) proj.activities = [];
      proj.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: proj.id,
        projectName: proj.name,
        type: "event_added",
        description: `Evento agendado: "${newEvent.title}" para el ${newEvent.date} a las ${newEvent.startTime}`,
        timestamp: nowIso
      });
      proj.updatedAt = nowIso;
    }
    return {
      success: true,
      message: `Evento agendado con \xE9xito: "${newEvent.title}" para el ${newEvent.date} a las ${newEvent.startTime} (hasta las ${newEvent.endTime})${newEvent.location ? ` en ${newEvent.location}` : ""}${proj ? ` (Proyecto: "${proj.name}")` : ""}.`,
      event: newEvent
    };
  }
  if (toolName === "update_calendar_event") {
    let event = null;
    if (args.eventId) {
      event = liveEvents.find((e) => e.id === args.eventId);
    }
    if (!event && args.eventTitleMatch) {
      const q = String(args.eventTitleMatch).toLowerCase().trim();
      event = liveEvents.find((e) => e.title.toLowerCase().includes(q) || q.includes(e.title.toLowerCase()));
    }
    if (!event) {
      return {
        success: false,
        error: `No se encontr\xF3 el evento "${args.eventTitleMatch || args.eventId}" en el calendario.`
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
    if (args.location !== void 0) event.location = args.location ? String(args.location).trim() : void 0;
    if (args.description !== void 0) event.description = args.description ? String(args.description).trim() : void 0;
    if (args.status) event.status = args.status;
    event.updatedAt = nowIso;
    accumulatedActions.push({
      type: "event_updated",
      label: "Evento actualizado",
      details: `${event.title} [${event.date} a las ${event.startTime}]`,
      projectId: event.projectId
    });
    return {
      success: true,
      message: `Evento "${event.title}" actualizado con \xE9xito para el ${event.date} a las ${event.startTime}.`,
      event
    };
  }
  if (toolName === "delete_calendar_event") {
    let idx = -1;
    if (args.eventId) {
      idx = liveEvents.findIndex((e) => e.id === args.eventId);
    }
    if (idx === -1 && args.eventTitleMatch) {
      const q = String(args.eventTitleMatch).toLowerCase().trim();
      idx = liveEvents.findIndex((e) => e.title.toLowerCase().includes(q) || q.includes(e.title.toLowerCase()));
    }
    if (idx === -1) {
      return {
        success: false,
        error: `No se encontr\xF3 ning\xFAn evento que coincida con "${args.eventTitleMatch || args.eventId}".`
      };
    }
    const removed = liveEvents.splice(idx, 1)[0];
    accumulatedActions.push({
      type: "event_deleted",
      label: "Evento eliminado",
      details: `Eliminado: "${removed.title}"`,
      projectId: removed.projectId
    });
    return {
      success: true,
      message: `Evento "${removed.title}" eliminado correctamente del calendario.`
    };
  }
  if (toolName === "check_calendar_availability") {
    const checkDate = resolveDateString(args.date, timeContext) || timeContext.currentDate;
    const dayEvents = liveEvents.filter((e) => e.date === checkDate && e.status !== "cancelado");
    const hasConflict = args.startTime ? dayEvents.some((e) => e.startTime === args.startTime) : false;
    return {
      success: true,
      date: checkDate,
      hasConflicts: hasConflict,
      eventsCount: dayEvents.length,
      events: dayEvents.map((e) => ({ title: e.title, start: e.startTime, end: e.endTime, location: e.location })),
      message: dayEvents.length === 0 ? `No tienes eventos agendados para el ${checkDate}. El d\xEDa est\xE1 completamente disponible.` : `Tienes ${dayEvents.length} evento(s) para el ${checkDate}: ${dayEvents.map((e) => `"${e.title}" (${e.startTime} - ${e.endTime})`).join(", ")}.`
    };
  }
  const project = findTargetProject(liveProjects, args.projectId, activeProjectId, args.title || args.taskTitleMatch);
  if (!project) {
    const projectNames = liveProjects.map((p) => `"${p.name}"`).join(", ");
    return {
      success: false,
      error: `No se identific\xF3 el proyecto objetivo. Por favor especifica a cu\xE1l de tus proyectos te refieres entre: ${projectNames || "ninguno registrado"}.`
    };
  }
  switch (toolName) {
    case "create_project_task": {
      const resolvedDueDate = resolveDateString(args.dueDate, timeContext);
      const newTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        projectId: project.id,
        title: String(args.title || "").trim(),
        description: args.description ? String(args.description).trim() : void 0,
        status: "pendiente",
        createdAt: nowIso,
        dueDate: resolvedDueDate,
        dueTime: args.dueTime ? String(args.dueTime).trim() : void 0,
        priority: args.priority || "media"
      };
      if (!Array.isArray(project.tasks)) project.tasks = [];
      project.tasks.push(newTask);
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "task_added",
        description: `Tarea creada: "${newTask.title}"${newTask.dueDate ? ` (para ${newTask.dueDate})` : ""}`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "task_created",
        label: "Tarea creada",
        details: `${newTask.title}${newTask.dueDate ? ` [Fecha: ${newTask.dueDate}]` : ""}`,
        projectId: project.id
      });
      return {
        success: true,
        message: `Tarea creada con \xE9xito: "${newTask.title}" en el proyecto "${project.name}" (ID: ${newTask.id}, Fecha: ${newTask.dueDate || "sin fecha l\xEDmite"}).`,
        taskId: newTask.id,
        task: newTask
      };
    }
    case "complete_project_task": {
      if (!Array.isArray(project.tasks)) project.tasks = [];
      let task = null;
      if (args.taskId) {
        task = project.tasks.find((t) => t.id === args.taskId);
      }
      if (!task && args.taskTitleMatch) {
        const query = String(args.taskTitleMatch).trim().toLowerCase();
        task = project.tasks.find((t) => t.title.toLowerCase() === query);
        if (!task) {
          task = project.tasks.find(
            (t) => t.title.toLowerCase().includes(query) || query.includes(t.title.toLowerCase())
          );
        }
      }
      if (!task) {
        return {
          success: false,
          error: `No se encontr\xF3 la tarea "${args.taskTitleMatch || args.taskId}" en "${project.name}". Tareas disponibles: ${project.tasks.map((t) => `"${t.title}" (${t.status})`).join(", ") || "ninguna"}.`
        };
      }
      task.status = "completado";
      task.completedAt = nowIso;
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "task_completed",
        description: `Tarea completada: "${task.title}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "task_completed",
        label: "Tarea completada",
        details: task.title,
        projectId: project.id
      });
      return {
        success: true,
        message: `Tarea "${task.title}" marcada como completada en el proyecto "${project.name}".`,
        task
      };
    }
    case "update_project_task": {
      if (!Array.isArray(project.tasks)) project.tasks = [];
      let task = null;
      if (args.taskId) {
        task = project.tasks.find((t) => t.id === args.taskId);
      }
      if (!task && args.taskTitleMatch) {
        const query = String(args.taskTitleMatch).trim().toLowerCase();
        task = project.tasks.find(
          (t) => t.title.toLowerCase() === query || t.title.toLowerCase().includes(query) || query.includes(t.title.toLowerCase())
        );
      }
      if (!task) {
        return {
          success: false,
          error: `No se encontr\xF3 la tarea para actualizar en "${project.name}".`
        };
      }
      if (args.newTitle) task.title = String(args.newTitle).trim();
      if (args.status) {
        task.status = args.status;
        if (args.status === "completado" && !task.completedAt) task.completedAt = nowIso;
      }
      if (args.dueDate !== void 0) task.dueDate = resolveDateString(args.dueDate, timeContext);
      if (args.dueTime !== void 0) task.dueTime = args.dueTime;
      if (args.priority !== void 0) task.priority = args.priority;
      if (args.description !== void 0) task.description = args.description;
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "task_updated",
        description: `Tarea actualizada: "${task.title}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "task_updated",
        label: "Tarea actualizada",
        details: task.title,
        projectId: project.id
      });
      return {
        success: true,
        message: `Tarea "${task.title}" actualizada con \xE9xito en "${project.name}".`,
        task
      };
    }
    case "delete_project_task": {
      if (!Array.isArray(project.tasks)) project.tasks = [];
      let taskIndex = -1;
      if (args.taskId) {
        taskIndex = project.tasks.findIndex((t) => t.id === args.taskId);
      }
      if (taskIndex === -1 && args.taskTitleMatch) {
        const query = String(args.taskTitleMatch).trim().toLowerCase();
        taskIndex = project.tasks.findIndex(
          (t) => t.title.toLowerCase() === query || t.title.toLowerCase().includes(query) || query.includes(t.title.toLowerCase())
        );
      }
      if (taskIndex === -1) {
        return {
          success: false,
          error: `No se encontr\xF3 la tarea para eliminar en "${project.name}".`
        };
      }
      const deletedTask = project.tasks.splice(taskIndex, 1)[0];
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "task_deleted",
        description: `Tarea eliminada: "${deletedTask.title}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "task_deleted",
        label: "Tarea eliminada",
        details: deletedTask.title,
        projectId: project.id
      });
      return {
        success: true,
        message: `Tarea "${deletedTask.title}" eliminada de "${project.name}".`
      };
    }
    case "set_next_step": {
      const oldStep = project.nextStep;
      project.nextStep = String(args.nextStep || "").trim();
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "next_step_changed",
        description: `Pr\xF3ximo paso actualizado: "${project.nextStep}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "next_step_changed",
        label: "Pr\xF3ximo paso actualizado",
        details: project.nextStep,
        projectId: project.id
      });
      return {
        success: true,
        message: `Pr\xF3ximo paso de "${project.name}" actualizado a: "${project.nextStep}" (anterior: "${oldStep || "sin definir"}").`
      };
    }
    case "record_decision": {
      const newDecision = {
        id: `dec-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        title: String(args.title || "").trim(),
        description: args.description ? String(args.description).trim() : "Decisi\xF3n acordada en la conversaci\xF3n con el asistente.",
        date: args.date || timeContext.currentDate,
        createdAt: nowIso
      };
      if (!Array.isArray(project.decisions)) project.decisions = [];
      project.decisions.unshift(newDecision);
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "decision_added",
        description: `Decisi\xF3n registrada: "${newDecision.title}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "decision_added",
        label: "Decisi\xF3n registrada",
        details: newDecision.title,
        projectId: project.id
      });
      return {
        success: true,
        message: `Decisi\xF3n registrada con \xE9xito en "${project.name}": "${newDecision.title}".`,
        decision: newDecision
      };
    }
    case "record_idea": {
      const newIdea = {
        id: `idea-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        title: String(args.title || "").trim(),
        description: args.description ? String(args.description).trim() : "",
        date: timeContext.currentDate,
        createdAt: nowIso
      };
      if (!Array.isArray(project.ideas)) project.ideas = [];
      project.ideas.unshift(newIdea);
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "idea_added",
        description: `Idea registrada: "${newIdea.title}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "idea_added",
        label: "Idea registrada",
        details: newIdea.title,
        projectId: project.id
      });
      return {
        success: true,
        message: `Idea guardada en la memoria de "${project.name}": "${newIdea.title}".`,
        idea: newIdea
      };
    }
    case "record_blocker": {
      const title = String(args.title || "").trim();
      const newBlocker = {
        id: `block-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        title,
        description: args.description ? String(args.description).trim() : "",
        status: "activo",
        createdAt: nowIso
      };
      if (!Array.isArray(project.blockers)) project.blockers = [];
      project.blockers.unshift(newBlocker);
      project.updatedAt = nowIso;
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift({
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: "project_updated",
        description: `Bloqueo detectado: "${title}"`,
        timestamp: nowIso
      });
      accumulatedActions.push({
        type: "blocker_recorded",
        label: "Bloqueo registrado",
        details: title,
        projectId: project.id
      });
      return {
        success: true,
        message: `Bloqueo registrado en "${project.name}": "${title}".`,
        blocker: newBlocker
      };
    }
    case "update_project_activity": {
      const desc = String(args.description || "").trim();
      const newAct = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type: args.type || "project_updated",
        description: desc,
        timestamp: nowIso
      };
      if (!Array.isArray(project.activities)) project.activities = [];
      project.activities.unshift(newAct);
      project.updatedAt = nowIso;
      accumulatedActions.push({
        type: "activity_logged",
        label: "Actividad registrada",
        details: desc,
        projectId: project.id
      });
      return {
        success: true,
        message: `Actividad registrada en "${project.name}": "${desc}".`
      };
    }
    default:
      return {
        success: false,
        error: `Herramienta desconocida: "${toolName}".`
      };
  }
}
async function runGeminiConversationWithTools(ai, messages, systemInstruction, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions, enableTools = true) {
  for (const model of CANDIDATE_MODELS) {
    try {
      const conversationContents = [];
      const recent = messages.slice(-10);
      for (const m of recent) {
        const role = m.role === "assistant" ? "model" : "user";
        const text = m.content || "";
        conversationContents.push({
          role,
          parts: [{ text }]
        });
      }
      if (conversationContents.length === 0 || conversationContents[conversationContents.length - 1].role !== "user") {
        const last = messages[messages.length - 1];
        conversationContents.push({
          role: "user",
          parts: [{ text: last?.content || "" }]
        });
      }
      const generateConfig = {
        systemInstruction
      };
      if (enableTools) {
        generateConfig.tools = [{ functionDeclarations: toolDeclarations }];
      }
      let response = await Promise.race([
        ai.models.generateContent({
          model,
          contents: conversationContents,
          config: generateConfig
        }),
        new Promise(
          (_, reject) => setTimeout(() => reject(new Error(`Timeout model ${model}`)), 1e4)
        )
      ]);
      if (!enableTools) {
        const replyText = response.text || "";
        if (replyText.trim()) {
          return {
            reply: replyText.trim(),
            modelUsed: model
          };
        }
      }
      let iterations = 0;
      const lastToolMessages = [];
      while (response && response.functionCalls && response.functionCalls.length > 0 && iterations < 5) {
        iterations++;
        const currentCalls = response.functionCalls;
        console.log(`[Gemini Function Calling] Model (${model}) called ${currentCalls.length} tool(s) in iteration ${iterations}:`, currentCalls.map((c) => c.name));
        const modelCandidate = response.candidates?.[0]?.content;
        if (modelCandidate) {
          conversationContents.push(modelCandidate);
        }
        const toolResponseParts = [];
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
          if (result && typeof result.message === "string") {
            lastToolMessages.push(result.message);
          }
          toolResponseParts.push({
            functionResponse: {
              name: call.name,
              id: call.id,
              response: { output: result }
            }
          });
        }
        conversationContents.push({
          role: "tool",
          parts: toolResponseParts
        });
        try {
          response = await Promise.race([
            ai.models.generateContent({
              model,
              contents: conversationContents,
              config: {
                systemInstruction,
                tools: [{ functionDeclarations: toolDeclarations }]
              }
            }),
            new Promise(
              (_, reject) => setTimeout(() => reject(new Error("Follow-up turn timeout")), 1e4)
            )
          ]);
        } catch (followUpErr) {
          console.info(`[Gemini Follow-up] Secondary turn finalized with synthesized actions for model ${model}`);
          break;
        }
      }
      let finalReply = response?.text?.trim();
      if (!finalReply || finalReply === "Entendido.") {
        if (accumulatedActions.length > 0) {
          const actionSummaries = accumulatedActions.map((a) => `\u2022 **${a.label}**: ${a.details}`).join("\n");
          finalReply = `He procesado tu solicitud y actualizado el proyecto correctamente:

${actionSummaries}

\xBFDeseas avanzar en el siguiente paso o registrar alguna otra acci\xF3n?`;
        } else if (lastToolMessages.length > 0) {
          finalReply = lastToolMessages.join("\n\n");
        }
      }
      return { reply: finalReply || "Entendido.", modelUsed: model };
    } catch (err) {
      const statusCode = err?.status || err?.code || err?.error?.code || (err?.message?.includes("429") ? 429 : err?.message?.includes("503") ? 503 : 500);
      const isQuotaOrDemand = statusCode === 429 || statusCode === 503 || statusCode === "RESOURCE_EXHAUSTED" || statusCode === "UNAVAILABLE";
      const isTimeout = err?.message?.toLowerCase().includes("timeout");
      if (isQuotaOrDemand) {
        console.info(`[Gemini Model Cascade] Model ${model} unavailable (${statusCode}), switching to next candidate...`);
      } else if (isTimeout) {
        console.info(`[Gemini Model Cascade] Model ${model} latency threshold reached, switching to next candidate...`);
      } else {
        console.info(`[Gemini Model Cascade] Model ${model} switching to next candidate (${err?.status || "fallback"})...`);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  return null;
}
var TRANSCRIBE_MODELS = [
  "gemini-3.5-transcribe",
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash"
];
function cleanTextForSpeech(text) {
  if (!text) return "";
  return text.replace(/```[\s\S]*?```/g, "").replace(/`([^`]+)`/g, "$1").replace(/^#{1,6}\s+/gm, "").replace(/(\*\*|__)(.*?)\1/g, "$2").replace(/(\*|_)(.*?)\1/g, "$2").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/!\[.*?\]\(.*?\)/g, "").replace(/^[\s]*[-*•]\s+/gm, ". ").replace(/^[\s]*\d+\.\s+/gm, ". ").replace(/\n+/g, ". ").replace(/\s+/g, " ").trim();
}
var handleTranscription = async (req, res) => {
  try {
    const { audioBase64, mimeType = "audio/mp3", clientHint = "" } = req.body;
    if (!audioBase64 || typeof audioBase64 !== "string") {
      if (clientHint && typeof clientHint === "string" && clientHint.trim()) {
        return res.json({ success: true, text: clientHint.trim() });
      }
      return res.status(400).json({ error: "Se requiere audioBase64 para transcribir" });
    }
    const ai = getGeminiClient();
    if (!ai) {
      if (clientHint) {
        return res.json({ success: true, text: clientHint.trim() });
      }
      return res.status(500).json({ error: "GEMINI_API_KEY no configurada en el servidor" });
    }
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, "");
    const normalizedMime = (mimeType || "audio/webm").trim();
    let transcribedText = "";
    let lastError = null;
    for (const model of TRANSCRIBE_MODELS) {
      try {
        const contents = [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: normalizedMime,
                  data: cleanBase64
                }
              },
              {
                text: "Transcribe este audio con m\xE1xima fidelidad en espa\xF1ol. Capta susurros, voz suave, murmullos y frases r\xE1pidas. Si el audio contiene voz, transcribe palabra por palabra sin omitir nada. Devuelve \xFAnicamente el texto transcrito directo, sin comillas ni notas."
              }
            ]
          }
        ];
        const response = await Promise.race([
          ai.models.generateContent({
            model,
            contents
          }),
          new Promise(
            (_, reject) => setTimeout(() => reject(new Error(`Timeout transcribe on ${model}`)), 15e3)
          )
        ]);
        let extracted = "";
        const candidate = response.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        for (const p of parts) {
          if (p.audioTranscription?.text) {
            extracted += p.audioTranscription.text;
          } else if (p.text) {
            extracted += p.text;
          }
        }
        if (!extracted && response.text) {
          extracted = response.text;
        }
        extracted = extracted ? extracted.trim() : "";
        if (extracted && extracted !== "<noise>" && extracted !== "<silence>" && !extracted.toLowerCase().startsWith("silencio") && !extracted.toLowerCase().includes("no se detecta")) {
          transcribedText = extracted;
          console.log(`[Audio Transcribe] Exitosamente transcrito con modelo ${model}: "${transcribedText.slice(0, 60)}..."`);
          break;
        }
      } catch (err) {
        lastError = err;
        const msg = err?.message || "";
        if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
          console.info(`[Audio Transcribe] Modelo ${model} no disponible temporalmente (503), pasando al siguiente candidato.`);
        } else {
          console.info(`[Audio Transcribe] Modelo ${model} no complet\xF3 transcripci\xF3n, pasando al siguiente candidato.`);
        }
      }
    }
    if (!transcribedText && clientHint && clientHint.trim()) {
      console.log(`[Audio Transcribe] Usando clientHint de alta sensibilidad: "${clientHint}"`);
      return res.json({ success: true, text: clientHint.trim() });
    }
    if (!transcribedText && !lastError) {
      return res.json({
        success: true,
        text: "",
        isSilence: true,
        message: "No se detect\xF3 voz clara en el audio grabado"
      });
    }
    if (!transcribedText) {
      if (clientHint) {
        return res.json({ success: true, text: clientHint.trim() });
      }
      return res.status(200).json({
        success: false,
        text: "",
        error: "No se pudo transcribir el audio.",
        details: lastError?.message || "Sin respuesta del modelo"
      });
    }
    return res.json({ success: true, text: transcribedText });
  } catch (err) {
    console.error("[Audio Transcribe Error]:", err);
    return res.status(500).json({ error: "Error procesando el audio", details: err?.message });
  }
};
app.post("/api/transcribe-audio", handleTranscription);
app.post("/api/transcribe", handleTranscription);
app.post("/api/tts", async (req, res) => {
  try {
    const { text, voice = "es-MX-JorgeNeural" } = req.body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: 'El par\xE1metro "text" es obligatorio.' });
    }
    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) {
      return res.status(400).json({ error: "El texto no contiene contenido legible." });
    }
    const truncatedText = cleanText.length > 1200 ? cleanText.slice(0, 1197) + "..." : cleanText;
    const tts = new import_msedge_tts.MsEdgeTTS();
    await tts.setMetadata(voice, import_msedge_tts.OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const stream = tts.toStream(truncatedText).audioStream;
    const chunks = [];
    await Promise.race([
      new Promise((resolve, reject) => {
        stream.on("data", (chunk) => chunks.push(chunk));
        stream.on("end", () => resolve());
        stream.on("error", (err) => reject(err));
      }),
      new Promise(
        (_, reject) => setTimeout(() => reject(new Error("TTS timeout de generaci\xF3n")), 12e3)
      )
    ]);
    const audioBuffer = Buffer.concat(chunks);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.status(200).send(audioBuffer);
  } catch (err) {
    console.error("[TTS Error]:", err);
    return res.status(500).json({
      error: "Error generando la s\xEDntesis de voz",
      details: err?.message
    });
  }
});
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, projectContext, eventsContext, isGeneral, projectId, timeContext: clientTimeContext } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required" });
    }
    const lastUserMessage = messages[messages.length - 1];
    const ai = getGeminiClient();
    const now = /* @__PURE__ */ new Date();
    const defaultDate = now.toISOString().split("T")[0];
    const timeContext = clientTimeContext || {
      currentDate: defaultDate,
      currentTime: now.toTimeString().split(" ")[0],
      formattedDate: defaultDate,
      weekday: "hoy",
      timezone: "UTC",
      timezoneOffsetMinutes: 0,
      tomorrowDate: new Date(now.getTime() + 864e5).toISOString().split("T")[0],
      yesterdayDate: new Date(now.getTime() - 864e5).toISOString().split("T")[0]
    };
    let liveProjects = [];
    if (Array.isArray(projectContext)) {
      liveProjects = JSON.parse(JSON.stringify(projectContext));
    } else if (projectContext && typeof projectContext === "object") {
      liveProjects = [JSON.parse(JSON.stringify(projectContext))];
    }
    let liveEvents = [];
    if (Array.isArray(eventsContext)) {
      liveEvents = JSON.parse(JSON.stringify(eventsContext));
    }
    const activeProjectId = projectId || (isGeneral ? "general" : liveProjects[0]?.id);
    const accumulatedActions = [];
    const userText = String(lastUserMessage?.content || "").trim();
    const textLower = userText.toLowerCase();
    const pending = resolvePendingDeletion(messages, liveProjects);
    const isCancelRequest = /^(?:no|cancelar|cancela|mejor no|d[eé]jalo|olv[ií]dalo|ya no|no lo borres|no borres)$/i.test(userText.trim()) || /(?:mejor no|cancela la eliminaci[oó]n|cancelar la eliminaci[oó]n|no lo borres|no borrar)/i.test(textLower);
    if (pending && isCancelRequest) {
      const cancelledName = pending.projectName;
      activePendingDeletion = null;
      return res.json({
        reply: `Se ha cancelado la eliminaci\xF3n del proyecto \u2018${cancelledName}\u2019. El proyecto permanece intacto.`,
        actionsExecuted: [],
        memoryUpdates: [],
        updatedProjects: liveProjects,
        updatedProject: liveProjects.find((p) => p.id === activeProjectId),
        updatedEvents: liveEvents,
        provider: "system-safety"
      });
    }
    const isTaskDeletion = textLower.includes("tarea") || textLower.includes("pendiente");
    const isEventDeletion = textLower.includes("reuni\xF3n") || textLower.includes("reunion") || textLower.includes("evento") || textLower.includes("cita");
    const isExplicitProjectDeletion = !isTaskDeletion && !isEventDeletion && (/(?:borra|borrar|elimina|eliminar|suprime|suprimir|destruye|destruir)\s+(?:este\s+proyecto|ese\s+proyecto|el\s+proyecto|proyecto)/i.test(textLower) || /^(?:borra|borrar|elimina|eliminar)\s+/i.test(userText.trim()) || /(?:quiero|deseo|necesito)\s+(?:borrar|eliminar)\s+(?:este\s+|el\s+)?proyecto/i.test(textLower));
    if (isExplicitProjectDeletion) {
      let targetProj = null;
      for (const p of liveProjects) {
        if (textLower.includes(p.name.toLowerCase())) {
          targetProj = p;
          break;
        }
      }
      if (!targetProj) {
        if (activeProjectId && activeProjectId !== "general") {
          targetProj = liveProjects.find((p) => p.id === activeProjectId) || null;
        } else if (liveProjects.length === 1) {
          targetProj = liveProjects[0];
        }
      }
      if (!targetProj) {
        return res.json({
          reply: "\xBFQu\xE9 proyecto deseas eliminar? Por favor indica el nombre exacto del proyecto que quieres borrar.",
          actionsExecuted: [],
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: "system-safety"
        });
      }
      const code = generateConfirmationCode(targetProj.name);
      activePendingDeletion = {
        projectId: targetProj.id,
        projectName: targetProj.name,
        confirmationCode: code,
        createdAt: Date.now()
      };
      return res.json({
        reply: `Vas a eliminar permanentemente el proyecto \u2018${targetProj.name}\u2019. Esta acci\xF3n no se puede deshacer.

Para confirmar, escribe exactamente: ${code}`,
        actionsExecuted: [],
        memoryUpdates: [],
        updatedProjects: liveProjects,
        updatedProject: liveProjects.find((p) => p.id === activeProjectId),
        updatedEvents: liveEvents,
        provider: "system-safety"
      });
    }
    if (pending) {
      const cleanUpper = userText.trim().toUpperCase().replace(/[.,!]/g, "");
      const codeRegex = new RegExp(`\\b${pending.confirmationCode}\\b`, "i");
      const isExactCode = cleanUpper === pending.confirmationCode || codeRegex.test(userText);
      if (isExactCode) {
        executeTool(
          "delete_project",
          {
            projectId: pending.projectId,
            projectName: pending.projectName,
            confirmationCode: pending.confirmationCode
          },
          liveProjects,
          liveEvents,
          activeProjectId,
          timeContext,
          accumulatedActions
        );
        activePendingDeletion = null;
        return res.json({
          reply: `Proyecto \u2018${pending.projectName}\u2019 eliminado correctamente.`,
          actionsExecuted: accumulatedActions,
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: "system-safety"
        });
      }
      const codePattern = /\b([A-Z0-9]{3,}-\d{2,})\b/i;
      const matchedOtherCode = userText.match(codePattern);
      if (matchedOtherCode && matchedOtherCode[1].toUpperCase() !== pending.confirmationCode) {
        return res.json({
          reply: `El c\xF3digo de confirmaci\xF3n ingresado no coincide con el c\xF3digo requerido (**${pending.confirmationCode}**) para eliminar \u2018${pending.projectName}\u2019. El proyecto permanece intacto. Por favor, escribe exactamente el c\xF3digo mostrado para proceder, o 'cancelar' si cambiaste de idea.`,
          actionsExecuted: [],
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: "system-safety"
        });
      }
      const isAmbiguousConfirm = /^(?:s[íi]|dale|confirmo|hazlo|b[oó]rralo|elim[ií]nalo|ok|adelante|procede|claro|por favor|s[íi],\s*b[oó]rralo|si,\s*borralo|dale,\s*b[oó]rralo|hazlo\s*ya)$/i.test(userText.trim()) || /(?:s[íi],?\s*b[oó]rralo|dale,?\s*elim[ií]nalo|confirmo\s*la\s*eliminaci[oó]n)/i.test(textLower);
      if (isAmbiguousConfirm) {
        return res.json({
          reply: `Para confirmar la eliminaci\xF3n permanente del proyecto \u2018${pending.projectName}\u2019, debes escribir exactamente el c\xF3digo de seguridad: **${pending.confirmationCode}**

Si prefieres no eliminarlo, escribe 'cancelar' o 'mejor no'.`,
          actionsExecuted: [],
          memoryUpdates: [],
          updatedProjects: liveProjects,
          updatedProject: liveProjects.find((p) => p.id === activeProjectId),
          updatedEvents: liveEvents,
          provider: "system-safety"
        });
      }
    }
    let systemInstruction = "";
    if (isGeneral) {
      systemInstruction = `Eres el Director de Estrategia e Inteligencia de "Project OS", un sistema personal y aut\xF3nomo de alta fidelidad donde el usuario gestiona sus proyectos, tareas y calendario.

CONTEXTO TEMPORAL DEL USUARIO (DISPOSITIVO):
- Fecha actual: ${timeContext.formattedDate} (${timeContext.currentDate})
- Hora actual: ${timeContext.currentTime} (Zona horaria: ${timeContext.timezone})
- D\xEDa de la semana: ${timeContext.weekday}
- Ma\xF1ana ser\xE1: ${timeContext.tomorrowDate}
- Ayer fue: ${timeContext.yesterdayDate}

EVENTOS ACTUALMENTE AGENDADOS EN EL CALENDARIO:
${JSON.stringify(
        liveEvents.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          status: e.status,
          project: e.projectName
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
          pendingTasksCount: p.tasks?.filter((t) => t.status === "pendiente").length || 0,
          tasks: p.tasks?.map((t) => ({ id: t.id, title: t.title, status: t.status, dueDate: t.dueDate, priority: t.priority })),
          decisionsCount: p.decisions?.length || 0,
          ideasCount: p.ideas?.length || 0
        })),
        null,
        2
      )}

CAPACIDAD MULTITAREA Y LENGUAJE NATURAL FLUIDO:
1. El usuario puede hablarte corrido, mezclar varias cosas en una sola frase o p\xE1rrafo (por ejemplo: una reuni\xF3n para ma\xF1ana, dos tareas que tiene que hacer y una idea nueva).
2. TIENES LA INTELIGENCIA para captar cada intenci\xF3n en lenguaje natural sin requerir comandos r\xEDgidos ni palabras clave exactas.
3. SI DETECTAS M\xDALTIPLES ACCIONES en un solo mensaje, DEBES LLAMAR A LAS HERRAMIENTAS CORRESPONDIENTES TANTAS VECES COMO SEA NECESARIO en la misma respuesta (ej. 2 llamadas a create_project_task y 1 llamada a create_calendar_event).

ASIGNACI\xD3N INTELIGENTE DE PROYECTO (CRUCIAL):
- Cuando el usuario mencione una tarea, analiza a cu\xE1l de sus proyectos pertenece por tem\xE1tica, palabras clave o contexto.
- Si la tarea claramente pertenece a un proyecto existente (ej. "dise\xF1ar el logo" \u2794 "Negocio de Rese\xF1as" o el proyecto correspondiente), indica el nombre del proyecto en projectId.
- Si la tarea es personal, cotidiana o no tiene relaci\xF3n con ning\xFAn proyecto existente (ej. "comprar repuestos para el auto", "comprar leche", "renovar el pasaporte"), NO la asignes a un proyecto de negocios o tecnolog\xEDa no relacionado. Deja projectId vac\xEDo o como "Personal & General" para que se guarde en la bandeja adecuada.

REGLA DE ORO DE ACCIONES (SIN ALUCINACIONES):
- Si el usuario menciona una reuni\xF3n, llamada o cita con fecha/hora (ej. "ma\xF1ana a las 4", "reuni\xF3n el viernes", "llamada a las 15:00"): DEBES INVOCAR create_calendar_event. NUNCA respondas en texto que agendaste la reuni\xF3n si no llamaste a la herramienta.
- Si el usuario menciona tareas o pendientes por hacer: DEBES INVOCAR create_project_task. NUNCA respondas en texto que creaste la tarea si no llamaste a la herramienta.
- Si el usuario solo comparte una charla casual o personal (an\xE9cdotas, comida, pel\xEDculas, saludo): responde c\xE1lidamente con empat\xEDa en 1 o 2 p\xE1rrafos sin forzar herramientas.

DIRECTIVAS Y FUNCTION CALLING:
1. Tienes herramientas para gestionar eventos del calendario: create_calendar_event, update_calendar_event, delete_calendar_event, check_calendar_availability.
2. Tienes herramientas para gestionar proyectos y tareas: create_project, delete_project, create_project_task, complete_project_task, update_project_task, delete_project_task, set_next_step, record_decision, record_idea, record_blocker.
3. Si el usuario pide crear un proyecto o convertir una idea en proyecto expl\xEDcitamente, SIEMPRE llama inmediatamente a create_project.
4. Responde con un resumen claro, conciso y natural de lo realizado en espa\xF1ol.
`;
    } else {
      const activeProj = liveProjects.find((p) => p.id === activeProjectId) || liveProjects[0];
      systemInstruction = `Eres el Agente Especializado y Copiloto del proyecto "${activeProj?.name || "Proyecto"}" en "Project OS".

CONTEXTO TEMPORAL DEL USUARIO (DISPOSITIVO):
- Fecha actual: ${timeContext.formattedDate} (${timeContext.currentDate})
- Hora actual: ${timeContext.currentTime} (Zona horaria: ${timeContext.timezone})
- D\xEDa de la semana: ${timeContext.weekday}
- Ma\xF1ana ser\xE1: ${timeContext.tomorrowDate}
- Ayer fue: ${timeContext.yesterdayDate}

EVENTOS AGENDADOS EN EL CALENDARIO:
${JSON.stringify(
        liveEvents.map((e) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          location: e.location,
          project: e.projectName
        })),
        null,
        2
      )}

CONTEXTO DEL PROYECTO ACTUAL ("${activeProj?.name}"):
- ID: ${activeProj?.id}
- Nombre: ${activeProj?.name}
- Categor\xEDa: ${activeProj?.category}
- Estado: ${activeProj?.status}
- Objetivo Principal: ${activeProj?.mainGoal}
- Pr\xF3ximo Paso Actual: ${activeProj?.nextStep}
- Tareas Existentes:
${JSON.stringify(
        activeProj?.tasks?.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.dueDate,
          dueTime: t.dueTime,
          priority: t.priority
        })) || [],
        null,
        2
      )}
- Decisiones Previas: ${JSON.stringify(activeProj?.decisions?.map((d) => ({ title: d.title, date: d.date })) || [])}
- Ideas: ${JSON.stringify(activeProj?.ideas?.map((i) => i.title) || [])}
- Hitos: ${JSON.stringify(activeProj?.milestones?.map((m) => ({ title: m.title, completed: m.completed })) || [])}

CAPACIDAD MULTITAREA Y LENGUAJE NATURAL FLUIDO:
1. El usuario puede hablarte corrido y expresar m\xFAltiples cosas en una sola intervenci\xF3n.
2. Si detectas tareas para este proyecto ("tengo que...", "hay que..."), LLAMA A create_project_task asociadas a este proyecto.
3. Si detectas una reuni\xF3n o llamada con fecha/hora, LLAMA A create_calendar_event.
4. Si el usuario te habla de forma relajada o casual, responde de forma emp\xE1tica y reflexiva.
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
        true
        // Always enable tools so Gemini can call actions organically from natural language
      );
      if (geminiResult) {
        const updatedProject2 = liveProjects.find((p) => p.id === activeProjectId);
        return res.json({
          reply: geminiResult.reply,
          actionsExecuted: accumulatedActions,
          memoryUpdates: accumulatedActions.map((act) => ({
            id: `mem-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            type: act.type.includes("decision") ? "decision" : act.type.includes("next_step") ? "next_step" : act.type.includes("idea") ? "idea" : act.type.includes("blocker") ? "problem" : "task",
            title: act.details,
            description: act.label,
            applied: true
          })),
          updatedProjects: liveProjects,
          updatedProject: updatedProject2 || void 0,
          updatedEvents: liveEvents,
          provider: "gemini",
          model: geminiResult.modelUsed
        });
      }
      console.warn("[Gemini Provider] External models temporarily unavailable, serving seamlessly with local intelligence engine.");
    }
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
        type: act.type.includes("decision") ? "decision" : act.type.includes("next_step") ? "next_step" : act.type.includes("idea") ? "idea" : act.type.includes("blocker") ? "problem" : "task",
        title: act.details,
        description: act.label,
        applied: true
      })),
      updatedProjects: liveProjects,
      updatedProject: updatedProject || void 0,
      updatedEvents: liveEvents,
      provider: "local-intelligence"
    });
  } catch (error) {
    console.warn("[API /api/chat] Error handled gracefully with fallback:", error?.message || error);
    return res.json({
      reply: "Ha ocurrido un inconveniente temporal procesando la consulta. El sistema se mantiene operativo.",
      actionsExecuted: [],
      memoryUpdates: [],
      provider: "fallback",
      warning: error?.message
    });
  }
});
function executeLocalIntelligentEngine(userText, liveProjects, liveEvents, activeProjectId, isGeneral, timeContext, accumulatedActions, isProjectRelated) {
  const text = (userText || "").toLowerCase();
  const targetProject = findTargetProject(liveProjects, void 0, activeProjectId, userText);
  const projName = targetProject?.name || "este proyecto";
  const projectRelated = isProjectRelated !== void 0 ? isProjectRelated : isProjectOSIntent(userText, liveProjects.map((p) => p.name));
  if (!projectRelated) {
    if (text.includes("pizza") || text.includes("com\xED") || text.includes("comi") || text.includes("comida") || text.includes("cena") || text.includes("almuerzo")) {
      return {
        reply: `\xA1Qu\xE9 bien suena eso! Nada como disfrutar de una buena comida para recargar energ\xEDas. \xBFQu\xE9 tal estuvo?`
      };
    }
    if (text.includes("pel\xEDcula") || text.includes("pelicula") || text.includes("cine") || text.includes("serie")) {
      return {
        reply: `\xA1Qu\xE9 buen plan! \xBFQu\xE9 pel\xEDcula o serie viste? \xBFLa recomendar\xEDas?`
      };
    }
    if (text.includes("aburrido") || text.includes("aburrida")) {
      return {
        reply: `A veces desconectar y tener un momento libre es genial. Puedes relajarte un rato o, si te dan ganas de hacer algo, aqu\xED estoy para conversar o planificar.`
      };
    }
    if (text.includes("sab\xEDas") || text.includes("sabias")) {
      return {
        reply: `\xA1No lo sab\xEDa! Me encanta aprender datos curiosos e interesantes. Cu\xE9ntame m\xE1s al respecto.`
      };
    }
    if (text.includes("opinas") || text.includes("crees") || text.includes("qu\xE9 te parece") || text.includes("que te parece")) {
      return {
        reply: `Me parece un punto muy interesante para reflexionar. Cu\xE9ntame un poco m\xE1s de tu perspectiva.`
      };
    }
    if (text.includes("te cuento") || text.includes("pas\xF3") || text.includes("paso")) {
      return {
        reply: `\xA1Cu\xE9ntame! Te escucho con total atenci\xF3n.`
      };
    }
    if (text.includes("hola") || text.includes("buenos") || text.includes("buenas")) {
      return {
        reply: `\xA1Hola! \xBFC\xF3mo va todo hoy? Aqu\xED estoy para conversar o cuando quieras revisar algo de tus proyectos y tareas.`
      };
    }
    return {
      reply: `\xA1Qu\xE9 buen tema! Cu\xE9ntame m\xE1s al respecto o dime si en alg\xFAn momento deseas consultar o avanzar en algo de Project OS.`
    };
  }
  const isExplicitCreateProject = text.includes("crea un proyecto") || text.includes("crear un proyecto") || text.includes("quiero crear un proyecto") || text.includes("convierte esto en un proyecto") || text.includes("convertir esto en un proyecto") || text.includes("haz de esto un proyecto") || text.includes("haz de todo lo que hemos hablado un proyecto") || text.includes("registra esto como un nuevo proyecto") || text.includes("crea un proyecto con esta idea") || text.includes("crea un proyecto para esta idea") || text.includes("quiero que esto sea un proyecto") || /^(?:s[íi]|claro|dale)[,\s]+(?:cr[ée]alo|hazlo)/i.test(text);
  if (isExplicitCreateProject) {
    let extractedName = "";
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
      if (text.includes("cv smart")) extractedName = "CV Smart";
      else if (text.includes("rese\xF1a") || text.includes("resenas")) extractedName = "Negocio de Rese\xF1as";
      else if (text.includes("inversiones")) extractedName = "App de Inversiones";
      else if (text.includes("receta")) extractedName = "App de Recetas";
      else extractedName = "Nuevo Proyecto";
    }
    extractedName = extractedName.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    executeTool(
      "create_project",
      {
        name: extractedName,
        description: `Proyecto creado a partir de la conversaci\xF3n: "${userText}"`,
        category: extractedName.toLowerCase().includes("negocio") ? "Negocio" : "Producto",
        status: "Activo"
      },
      liveProjects,
      liveEvents,
      activeProjectId,
      timeContext,
      accumulatedActions
    );
    return {
      reply: `He creado el proyecto **"${extractedName}"** inmediatamente seg\xFAn lo solicitado.

Ya est\xE1 visible y disponible en tu lista de **Proyectos** para continuar estructurando sus objetivos, decisiones y tareas.`
    };
  }
  if (text.includes("agenda") || text.includes("agendar") || text.includes("reuni\xF3n") || text.includes("reunion") || text.includes("cita") || text.includes("llamada") && (text.includes("ma\xF1ana") || text.includes("a las") || text.includes("hoy"))) {
    let eventDate = timeContext.currentDate;
    if (text.includes("ma\xF1ana")) eventDate = timeContext.tomorrowDate;
    else if (text.includes("pasado ma\xF1ana")) {
      const [y, m, d] = timeContext.currentDate.split("-").map(Number);
      const dt = new Date(y, m - 1, d + 2);
      eventDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    }
    let startTime = "16:00";
    if (text.includes("4 de la tarde") || text.includes("las cuatro") || text.includes("las 4")) startTime = "16:00";
    else if (text.includes("5 de la tarde") || text.includes("las cinco") || text.includes("las 5")) startTime = "17:00";
    else if (text.includes("3 de la tarde") || text.includes("las tres") || text.includes("las 3")) startTime = "15:00";
    else if (text.includes("2 de la tarde") || text.includes("las dos") || text.includes("las 2")) startTime = "14:00";
    else if (text.includes("10 de la ma\xF1ana") || text.includes("las diez") || text.includes("las 10")) startTime = "10:00";
    else if (text.includes("11 de la ma\xF1ana") || text.includes("las once") || text.includes("las 11")) startTime = "11:00";
    else {
      const timeMatch = text.match(/a las (\d{1,2})(?::(\d{2}))?\s*(am|pm|de la tarde|de la mañana)?/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const period = timeMatch[3] || "";
        if ((period.includes("pm") || period.includes("tarde")) && h < 12) h += 12;
        startTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }
    let eventTitle = "Reuni\xF3n";
    const cleanMatch = userText.match(/(?:agenda(?:r)?|agendar una|agenda una|programa(?:r)?|crea un evento de)\s+([^.,;\n]+?)(?:\s+para\s+mañana|\s+mañana|\s+hoy|\s+a las|\.|$)/i);
    if (cleanMatch && cleanMatch[1].trim()) {
      eventTitle = cleanMatch[1].trim();
      eventTitle = eventTitle.charAt(0).toUpperCase() + eventTitle.slice(1);
    } else if (text.includes("reuni\xF3n con") || text.includes("reunion con")) {
      const withMatch = userText.match(/reuni[óo]n con\s+([^.,;\n]+?)(?:\s+para\s+mañana|\s+mañana|\s+hoy|\s+a las|\.|$)/i);
      if (withMatch) eventTitle = `Reuni\xF3n con ${withMatch[1].trim()}`;
    }
    const result = executeTool(
      "create_calendar_event",
      {
        title: eventTitle,
        date: eventDate,
        startTime,
        durationMinutes: 60,
        location: text.includes("meet") ? "Google Meet" : text.includes("zoom") ? "Zoom" : void 0
      },
      liveProjects,
      liveEvents,
      activeProjectId,
      timeContext,
      accumulatedActions
    );
    return {
      reply: `He agendado en tu calendario: **"${eventTitle}"** para el d\xEDa **${eventDate}** a las **${startTime}**.

Puedes verlo y gestionarlo en la secci\xF3n de **Calendario**, con la opci\xF3n de exportarlo directamente a Google Calendar.`
    };
  }
  if (text.includes("ya termin\xE9") || text.includes("ya termine") || text.includes("complet\xE9") || text.includes("complete la tarea") || text.includes("finalic\xE9")) {
    const match = userText.match(/(?:ya terminé|ya termine|completé|complete|finalicé|terminé)(?:\s+la tarea)?\s+([^.,;\n]+)/i);
    const query = match ? match[1].trim() : userText;
    const result = executeTool("complete_project_task", { taskTitleMatch: query }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    if (result.success) {
      return {
        reply: `\xA1Excelente trabajo! He marcado la tarea **"${result.task?.title}"** como completada en **${projName}**.

Esto hace avanzar el progreso de este ciclo. \xBFCu\xE1l es el siguiente \xEDtem en el que quieres concentrarte?`
      };
    }
  }
  if (text.includes("crea una tarea") || text.includes("crear una tarea") || text.includes("tengo que") || text.includes("hay que") || text.includes("falta") || text.includes("debo") || text.includes("tarea:")) {
    const isTomorrow = text.includes("ma\xF1ana");
    const isToday = text.includes("hoy");
    const dueDate = isTomorrow ? timeContext.tomorrowDate : isToday ? timeContext.currentDate : void 0;
    let title = "";
    const namedMatch = userText.match(/(?:crea(?:r)? una tarea(?: para mañana)?(?: llamada| nombrada)?)\s+["']?([^"'\n.,;]+)["']?/i);
    if (namedMatch && namedMatch[1].trim()) {
      title = namedMatch[1].trim();
    } else {
      const match = userText.match(/(?:tengo que|hay que|falta|debo|tarea:?)\s+([^.,;\n]+)/i);
      title = match ? match[1].trim() : userText.substring(0, 50);
    }
    if (title.length > 3) {
      const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
      const result = executeTool("create_project_task", { title: cleanTitle, dueDate }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
      return {
        reply: `He creado la tarea **"${cleanTitle}"**${dueDate ? ` con fecha l\xEDmite para el **${dueDate}**` : ""} en **${targetProject?.name || "Project OS"}**.

Aparecer\xE1 de inmediato en tu vista de **Tareas** para que no pierdas el foco.`
      };
    }
  }
  if (text.includes("decid") || text.includes("vamos a usar") || text.includes("optamos por") || text.includes("elegimos")) {
    const clean = userText.replace(/^(he decidido que|hemos decidido que|decidí que|decisión:|decidido:)/i, "").trim();
    const result = executeTool("record_decision", { title: clean, description: userText }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    return {
      reply: `He registrado formalmente la decisi\xF3n en la memoria de **${projName}**:

\u2022 **Decisi\xF3n**: "${clean}"

Queda documentada con fecha de hoy (${timeContext.currentDate}) para mantener trazabilidad estrat\xE9gica del proyecto.`
    };
  }
  if (text.includes("pr\xF3ximo paso") || text.includes("proximo paso") || text.includes("siguiente paso") || text.includes("ahora toca")) {
    const match = userText.match(/(?:próximo paso|proximo paso|siguiente paso|ahora toca)(?:\s+es|\s*:)?\s+([^.\n]+)/i);
    const nextStep = match ? match[1].trim() : userText.substring(0, 60);
    executeTool("set_next_step", { nextStep }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    return {
      reply: `Pr\xF3ximo paso de **${projName}** actualizado a:

\u{1F449} **"${nextStep}"**

Tener un pr\xF3ximo paso singular y claro es la forma m\xE1s r\xE1pida de avanzar sin sobrepensar.`
    };
  }
  if (text.includes("idea") || text.includes("se me ocurri\xF3") || text.includes("podr\xEDamos")) {
    executeTool("record_idea", { title: userText }, liveProjects, liveEvents, activeProjectId, timeContext, accumulatedActions);
    return {
      reply: `Idea registrada en la memoria de **${projName}**: "${userText}". La guardamos para cuando llegue el momento oportuno de iteraci\xF3n.`
    };
  }
  if (text.includes("activos") || text.includes("proyectos") && (text.includes("tengo") || text.includes("cu\xE1les") || text.includes("cuales") || text.includes("estado"))) {
    const activeProjects = liveProjects.filter((p) => p.status === "Activo");
    const listText = (activeProjects.length > 0 ? activeProjects : liveProjects).map((p) => `\u2022 **${p.name}** [${p.status}] (${p.category}): Pr\xF3ximo paso \u2794 _${p.nextStep || "Sin definir"}_`).join("\n");
    return {
      reply: `Actualmente tienes **${activeProjects.length} proyecto${activeProjects.length === 1 ? "" : "s"} activo${activeProjects.length === 1 ? "" : "s"}**:

${listText}

\xBFQuieres que profundicemos en alguno en particular?`
    };
  }
  if (text.includes("pendiente") || text.includes("pendientes") || text.includes("tengo que hacer")) {
    const isTomorrow = text.includes("ma\xF1ana");
    const targetDate = isTomorrow ? timeContext.tomorrowDate : timeContext.currentDate;
    const allTasks = [];
    liveProjects.forEach((p) => {
      (p.tasks || []).forEach((t) => {
        if (t.status === "pendiente") {
          if (!isTomorrow || !t.dueDate || t.dueDate === targetDate) {
            allTasks.push(`\u2022 **${t.title}** (en _${p.name}_)${t.dueDate ? ` - L\xEDmite: ${t.dueDate}` : ""}`);
          }
        }
      });
    });
    if (allTasks.length > 0) {
      return {
        reply: `Aqu\xED tienes las tareas pendientes ${isTomorrow ? "para ma\xF1ana" : "actuales"}:

${allTasks.slice(0, 6).join("\n")}

\xBFQuieres que marquemos alguna como completada o agregar otra?`
      };
    } else {
      return {
        reply: `\xA1Al d\xEDa! No tienes tareas pendientes registradas para ${isTomorrow ? "ma\xF1ana" : "hoy"}.`
      };
    }
  }
  if (text.includes("acuerdas") || text.includes("recuerdas") || text.includes("estaba trabajando") || text.includes("en qu\xE9 estaba") || text.includes("en que estaba")) {
    const activeProj = liveProjects.find((p) => p.id === activeProjectId) || liveProjects.find((p) => p.status === "Activo") || liveProjects[0];
    if (activeProj) {
      return {
        reply: `S\xED, recuerdo perfectamente. En **${activeProj.name}** estuviste concentrado en:

\u2022 **Objetivo**: ${activeProj.mainGoal || "En desarrollo"}
\u2022 **Pr\xF3ximo paso**: ${activeProj.nextStep || "Por definir"}
${activeProj.tasks?.find((t) => t.status === "pendiente") ? `\u2022 **Tarea prioritaria**: ${activeProj.tasks.find((t) => t.status === "pendiente")?.title}
` : ""}
\xBFQuieres retomar el trabajo desde este punto?`
      };
    }
  }
  if (isGeneral) {
    const activeCount = liveProjects.filter((p) => p.status === "Activo").length;
    if (text.includes("priorizar") || text.includes("hoy") || text.includes("enfoque")) {
      return {
        reply: `Analizando tu portfolio de **${liveProjects.length} proyectos** (${activeCount} en estado Activo):

1. **Foco recomendado**: Dedica tu bloque principal al proyecto con el pr\xF3ximo paso m\xE1s validable hoy.
2. **T\xE1ctica diaria**: No intentes avanzar m\xE1s de dos proyectos a fondo en la misma jornada para evitar la fatiga por cambio de contexto.

\xBFQuieres que profundicemos en alg\xFAn proyecto en particular?`
      };
    }
    return {
      reply: `Como Director de Proyectos en **Project OS**, tengo visibilidad de todos tus proyectos (${liveProjects.map((p) => p.name).join(", ")}). Puedes pedirme crear tareas, actualizar pr\xF3ximos pasos o debatir estrategias para cualquiera de ellos.`
    };
  }
  return {
    reply: `Entendido sobre **${projName}**. Estoy al tanto de tus objetivos, tareas pendientes y pr\xF3ximos pasos. Cu\xE9ntame si quieres planificar, registrar alguna decisi\xF3n o definir qu\xE9 avanzar a continuaci\xF3n.`
  };
}
async function startServer() {
  const httpServer = import_http.default.createServer(app);
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      plugins: [
        {
          name: "silence-vite-hmr-logs",
          transform(code, id) {
            if (id.includes("vite/dist/client") || id.includes("@vite/client")) {
              return code.replaceAll('console.error("[vite]"', 'console.debug("[vite]"').replaceAll("console.error(`[vite]", "console.debug(`[vite]").replaceAll("throw e;", "/* silenced HMR error */");
            }
          }
        }
      ],
      server: {
        middlewareMode: true,
        ws: { server: httpServer }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Project OS Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  generateConfirmationCode,
  resolvePendingDeletion
});
//# sourceMappingURL=server.cjs.map
