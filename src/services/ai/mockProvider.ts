import { ChatMessage, ChatMemoryItem, Project, CalendarEvent, Task } from '../../types';
import { AIChatOptions, AIChatResponse, AIProvider } from './types';
import { isProjectOSIntent } from '../../utils/intentDetection';

function parseNaturalDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (lower.includes('hoy') || lower.includes('today')) return fmt(now);
  if (lower.includes('pasado mañana') || lower.includes('pasado manana')) {
    now.setDate(now.getDate() + 2);
    return fmt(now);
  }
  if (lower.includes('mañana') || lower.includes('manana') || lower.includes('tomorrow')) {
    now.setDate(now.getDate() + 1);
    return fmt(now);
  }

  const matchIso = text.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (matchIso) return matchIso[0];

  const days: Record<string, number> = {
    domingo: 0, lunes: 1, martes: 2, miercoles: 3, miércoles: 3,
    jueves: 4, viernes: 5, sabado: 6, sábado: 6
  };
  for (const [dayName, targetDay] of Object.entries(days)) {
    if (lower.includes(dayName)) {
      const cur = now.getDay();
      let diff = targetDay - cur;
      if (diff <= 0) diff += 7;
      now.setDate(now.getDate() + diff);
      return fmt(now);
    }
  }

  now.setDate(now.getDate() + 1);
  return fmt(now);
}

function parseNaturalTime(text: string): string {
  const lower = text.toLowerCase();
  const match12 = lower.match(/(?:a las\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:de la tarde|pm|de la noche)/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] || '00';
    if (h < 12) h += 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const matchAm = lower.match(/(?:a las\s+)?(\d{1,2})(?::(\d{2}))?\s*(?:de la mañana|am)/i);
  if (matchAm) {
    let h = parseInt(matchAm[1], 10);
    const m = matchAm[2] || '00';
    if (h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  const match24 = lower.match(/(?:a las\s+)?(\d{1,2}):(\d{2})/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    return `${String(h).padStart(2, '0')}:${match24[2]}`;
  }
  const matchSimple = lower.match(/a las\s+(\d{1,2})\b/);
  if (matchSimple) {
    let h = parseInt(matchSimple[1], 10);
    if (h <= 7) h += 12;
    return `${String(h).padStart(2, '0')}:00`;
  }
  return '16:00';
}

interface LocalPendingDeletion {
  projectId: string;
  projectName: string;
  confirmationCode: string;
  createdAt: number;
}

let localPendingDeletion: LocalPendingDeletion | null = null;

function generateLocalConfirmationCode(projectName: string): string {
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
    prefix = (words[0] + words[1]).toUpperCase().slice(0, 8);
  } else {
    prefix = words[0].toUpperCase().slice(0, 8);
  }
  if (!prefix) prefix = 'PROYECTO';
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${randNum}`;
}

export class MockAIProvider implements AIProvider {
  name = 'local-intelligence';

  async sendMessage(
    messages: ChatMessage[],
    options: AIChatOptions
  ): Promise<AIChatResponse> {
    // Artificial slight latency for realistic conversational feel
    await new Promise((resolve) => setTimeout(resolve, 300));

    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage?.content || '';
    const textLower = userText.toLowerCase();

    // ==============================================================
    // SEGURIDAD Y BORRADO DE PROYECTOS (delete_project)
    // ==============================================================
    const allProjects: Project[] = Array.isArray(options.projectContext)
      ? [...options.projectContext]
      : options.projectContext
      ? [options.projectContext as Project]
      : [];

    // Caso D: Cancelar borrado
    const isCancelRequest =
      /^(?:no|cancelar|cancela|mejor no|d[eé]jalo|olv[ií]dalo|ya no|no lo borres|no borres)$/i.test(userText.trim()) ||
      /(?:mejor no|cancela la eliminaci[oó]n|cancelar la eliminaci[oó]n|no lo borres|no borrar)/i.test(textLower);

    if (localPendingDeletion && isCancelRequest) {
      const cancelledName = localPendingDeletion.projectName;
      localPendingDeletion = null;
      return {
        reply: `Se ha cancelado la eliminación del proyecto ‘${cancelledName}’. El proyecto permanece intacto.`,
        memoryUpdates: [],
        provider: 'local-intelligence',
      };
    }

    // Detectar solicitud de eliminación de proyecto
    const isTaskDeletion = textLower.includes('tarea') || textLower.includes('pendiente');
    const isEventDeletion = textLower.includes('reunión') || textLower.includes('reunion') || textLower.includes('evento') || textLower.includes('cita');
    const isExplicitProjectDeletion =
      !isTaskDeletion &&
      !isEventDeletion &&
      (/(?:borra|borrar|elimina|eliminar|suprime|suprimir|destruye|destruir)\s+(?:este\s+proyecto|ese\s+proyecto|el\s+proyecto|proyecto)/i.test(textLower) ||
        /^(?:borra|borrar|elimina|eliminar)\s+/i.test(userText.trim()) ||
        /(?:quiero|deseo|necesito)\s+(?:borrar|eliminar)\s+(?:este\s+|el\s+)?proyecto/i.test(textLower));

    if (isExplicitProjectDeletion) {
      let targetProj: Project | null = null;
      for (const p of allProjects) {
        if (textLower.includes(p.name.toLowerCase())) {
          targetProj = p;
          break;
        }
      }

      if (!targetProj && !options.isGeneral && options.projectContext) {
        targetProj = options.projectContext as Project;
      } else if (!targetProj && allProjects.length === 1) {
        targetProj = allProjects[0];
      }

      if (!targetProj) {
        return {
          reply: '¿Qué proyecto deseas eliminar? Por favor indica el nombre exacto del proyecto que quieres borrar.',
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      const code = generateLocalConfirmationCode(targetProj.name);
      localPendingDeletion = {
        projectId: targetProj.id,
        projectName: targetProj.name,
        confirmationCode: code,
        createdAt: Date.now(),
      };

      return {
        reply: `Vas a eliminar permanentemente el proyecto ‘${targetProj.name}’. Esta acción no se puede deshacer.\n\nPara confirmar, escribe exactamente: ${code}`,
        memoryUpdates: [],
        provider: 'local-intelligence',
      };
    }

    if (localPendingDeletion) {
      const cleanUpper = userText.trim().toUpperCase().replace(/[.,!]/g, '');
      const codeRegex = new RegExp(`\\b${localPendingDeletion.confirmationCode}\\b`, 'i');
      const isExactCode = cleanUpper === localPendingDeletion.confirmationCode || codeRegex.test(userText);

      // Caso C: Código exacto proporcionado
      if (isExactCode) {
        const deletedId = localPendingDeletion.projectId;
        const deletedName = localPendingDeletion.projectName;
        localPendingDeletion = null;

        const updatedProjects = allProjects.filter((p) => p.id !== deletedId);

        return {
          reply: `Proyecto ‘${deletedName}’ eliminado correctamente.`,
          memoryUpdates: [],
          actionsExecuted: [
            {
              type: 'project_deleted',
              label: 'Proyecto eliminado',
              details: deletedName,
              projectId: deletedId,
            },
          ],
          updatedProjects,
          provider: 'local-intelligence',
        };
      }

      // Caso E: Código erróneo
      const codePattern = /\b([A-Z0-9]{3,}-\d{2,})\b/i;
      const matchedOtherCode = userText.match(codePattern);
      if (matchedOtherCode && matchedOtherCode[1].toUpperCase() !== localPendingDeletion.confirmationCode) {
        return {
          reply: `El código de confirmación ingresado no coincide con el código requerido (**${localPendingDeletion.confirmationCode}**) para eliminar ‘${localPendingDeletion.projectName}’. El proyecto permanece intacto. Por favor, escribe exactamente el código mostrado para proceder, o 'cancelar' si cambiaste de idea.`,
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      // Caso B: Confirmación ambigua
      const isAmbiguousConfirm =
        /^(?:s[íi]|dale|confirmo|hazlo|b[oó]rralo|elim[ií]nalo|ok|adelante|procede|claro|por favor|s[íi],\s*b[oó]rralo|si,\s*borralo|dale,\s*b[oó]rralo|hazlo\s*ya)$/i.test(userText.trim()) ||
        /(?:s[íi],?\s*b[oó]rralo|dale,?\s*elim[ií]nalo|confirmo\s*la\s*eliminaci[oó]n)/i.test(textLower);

      if (isAmbiguousConfirm) {
        return {
          reply: `Para confirmar la eliminación permanente del proyecto ‘${localPendingDeletion.projectName}’, debes escribir exactamente el código de seguridad: **${localPendingDeletion.confirmationCode}**\n\nSi prefieres no eliminarlo, escribe 'cancelar' o 'mejor no'.`,
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }
    }

    if (options.isGeneral) {
      const projects = Array.isArray(options.projectContext) ? [...options.projectContext] : [];
      const activeCount = projects.filter((p) => p.status === 'Activo').length;

      // 1. Detección de intención: Si no está relacionada con Project OS, responder directamente
      const isProjectRelated = isProjectOSIntent(userText, projects.map((p) => p.name));
      if (!isProjectRelated) {
        let reply = '¡Qué bien conversar contigo! Cuéntame más al respecto o dime si en algún momento deseas consultar o avanzar en algo de Project OS.';
        if (textLower.includes('pizza') || textLower.includes('comí') || textLower.includes('comi') || textLower.includes('comida') || textLower.includes('cena') || textLower.includes('almuerzo')) {
          reply = '¡Qué bien suena eso! Nada como disfrutar de una buena comida para recargar energías. ¿Qué tal estuvo?';
        } else if (textLower.includes('película') || textLower.includes('pelicula') || textLower.includes('cine') || textLower.includes('serie')) {
          reply = '¡Qué buen plan! ¿Qué película o serie viste? ¿La recomendarías?';
        } else if (textLower.includes('aburrido') || textLower.includes('aburrida')) {
          reply = 'A veces desconectar y tener un momento libre es genial. Puedes relajarte un rato o, si te dan ganas de hacer algo, aquí estoy para conversar o planificar.';
        } else if (textLower.includes('sabías') || textLower.includes('sabias')) {
          reply = '¡No lo sabía! Me encanta aprender datos curiosos e interesantes. Cuéntame más al respecto.';
        } else if (textLower.includes('opinas') || textLower.includes('crees') || textLower.includes('qué te parece') || textLower.includes('que te parece')) {
          reply = 'Me parece un punto muy interesante para reflexionar. Cuéntame un poco más de tu perspectiva.';
        } else if (textLower.includes('te cuento') || textLower.includes('pasó') || textLower.includes('paso')) {
          reply = '¡Cuéntame! Te escucho con total atención.';
        } else if (textLower.includes('hola') || textLower.includes('buenos') || textLower.includes('buenas')) {
          reply = '¡Hola! ¿Cómo va todo hoy? Aquí estoy para conversar o cuando quieras revisar algo de tus proyectos y tareas.';
        }

        return {
          reply,
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      // Detect explicit project creation
      const isExplicitCreate =
        textLower.includes('crea un proyecto') ||
        textLower.includes('crear un proyecto') ||
        textLower.includes('quiero crear un proyecto') ||
        textLower.includes('convierte esto en un proyecto') ||
        textLower.includes('convertir esto en un proyecto') ||
        textLower.includes('haz de esto un proyecto') ||
        textLower.includes('haz de todo lo que hemos hablado un proyecto') ||
        textLower.includes('registra esto como un nuevo proyecto') ||
        textLower.includes('crea un proyecto con esta idea') ||
        textLower.includes('crea un proyecto para esta idea') ||
        textLower.includes('quiero que esto sea un proyecto') ||
        /^(?:s[íi]|claro|dale)[,\s]+(?:cr[ée]alo|hazlo)/i.test(textLower);

      if (isExplicitCreate) {
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
          if (textLower.includes('cv smart')) extractedName = 'CV Smart';
          else if (textLower.includes('reseña') || textLower.includes('resenas')) extractedName = 'Negocio de Reseñas';
          else if (textLower.includes('inversiones')) extractedName = 'App de Inversiones';
          else if (textLower.includes('receta')) extractedName = 'App de Recetas';
          else extractedName = 'Nuevo Proyecto';
        }

        extractedName = extractedName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const newId = `proj-${Date.now()}`;
        const now = new Date().toISOString();

        const newProject: Project = {
          id: newId,
          name: extractedName,
          description: `Proyecto creado desde la conversación: "${userText}"`,
          category: extractedName.toLowerCase().includes('negocio') ? 'Negocio' : 'Producto',
          status: 'Activo',
          mainGoal: '',
          nextStep: '',
          createdAt: now,
          updatedAt: now,
          milestones: [],
          decisions: [],
          ideas: [],
          tasks: [],
          activities: [
            {
              id: `act-${Date.now()}`,
              projectId: newId,
              projectName: extractedName,
              type: 'project_created',
              description: `Se creó el proyecto "${extractedName}" desde el chat.`,
              timestamp: now,
            },
          ],
          messages: [
            {
              id: `msg-welcome-${Date.now()}`,
              projectId: newId,
              role: 'assistant',
              content: `¡Hola! Soy tu copiloto para **${extractedName}**. Puedes hablarme de cualquier idea, obstáculo o decisión para continuar avanzando.`,
              timestamp: now,
            },
          ],
        };

        const updatedProjects = [newProject, ...projects];

        return {
          reply: `He creado el proyecto **"${extractedName}"** inmediatamente según lo solicitado.\n\nYa está visible en tu lista de **Proyectos** y puedes comenzar a trabajar en él cuando desees.`,
          updatedProjects,
          actionsExecuted: [
            {
              type: 'project_created',
              label: 'Proyecto creado',
              details: extractedName,
              projectId: newId,
            },
          ],
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      // Detect Calendar Event (reunión, cita, llamada, agenda)
      const isCalendarIntent =
        textLower.includes('reunión') ||
        textLower.includes('reunion') ||
        textLower.includes('cita') ||
        textLower.includes('llamada') ||
        textLower.includes('agenda') ||
        textLower.includes('agendar') ||
        textLower.includes('evento');

      if (isCalendarIntent) {
        const resolvedDate = parseNaturalDate(userText);
        const resolvedTime = parseNaturalTime(userText);

        let eventTitle = 'Reunión';
        const matchTitle = userText.match(/(?:reuni[oó]n|llamada|cita|evento)(?:\s+(?:con|de|para))?\s+([^.,;\n]+)/i);
        if (matchTitle && matchTitle[1].trim()) {
          const raw = matchTitle[1].trim();
          const cleanTitle = raw
            .replace(/(?:mañana|hoy|ayer|el\s+[a-záéíóú]+|a\s+las\s+\d+.*|en\s+el\s+calendario)/gi, '')
            .trim();
          if (cleanTitle.length > 2) {
            eventTitle = `Reunión: ${cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)}`;
          } else {
            eventTitle = matchTitle[0].trim();
          }
        } else {
          eventTitle = 'Reunión agendada';
        }

        const targetProj = projects.find((p) => p.name && textLower.includes(p.name.toLowerCase()));

        const [sh, sm] = resolvedTime.split(':').map(Number);
        const endHour = (sh + 1) % 24;
        const endTime = `${String(endHour).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;

        const newEvent: CalendarEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          title: eventTitle,
          date: resolvedDate,
          startTime: resolvedTime,
          endTime,
          durationMinutes: 60,
          status: 'confirmado',
          projectId: targetProj?.id,
          projectName: targetProj?.name,
          createdAt: new Date().toISOString(),
          provider: 'local',
          syncStatus: 'local_only',
        };

        const existingEvents = Array.isArray(options.eventsContext) ? [...options.eventsContext] : [];
        const updatedEvents = [...existingEvents, newEvent];

        return {
          reply: `He agendado en tu calendario: **"${newEvent.title}"** para el **${newEvent.date}** a las **${newEvent.startTime}**${targetProj ? ` (Proyecto: *${targetProj.name}*)` : ''}.\n\nYa está visible y registrado en tu sección de **Calendario**.`,
          actionsExecuted: [
            {
              type: 'event_created',
              label: 'Evento agendado',
              details: `${newEvent.title} [${newEvent.date} a las ${newEvent.startTime}]`,
              projectId: targetProj?.id,
            },
          ],
          memoryUpdates: [
            {
              id: `mem-${Date.now()}`,
              type: 'task',
              title: `${newEvent.title} [${newEvent.date} a las ${newEvent.startTime}]`,
              description: 'Evento agendado en el calendario',
              applied: true,
            },
          ],
          updatedEvents,
          updatedProjects: projects,
          provider: 'local-intelligence',
        };
      }

      // Detect Task Creation (tengo que, hay que, tarea, debo, falta)
      const isTaskIntent =
        textLower.includes('tengo que') ||
        textLower.includes('hay que') ||
        textLower.includes('tarea') ||
        textLower.includes('debo') ||
        textLower.includes('falta hacer') ||
        textLower.includes('crea una tarea') ||
        textLower.includes('crear una tarea');

      if (isTaskIntent) {
        let taskTitle = '';
        const matchTask = userText.match(/(?:tengo que|hay que|debo|falta|crea(?:r)? una tarea llamada|tarea llamada|tarea:?)\s+([^.,;\n]+)/i);
        if (matchTask && matchTask[1].trim()) {
          taskTitle = matchTask[1].trim();
        } else {
          taskTitle = userText.slice(0, 50);
        }
        taskTitle = taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1);

        const dueDate = (textLower.includes('mañana') || textLower.includes('hoy') || textLower.includes('viernes') || textLower.includes('lunes'))
          ? parseNaturalDate(userText)
          : undefined;

        let targetProj = projects.find((p) => p.name && textLower.includes(p.name.toLowerCase()));
        if (!targetProj) {
          targetProj = projects.find((p) => p.name.toLowerCase().includes('personal') || p.name.toLowerCase().includes('general'));
          if (!targetProj) {
            targetProj = {
              id: `proj-gen-${Date.now()}`,
              name: 'Personal & General',
              description: 'Bandeja para tareas cotidianas y notas personales.',
              category: 'Personal',
              status: 'Activo',
              mainGoal: 'Organizar tareas cotidianas',
              nextStep: 'Revisar prioridades',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              milestones: [],
              decisions: [],
              ideas: [],
              tasks: [],
              activities: [],
              messages: [],
            };
            projects.unshift(targetProj);
          }
        }

        const newTask: Task = {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          projectId: targetProj.id,
          title: taskTitle,
          status: 'pendiente',
          createdAt: new Date().toISOString(),
          dueDate,
          priority: 'media',
        };

        if (!Array.isArray(targetProj.tasks)) targetProj.tasks = [];
        targetProj.tasks.push(newTask);

        return {
          reply: `He registrado la tarea **"${newTask.title}"** en el proyecto **${targetProj.name}**${newTask.dueDate ? ` (Límite: ${newTask.dueDate})` : ''}.\n\nPuedes verla y gestionarla en la sección de **Tareas** o dentro del proyecto.`,
          actionsExecuted: [
            {
              type: 'task_created',
              label: 'Tarea creada',
              details: newTask.title,
              projectId: targetProj.id,
            },
          ],
          memoryUpdates: [
            {
              id: `mem-${Date.now()}`,
              type: 'task',
              title: newTask.title,
              description: `Tarea creada en ${targetProj.name}`,
              applied: true,
            },
          ],
          updatedProjects: projects,
          provider: 'local-intelligence',
        };
      }

      // Caso B: Proyectos activos o consulta de proyectos
      if (textLower.includes('activos') || (textLower.includes('proyectos') && (textLower.includes('tengo') || textLower.includes('cuáles') || textLower.includes('cuales') || textLower.includes('estado')))) {
        const activeProjects = projects.filter((p) => p.status === 'Activo');
        const listText = (activeProjects.length > 0 ? activeProjects : projects)
          .map((p) => `• **${p.name}** [${p.status}] (${p.category}): Próximo paso ➔ _${p.nextStep || 'Sin definir'}_`)
          .join('\n');

        return {
          reply: `Actualmente tienes **${activeProjects.length} proyecto${activeProjects.length === 1 ? '' : 's'} activo${activeProjects.length === 1 ? '' : 's'}**:\n\n${listText}\n\n¿Quieres que profundicemos en alguno en particular?`,
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      // Caso C: Tareas pendientes
      if (textLower.includes('pendiente') || textLower.includes('pendientes') || textLower.includes('tengo que hacer')) {
        const allTasks: string[] = [];
        projects.forEach((p) => {
          (p.tasks || []).forEach((t) => {
            if (t.status === 'pendiente') {
              allTasks.push(`• **${t.title}** (en _${p.name}_)${t.dueDate ? ` - Límite: ${t.dueDate}` : ''}`);
            }
          });
        });

        if (allTasks.length > 0) {
          return {
            reply: `Tienes las siguientes tareas pendientes en tus proyectos:\n\n${allTasks.slice(0, 6).join('\n')}\n\n¿Quieres que marquemos alguna como terminada o crear una nueva?`,
            memoryUpdates: [],
            provider: 'local-intelligence',
          };
        } else {
          return {
            reply: `¡Al día! No tienes tareas pendientes registradas en este momento en tus proyectos.`,
            memoryUpdates: [],
            provider: 'local-intelligence',
          };
        }
      }

      // Caso E: Memoria / en qué estaba trabajando
      if (textLower.includes('acuerdas') || textLower.includes('recuerdas') || textLower.includes('estaba trabajando') || textLower.includes('en qué estaba') || textLower.includes('en que estaba')) {
        const activeProj = projects.find((p) => p.status === 'Activo') || projects[0];
        if (activeProj) {
          return {
            reply: `Sí, recuerdo perfectamente. En **${activeProj.name}** estuviste concentrado en:\n\n• **Objetivo**: ${activeProj.mainGoal || 'En desarrollo'}\n• **Próximo paso**: ${activeProj.nextStep || 'Por definir'}\n${activeProj.tasks?.find((t) => t.status === 'pendiente') ? `• **Tarea prioritaria**: ${activeProj.tasks.find((t) => t.status === 'pendiente')?.title}\n` : ''}\n¿Quieres retomar el trabajo desde este punto?`,
            memoryUpdates: [],
            provider: 'local-intelligence',
          };
        }
      }

      if (textLower.includes('priorizar') || textLower.includes('hoy') || textLower.includes('enfoque')) {
        return {
          reply: `Analizando tu portfolio completo de **${projects.length} proyectos** (${activeCount} en estado Activo):

1. **Prioridad 1 recomendada**: Revisa el proyecto con mayor validación inmediata. En este momento, **CV Smart** tiene listo el editor y su siguiente paso ("${projects.find((p) => p.name === 'CV Smart')?.nextStep || 'Integrar previsualización'}") te permitirá recibir feedback de usuarios reales.
2. **Prioridad 2 (Mantenimiento)**: Para **Poker Trainer**, evita empezar features complejas antes de tener claro el feedback de la arquitectura inicial.

¿Quieres que hagamos un repaso rápido de los próximos pasos de cada uno o definir el plan de la semana?`,
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      if (textLower.includes('resumen') || textLower.includes('estado') || textLower.includes('proyectos')) {
        const listText = projects
          .map((p) => `• **${p.name}** [${p.status}] (${p.category}): Próximo paso ➔ _${p.nextStep || 'Sin definir'}_`)
          .join('\n');

        return {
          reply: `Aquí tienes la panorámica estratégica de todos tus proyectos:\n\n${listText}\n\n¿En cuál de estos te gustaría concentrar la sesión de hoy?`,
          memoryUpdates: [],
          provider: 'local-intelligence',
        };
      }

      return {
        reply: `Como tu Director de Proyectos en **Project OS**, tengo visibilidad de tus ${projects.length} proyectos. 

Puedo ayudarte a:
- Evaluar prioridades y asignar tu tiempo inteligentemente.
- Analizar si conviene pausar un proyecto para acelerar otro.
- Revisar cuellos de botella transversales.

¿Qué tema estratégico quieres poner sobre la mesa?`,
        memoryUpdates: [],
        provider: 'local-intelligence',
      };
    }

    // Specific Project Conversation
    const project = (options.projectContext as Project) || null;
    const projName = project?.name || 'este proyecto';
    const memoryUpdates: ChatMemoryItem[] = [];

    // If casual conversation inside project chat, reply directly without analyzing or creating tasks
    if (!isProjectOSIntent(userText, project ? [project.name] : [])) {
      let casualReply = `¡Qué buen comentario! Cuéntame más al respecto o dime si en algún momento deseas retomar el trabajo en ${projName}.`;
      if (textLower.includes('pizza') || textLower.includes('comí') || textLower.includes('comi') || textLower.includes('comida')) {
        casualReply = `¡Qué bien suena eso! Nada como una buena pizza o comida para tomarse un respiro. ¿Qué tal estuvo?`;
      } else if (textLower.includes('película') || textLower.includes('pelicula')) {
        casualReply = `¡Qué buen plan! ¿Qué película o serie viste? ¿La recomendarías?`;
      } else if (textLower.includes('hola') || textLower.includes('buenos')) {
        casualReply = `¡Hola! Aquí estoy listo para colaborar en ${projName} o simplemente conversar.`;
      }
      return {
        reply: casualReply,
        memoryUpdates: [],
        provider: 'local-intelligence',
      };
    }

    // Detect calendar events inside project chat
    const isProjectCalendarIntent =
      textLower.includes('reunión') ||
      textLower.includes('reunion') ||
      textLower.includes('cita') ||
      textLower.includes('llamada') ||
      textLower.includes('agenda') ||
      textLower.includes('agendar') ||
      textLower.includes('evento');

    if (isProjectCalendarIntent && project) {
      const resolvedDate = parseNaturalDate(userText);
      const resolvedTime = parseNaturalTime(userText);

      let eventTitle = `Reunión: ${project.name}`;
      const matchTitle = userText.match(/(?:reuni[oó]n|llamada|cita|evento)(?:\s+(?:con|de|para))?\s+([^.,;\n]+)/i);
      if (matchTitle && matchTitle[1].trim()) {
        const cleanTitle = matchTitle[1].trim()
          .replace(/(?:mañana|hoy|ayer|el\s+[a-záéíóú]+|a\s+las\s+\d+.*|en\s+el\s+calendario)/gi, '')
          .trim();
        if (cleanTitle.length > 2) {
          eventTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
        }
      }

      const [sh, sm] = resolvedTime.split(':').map(Number);
      const endHour = (sh + 1) % 24;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(sm).padStart(2, '0')}`;

      const newEvent: CalendarEvent = {
        id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: eventTitle,
        date: resolvedDate,
        startTime: resolvedTime,
        endTime,
        durationMinutes: 60,
        status: 'confirmado',
        projectId: project.id,
        projectName: project.name,
        createdAt: new Date().toISOString(),
        provider: 'local',
        syncStatus: 'local_only',
      };

      const existingEvents = Array.isArray(options.eventsContext) ? [...options.eventsContext] : [];
      const updatedEvents = [...existingEvents, newEvent];

      return {
        reply: `He agendado en tu calendario: **"${newEvent.title}"** para el día **${newEvent.date}** a las **${newEvent.startTime}** vinculado a **${project.name}**.\n\nYa está visible en tu pestaña de **Calendario**.`,
        actionsExecuted: [
          {
            type: 'event_created',
            label: 'Evento agendado',
            details: `${newEvent.title} [${newEvent.date} a las ${newEvent.startTime}]`,
            projectId: project.id,
          },
        ],
        memoryUpdates: [
          {
            id: `mem-${Date.now()}`,
            type: 'task',
            title: `${newEvent.title} [${newEvent.date} a las ${newEvent.startTime}]`,
            description: `Reunión agendada para ${project.name}`,
            applied: true,
          },
        ],
        updatedEvents,
        updatedProject: project,
        provider: 'local-intelligence',
      };
    }

    // Detect decisions
    if (
      textLower.includes('decid') ||
      textLower.includes('vamos a usar') ||
      textLower.includes('optamos por') ||
      textLower.includes('elegimos')
    ) {
      const cleanTitle = userText
        .replace(/^(he decidido que|hemos decidido que|decidí que|decisión:|decidido:)/i, '')
        .trim();
      memoryUpdates.push({
        id: `mem-${Date.now()}-1`,
        type: 'decision',
        title: cleanTitle.length > 60 ? cleanTitle.substring(0, 57) + '...' : cleanTitle,
        description: `Decisión registrada automáticamente: "${userText}"`,
        applied: true,
      });
    }

    // Detect tasks
    if (
      textLower.includes('tengo que') ||
      textLower.includes('hay que') ||
      textLower.includes('tarea') ||
      textLower.includes('falta') ||
      textLower.includes('debo')
    ) {
      const match = userText.match(/(?:tengo que|hay que|falta|debo|tarea:?)\s+([^.,;\n]+)/i);
      const title = match ? match[1].trim() : userText.substring(0, 50);
      if (title.length > 4) {
        const cleanTitle = title.charAt(0).toUpperCase() + title.slice(1);
        memoryUpdates.push({
          id: `mem-${Date.now()}-2`,
          type: 'task',
          title: cleanTitle,
          description: 'Tarea identificada automáticamente en la conversación.',
          applied: true,
        });

        if (project) {
          const newTask: Task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            projectId: project.id,
            title: cleanTitle,
            status: 'pendiente',
            createdAt: new Date().toISOString(),
            dueDate: (textLower.includes('mañana') || textLower.includes('hoy') || textLower.includes('viernes') || textLower.includes('lunes'))
              ? parseNaturalDate(userText)
              : undefined,
            priority: 'media',
          };
          if (!Array.isArray(project.tasks)) project.tasks = [];
          project.tasks.push(newTask);
        }
      }
    }

    // Detect next steps
    if (
      textLower.includes('siguiente paso') ||
      textLower.includes('próximo paso') ||
      textLower.includes('proximo paso') ||
      textLower.includes('ahora toca')
    ) {
      const match = userText.match(/(?:siguiente paso|próximo paso|proximo paso|ahora toca)(?:\s+es|\s*:)?\s+([^.\n]+)/i);
      const val = match ? match[1].trim() : userText.substring(0, 60);
      memoryUpdates.push({
        id: `mem-${Date.now()}-3`,
        type: 'next_step',
        title: val.charAt(0).toUpperCase() + val.slice(1),
        description: 'Actualización del próximo paso del proyecto.',
        applied: true,
      });
    }

    // Detect ideas
    if (textLower.includes('idea') || textLower.includes('se me ocurrió') || textLower.includes('podríamos')) {
      memoryUpdates.push({
        id: `mem-${Date.now()}-4`,
        type: 'idea',
        title: userText.length > 50 ? userText.substring(0, 47) + '...' : userText,
        description: 'Idea registrada automáticamente en la memoria del proyecto.',
        applied: true,
      });
    }

    if (memoryUpdates.length > 0) {
      const list = memoryUpdates
        .map((m) => `• **${m.type === 'decision' ? 'Decisión' : m.type === 'task' ? 'Tarea' : m.type === 'next_step' ? 'Próximo Paso' : 'Idea'}**: ${m.title}`)
        .join('\n');

      return {
        reply: `He incorporado esto directamente a la **memoria estructurada de ${projName}**:

${list}

Esto mantiene el proyecto vivo sin que tengas que rellenar formularios manuales. En relación con el objetivo principal (_"${project?.mainGoal || 'avanzar'}"_), esto nos da tracción clara.

¿Cuál es el siguiente detalle táctico que te gustaría revisar?`,
        memoryUpdates,
        updatedProject: project || undefined,
        provider: 'local-intelligence',
      };
    }

    if (textLower.includes('hola') || textLower.includes('qué tal') || textLower.includes('estado')) {
      return {
        reply: `¡Hola! Aquí tienes la situación actual de **${projName}**:

- **Objetivo**: ${project?.mainGoal || 'Sin definir'}
- **Próximo Paso**: ${project?.nextStep || 'Sin definir'}
- **Estado**: ${project?.status || 'Activo'}
- **Tareas pendientes**: ${project?.tasks?.filter((t) => t.status === 'pendiente').length || 0}
- **Decisiones registradas**: ${project?.decisions?.length || 0}

¿Qué aspecto quieres trabajar hoy? Simplemente coméntamelo de forma natural y yo iré organizando la memoria.`,
        memoryUpdates: [],
        provider: 'local-intelligence',
      };
    }

    return {
      reply: `Excelente punto para **${projName}**. 

Tiene mucho sentido en esta etapa. Al conversarlo así de manera libre, podemos ir afinando la dirección sin sobrecargar la gestión.

¿Te gustaría que dividamos este planteamiento en pasos concretos o prefieres evaluar alternativas antes de tomar una decisión?`,
      memoryUpdates: [],
      provider: 'local-intelligence',
    };
  }
}
