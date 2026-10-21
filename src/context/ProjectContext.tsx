import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Project,
  Milestone,
  Decision,
  Idea,
  Task,
  Activity,
  ViewType,
  ProjectCategory,
  ProjectStatus,
  TaskStatus,
  CalendarEvent,
  ChatMessage,
  ChatMemoryItem,
} from '../types';
import { storageService } from '../services/storageService';
import { calendarService } from '../services/calendarService';
import { aiService } from '../services/ai/aiService';
import { AIProviderStatus } from '../services/ai/types';
import { googleCalendarService } from '../services/googleCalendarService';

export interface CreateProjectDTO {
  name: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  mainGoal: string;
  nextStep: string;
}

export interface ProjectContextType {
  projects: Project[];
  activeProjectId: string | null;
  activeProject: Project | null;
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  setActiveProjectId: (id: string | null) => void;
  navigateToProject: (id: string) => void;

  // Conversational AI & Chat
  generalMessages: ChatMessage[];
  isAiThinking: boolean;
  aiStatus: AIProviderStatus;
  sendProjectMessage: (projectId: string, content: string) => Promise<void>;
  sendGeneralMessage: (content: string) => Promise<void>;
  clearProjectChat: (projectId: string) => void;
  clearGeneralChat: () => void;
  applyMemoryItem: (projectId: string, item: ChatMemoryItem) => void;

  // Project CRUD
  createProject: (data: CreateProjectDTO) => Project;
  updateProject: (id: string, data: Partial<CreateProjectDTO>) => void;
  deleteProject: (id: string) => void;
  togglePauseProject: (id: string) => void;

  // Sub-items (Memory items)
  addMilestone: (projectId: string, data: Omit<Milestone, 'id' | 'projectId' | 'createdAt'>) => void;
  updateMilestone: (projectId: string, milestoneId: string, data: Partial<Omit<Milestone, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;

  addDecision: (projectId: string, data: Omit<Decision, 'id' | 'projectId' | 'createdAt'>) => void;
  updateDecision: (projectId: string, decisionId: string, data: Partial<Omit<Decision, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteDecision: (projectId: string, decisionId: string) => void;

  addIdea: (projectId: string, data: Omit<Idea, 'id' | 'projectId' | 'createdAt'>) => void;
  updateIdea: (projectId: string, ideaId: string, data: Partial<Omit<Idea, 'id' | 'projectId' | 'createdAt'>>) => void;
  deleteIdea: (projectId: string, ideaId: string) => void;

  // Tasks (Project-scoped & Global)
  addTask: (projectId: string, data: { title: string; description?: string; dueDate?: string; dueTime?: string; priority?: 'alta' | 'media' | 'baja' }) => void;
  toggleTask: (projectId: string, taskId: string) => void;
  updateTask: (projectId: string, taskId: string, data: { title: string; description?: string }) => void;
  updateTaskStatus: (projectId: string, taskId: string, status: TaskStatus) => void;
  updateTaskFull: (projectId: string, taskId: string, data: Partial<Task>) => void;
  deleteTask: (projectId: string, taskId: string) => void;

  // Calendar Events
  events: CalendarEvent[];
  addEvent: (data: Omit<CalendarEvent, 'id' | 'createdAt'>) => CalendarEvent;
  updateEvent: (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => void;
  deleteEvent: (id: string) => void;

  // Google Calendar Integration
  isGoogleCalendarConnected: boolean;
  googleCalendarUser: { email?: string; name?: string } | null;
  isSyncingCalendar: boolean;
  connectGoogleCalendar: () => Promise<void>;
  disconnectGoogleCalendar: () => Promise<void>;
  syncGoogleCalendar: () => Promise<{ imported: number; updated: number; uploaded: number }>;

  // Global actions
  resetToDemo: () => void;
  clearAllData: () => void;

  // Computed
  allTasks: Array<Task & { projectName: string }>;
  recentProjects: Project[];
  allActivities: Activity[];
  stats: {
    total: number;
    active: number;
    paused: number;
    planning: number;
    completed: number;
  };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<Project[]>(() => storageService.loadProjects());
  const [events, setEvents] = useState<CalendarEvent[]>(() => storageService.loadCalendarEvents());
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  // Default to General Chat (Strategic agent) or First Project
  const [currentView, setCurrentView] = useState<ViewType>('general-chat');
  const [generalMessages, setGeneralMessages] = useState<ChatMessage[]>(() => storageService.loadGeneralMessages());
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<AIProviderStatus>(() => aiService.getStatus());
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState<boolean>(false);
  const [googleCalendarUser, setGoogleCalendarUser] = useState<{ email?: string; name?: string } | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);

  // Check backend AI status on mount
  useEffect(() => {
    aiService.checkHealth().then((st) => setAiStatus(st));

    const unsubGCal = googleCalendarService.initAuth(
      (user) => {
        setIsGoogleCalendarConnected(true);
        setGoogleCalendarUser({
          email: user.email || undefined,
          name: user.displayName || undefined,
        });
      },
      () => {
        setIsGoogleCalendarConnected(false);
        setGoogleCalendarUser(null);
      }
    );

    return () => {
      unsubGCal();
    };
  }, []);

  // Sync projects to storage
  useEffect(() => {
    storageService.saveProjects(projects);
  }, [projects]);

  // Sync events to storage
  useEffect(() => {
    storageService.saveCalendarEvents(events);
  }, [events]);

  // Sync general messages to storage
  useEffect(() => {
    storageService.saveGeneralMessages(generalMessages);
  }, [generalMessages]);

  const activeProject = useMemo(() => {
    if (!activeProjectId) return null;
    return projects.find((p) => p.id === activeProjectId) || null;
  }, [projects, activeProjectId]);

  const navigateToProject = useCallback((id: string) => {
    setActiveProjectId(id);
    setCurrentView('project-chat');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Helper to add activity and update project timestamp
  const logActivity = useCallback(
    (project: Project, type: Activity['type'], description: string): Project => {
      const newActivity: Activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        projectId: project.id,
        projectName: project.name,
        type,
        description,
        timestamp: new Date().toISOString(),
      };

      return {
        ...project,
        updatedAt: new Date().toISOString(),
        activities: [newActivity, ...(project.activities || [])],
      };
    },
    []
  );

  const createProject = useCallback(
    (data: CreateProjectDTO): Project => {
      const now = new Date().toISOString();
      const newId = `proj-${Date.now()}`;
      const newProject: Project = {
        id: newId,
        name: data.name.trim(),
        description: data.description.trim(),
        category: data.category,
        status: data.status,
        mainGoal: data.mainGoal.trim(),
        nextStep: data.nextStep.trim(),
        createdAt: now,
        updatedAt: now,
        milestones: [],
        decisions: [],
        ideas: [],
        tasks: [],
        messages: [
          {
            id: `msg-welcome-${Date.now()}`,
            projectId: newId,
            role: 'assistant',
            content: `¡Hola! Soy tu copiloto para **${data.name.trim()}**. He inicializado la memoria con tu objetivo principal: _"${data.mainGoal.trim() || 'Sin definir'}"_ y el próximo paso: _"${data.nextStep.trim() || 'Sin definir'}"_.\n\nPuedes hablarme directamente de cualquier idea, obstáculo o decisión; yo me ocupo de mantener la memoria estructurada del proyecto.`,
            timestamp: now,
          },
        ],
        activities: [
          {
            id: `act-${Date.now()}`,
            projectId: newId,
            projectName: data.name.trim(),
            type: 'project_created',
            description: `Se creó el proyecto ${data.name.trim()}.`,
            timestamp: now,
          },
        ],
      };

      setProjects((prev) => [newProject, ...prev]);
      return newProject;
    },
    []
  );

  const updateProject = useCallback(
    (id: string, data: Partial<CreateProjectDTO>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== id) return proj;

          let updated = { ...proj };
          const now = new Date().toISOString();

          if (data.status && data.status !== proj.status) {
            updated = logActivity(
              updated,
              'status_changed',
              `Estado modificado de "${proj.status}" a "${data.status}".`
            );
          }

          if (data.nextStep && data.nextStep !== proj.nextStep) {
            updated = logActivity(
              updated,
              'next_step_changed',
              `Próximo paso actualizado: "${data.nextStep}".`
            );
          }

          return {
            ...updated,
            ...data,
            updatedAt: now,
          };
        })
      );
    },
    [logActivity]
  );

  const deleteProject = useCallback(
    (id: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setEvents((prev) => prev.filter((e) => e.projectId !== id));
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setCurrentView('projects');
      }
    },
    [activeProjectId]
  );

  const togglePauseProject = useCallback(
    (id: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== id) return proj;
          const isNowPaused = proj.status === 'Pausado';
          const newStatus: ProjectStatus = isNowPaused ? 'Activo' : 'Pausado';
          const type = isNowPaused ? 'project_resumed' : 'project_paused';
          const desc = isNowPaused ? 'Proyecto reanudado.' : 'Proyecto puesto en pausa.';

          let updated = { ...proj, status: newStatus };
          return logActivity(updated, type, desc);
        })
      );
    },
    [logActivity]
  );

  // Manual & AI-extracted memory operations
  const addMilestone = useCallback(
    (projectId: string, data: Omit<Milestone, 'id' | 'projectId' | 'createdAt'>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const newMilestone: Milestone = {
            ...data,
            id: `ms-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            projectId,
            createdAt: new Date().toISOString(),
          };
          const updated = {
            ...proj,
            milestones: [...(proj.milestones || []), newMilestone],
          };
          return logActivity(updated, 'milestone_added', `Se agregó el hito: "${data.title}".`);
        })
      );
    },
    [logActivity]
  );

  const updateMilestone = useCallback(
    (projectId: string, milestoneId: string, data: Partial<Omit<Milestone, 'id' | 'projectId' | 'createdAt'>>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const updatedMilestones = (proj.milestones || []).map((m) =>
            m.id === milestoneId ? { ...m, ...data } : m
          );
          const updated = { ...proj, milestones: updatedMilestones };
          return logActivity(updated, 'milestone_updated', `Se actualizó el hito.`);
        })
      );
    },
    [logActivity]
  );

  const deleteMilestone = useCallback(
    (projectId: string, milestoneId: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const item = (proj.milestones || []).find((m) => m.id === milestoneId);
          const updated = {
            ...proj,
            milestones: (proj.milestones || []).filter((m) => m.id !== milestoneId),
          };
          return logActivity(
            updated,
            'milestone_deleted',
            `Se eliminó el hito: "${item?.title || 'desconocido'}".`
          );
        })
      );
    },
    [logActivity]
  );

  const addDecision = useCallback(
    (projectId: string, data: Omit<Decision, 'id' | 'projectId' | 'createdAt'>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const newDecision: Decision = {
            ...data,
            id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            projectId,
            createdAt: new Date().toISOString(),
          };
          const updated = {
            ...proj,
            decisions: [...(proj.decisions || []), newDecision],
          };
          return logActivity(updated, 'decision_added', `Se agregó la decisión: "${data.title}".`);
        })
      );
    },
    [logActivity]
  );

  const updateDecision = useCallback(
    (projectId: string, decisionId: string, data: Partial<Omit<Decision, 'id' | 'projectId' | 'createdAt'>>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const updatedDecisions = (proj.decisions || []).map((d) =>
            d.id === decisionId ? { ...d, ...data } : d
          );
          const updated = { ...proj, decisions: updatedDecisions };
          return logActivity(updated, 'decision_updated', `Se actualizó la decisión.`);
        })
      );
    },
    [logActivity]
  );

  const deleteDecision = useCallback(
    (projectId: string, decisionId: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const item = (proj.decisions || []).find((d) => d.id === decisionId);
          const updated = {
            ...proj,
            decisions: (proj.decisions || []).filter((d) => d.id !== decisionId),
          };
          return logActivity(
            updated,
            'decision_deleted',
            `Se eliminó la decisión: "${item?.title || 'desconocida'}".`
          );
        })
      );
    },
    [logActivity]
  );

  const addIdea = useCallback(
    (projectId: string, data: Omit<Idea, 'id' | 'projectId' | 'createdAt'>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const newIdea: Idea = {
            ...data,
            id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            projectId,
            createdAt: new Date().toISOString(),
          };
          const updated = {
            ...proj,
            ideas: [...(proj.ideas || []), newIdea],
          };
          return logActivity(updated, 'idea_added', `Se agregó la idea: "${data.title}".`);
        })
      );
    },
    [logActivity]
  );

  const updateIdea = useCallback(
    (projectId: string, ideaId: string, data: Partial<Omit<Idea, 'id' | 'projectId' | 'createdAt'>>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const updatedIdeas = (proj.ideas || []).map((i) =>
            i.id === ideaId ? { ...i, ...data } : i
          );
          const updated = { ...proj, ideas: updatedIdeas };
          return logActivity(updated, 'idea_updated', `Se actualizó la idea.`);
        })
      );
    },
    [logActivity]
  );

  const deleteIdea = useCallback(
    (projectId: string, ideaId: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const item = (proj.ideas || []).find((i) => i.id === ideaId);
          const updated = {
            ...proj,
            ideas: (proj.ideas || []).filter((i) => i.id !== ideaId),
          };
          return logActivity(
            updated,
            'idea_deleted',
            `Se eliminó la idea: "${item?.title || 'desconocida'}".`
          );
        })
      );
    },
    [logActivity]
  );

  const addTask = useCallback(
    (
      projectId: string,
      data: {
        title: string;
        description?: string;
        dueDate?: string;
        dueTime?: string;
        priority?: 'alta' | 'media' | 'baja';
      }
    ) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const newTask: Task = {
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            projectId,
            title: data.title.trim(),
            description: data.description?.trim(),
            status: 'pendiente',
            createdAt: new Date().toISOString(),
            dueDate: data.dueDate,
            dueTime: data.dueTime,
            priority: data.priority || 'media',
          };
          const updated = {
            ...proj,
            tasks: [...(proj.tasks || []), newTask],
          };
          return logActivity(updated, 'task_added', `Se agregó la tarea: "${newTask.title}".`);
        })
      );
    },
    [logActivity]
  );

  const toggleTask = useCallback(
    (projectId: string, taskId: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          let toggledTaskTitle = '';
          let isNowCompleted = false;

          const updatedTasks = (proj.tasks || []).map((t) => {
            if (t.id === taskId) {
              toggledTaskTitle = t.title;
              isNowCompleted = t.status === 'pendiente';
              return {
                ...t,
                status: isNowCompleted ? ('completado' as const) : ('pendiente' as const),
                completedAt: isNowCompleted ? new Date().toISOString() : undefined,
              };
            }
            return t;
          });

          const type = isNowCompleted ? 'task_completed' : 'task_uncompleted';
          const desc = isNowCompleted
            ? `Se completó la tarea: "${toggledTaskTitle}".`
            : `Se marcó como pendiente la tarea: "${toggledTaskTitle}".`;

          const updated = { ...proj, tasks: updatedTasks };
          return logActivity(updated, type, desc);
        })
      );
    },
    [logActivity]
  );

  const updateTask = useCallback(
    (projectId: string, taskId: string, data: { title: string; description?: string }) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const updatedTasks = (proj.tasks || []).map((t) =>
            t.id === taskId ? { ...t, ...data } : t
          );
          return {
            ...proj,
            tasks: updatedTasks,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  const deleteTask = useCallback(
    (projectId: string, taskId: string) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const item = (proj.tasks || []).find((t) => t.id === taskId);
          const updated = {
            ...proj,
            tasks: (proj.tasks || []).filter((t) => t.id !== taskId),
          };
          return logActivity(
            updated,
            'task_deleted',
            `Se eliminó la tarea: "${item?.title || 'desconocida'}".`
          );
        })
      );
    },
    [logActivity]
  );

  const updateTaskStatus = useCallback(
    (projectId: string, taskId: string, status: TaskStatus) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          let taskTitle = '';
          const updatedTasks = (proj.tasks || []).map((t) => {
            if (t.id === taskId) {
              taskTitle = t.title;
              return {
                ...t,
                status,
                completedAt: status === 'completado' ? new Date().toISOString() : undefined,
              };
            }
            return t;
          });
          const type = status === 'completado' ? 'task_completed' : 'task_updated';
          const desc = status === 'completado'
            ? `Se completó la tarea: "${taskTitle}".`
            : `Se actualizó el estado de la tarea "${taskTitle}" a ${status}.`;
          return logActivity({ ...proj, tasks: updatedTasks }, type, desc);
        })
      );
    },
    [logActivity]
  );

  const updateTaskFull = useCallback(
    (projectId: string, taskId: string, data: Partial<Task>) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          const updatedTasks = (proj.tasks || []).map((t) =>
            t.id === taskId ? { ...t, ...data } : t
          );
          return {
            ...proj,
            tasks: updatedTasks,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    []
  );

  // Google Calendar Connection & Sync Methods
  const syncGoogleCalendar = useCallback(async (): Promise<{ imported: number; updated: number; uploaded: number }> => {
    setIsSyncingCalendar(true);
    try {
      const result = await googleCalendarService.syncBidirectional(events);
      setEvents(result.syncedEvents);
      storageService.saveCalendarEvents(result.syncedEvents);
      return result.stats;
    } finally {
      setIsSyncingCalendar(false);
    }
  }, [events]);

  const connectGoogleCalendar = useCallback(async () => {
    const { user } = await googleCalendarService.signIn();
    setIsGoogleCalendarConnected(true);
    setGoogleCalendarUser({
      email: user.email || undefined,
      name: user.displayName || undefined,
    });
    // Automatic initial sync upon connection
    await syncGoogleCalendar();
  }, [syncGoogleCalendar]);

  const disconnectGoogleCalendar = useCallback(async () => {
    await googleCalendarService.disconnect();
    setIsGoogleCalendarConnected(false);
    setGoogleCalendarUser(null);
  }, []);

  // Calendar Event methods
  const addEvent = useCallback(
    (data: Omit<CalendarEvent, 'id' | 'createdAt'>): CalendarEvent => {
      const now = new Date().toISOString();
      const newEvent: CalendarEvent = {
        ...data,
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        createdAt: now,
        provider: data.provider || 'local',
        syncStatus: data.syncStatus || 'local_only',
      };
      setEvents((prev) => [newEvent, ...prev]);

      // If Google Calendar is connected, push to Google Calendar
      if (googleCalendarService.isConnected()) {
        googleCalendarService
          .createGoogleEvent(newEvent)
          .then((gId) => {
            setEvents((prev) =>
              prev.map((e) =>
                e.id === newEvent.id
                  ? { ...e, externalId: gId, provider: 'google', syncStatus: 'synced' }
                  : e
              )
            );
          })
          .catch((err) => console.warn('[GCal Auto-Add Sync Error]:', err));
      }

      if (data.projectId) {
        setProjects((prev) =>
          prev.map((proj) => {
            if (proj.id !== data.projectId) return proj;
            return logActivity(
              proj,
              'event_added',
              `Evento agendado: "${data.title}" para el ${data.date} a las ${data.startTime}.`
            );
          })
        );
      }

      return newEvent;
    },
    [logActivity]
  );

  const updateEvent = useCallback(
    (id: string, data: Partial<Omit<CalendarEvent, 'id' | 'createdAt'>>) => {
      setEvents((prev) =>
        prev.map((evt) => {
          if (evt.id !== id) return evt;
          const updated = { ...evt, ...data, updatedAt: new Date().toISOString() };
          if (evt.externalId && googleCalendarService.isConnected()) {
            googleCalendarService
              .updateGoogleEvent(evt.externalId, updated)
              .catch((err) => console.warn('[GCal Auto-Update Sync Error]:', err));
          }
          return updated;
        })
      );
    },
    []
  );

  const deleteEvent = useCallback(
    (id: string) => {
      const target = events.find((e) => e.id === id);
      if (target?.externalId && googleCalendarService.isConnected()) {
        googleCalendarService
          .deleteGoogleEvent(target.externalId)
          .catch((err) => console.warn('[GCal Auto-Delete Sync Error]:', err));
      }
      setEvents((prev) => prev.filter((evt) => evt.id !== id));
    },
    [events]
  );

  // Directly apply a detected memory item to the project
  const applyMemoryItem = useCallback(
    (projectId: string, item: ChatMemoryItem) => {
      setProjects((prev) =>
        prev.map((proj) => {
          if (proj.id !== projectId) return proj;
          let updated = { ...proj };
          const now = new Date().toISOString();

          if (item.type === 'decision') {
            const newDec: Decision = {
              id: `dec-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              projectId,
              title: item.title,
              description: item.description || 'Detectado automáticamente en conversación.',
              date: now.split('T')[0],
              createdAt: now,
            };
            updated.decisions = [...(updated.decisions || []), newDec];
            updated = logActivity(updated, 'decision_added', `Decisión registrada: "${item.title}".`);
          } else if (item.type === 'task') {
            const newTask: Task = {
              id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              projectId,
              title: item.title,
              description: item.description,
              status: 'pendiente',
              createdAt: now,
            };
            updated.tasks = [...(updated.tasks || []), newTask];
            updated = logActivity(updated, 'task_added', `Tarea detectada: "${item.title}".`);
          } else if (item.type === 'idea') {
            const newIdea: Idea = {
              id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              projectId,
              title: item.title,
              description: item.description || '',
              date: now.split('T')[0],
              createdAt: now,
            };
            updated.ideas = [...(updated.ideas || []), newIdea];
            updated = logActivity(updated, 'idea_added', `Idea registrada: "${item.title}".`);
          } else if (item.type === 'next_step') {
            updated.nextStep = item.title;
            updated = logActivity(updated, 'next_step_changed', `Próximo paso actualizado: "${item.title}".`);
          } else if (item.type === 'status_change') {
            const validStatus = ['Idea', 'Planificación', 'Activo', 'Pausado', 'Completado', 'Archivado'].includes(item.title)
              ? (item.title as ProjectStatus)
              : 'Activo';
            updated.status = validStatus;
            updated = logActivity(updated, 'status_changed', `Estado actualizado a "${validStatus}".`);
          }

          return updated;
        })
      );
    },
    [logActivity]
  );

  // Send message in Project Chat
  const sendProjectMessage = useCallback(
    async (projectId: string, content: string) => {
      const targetProject = projects.find((p) => p.id === projectId);
      if (!targetProject || !content.trim()) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}-user`,
        projectId,
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedHistory = [...(targetProject.messages || []), userMsg];

      // Optimistically append user message to UI
      setProjects((prev) =>
        prev.map((p) => (p.id === projectId ? { ...p, messages: updatedHistory } : p))
      );

      setIsAiThinking(true);

      try {
        const response = await aiService.sendMessage(updatedHistory, {
          projectId,
          projectContext: projects,
          eventsContext: events,
          isGeneral: false,
        });

        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now()}-ai`,
          projectId,
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
          memoryUpdates: response.memoryUpdates,
          actionsExecuted: response.actionsExecuted,
        };

        if (response.updatedEvents && Array.isArray(response.updatedEvents)) {
          setEvents(response.updatedEvents);
        }

        if (response.updatedProjects && Array.isArray(response.updatedProjects)) {
          const isDeletedAction = response.actionsExecuted?.some(
            (a) => a.type === 'project_deleted' && (a.projectId === projectId || a.details === projectId)
          );
          const projectStillExists = response.updatedProjects.some((p) => p.id === projectId);

          if (isDeletedAction || !projectStillExists) {
            // Project was deleted from chat
            setProjects(response.updatedProjects);
            setActiveProjectId(null);
            setCurrentView('projects');
            setGeneralMessages((prev) => [
              ...prev,
              {
                id: `gen-msg-${Date.now()}-del`,
                projectId: 'general',
                role: 'assistant',
                content: response.reply,
                timestamp: new Date().toISOString(),
                actionsExecuted: response.actionsExecuted,
              },
            ]);
            return;
          }

          setProjects((prev) =>
            response.updatedProjects!.map((up) => {
              if (up.id === projectId) {
                return {
                  ...up,
                  messages: [...(up.messages || []), assistantMsg],
                  updatedAt: new Date().toISOString(),
                };
              }
              const existing = prev.find((p) => p.id === up.id);
              return {
                ...up,
                messages: existing?.messages || up.messages || [],
              };
            })
          );
        } else if (response.updatedProject) {
          setProjects((prev) =>
            prev.map((p) =>
              p.id === projectId
                ? {
                    ...response.updatedProject!,
                    messages: [...(response.updatedProject!.messages || []), assistantMsg],
                    updatedAt: new Date().toISOString(),
                  }
                : p
            )
          );
        } else {
          // Apply detected memory items to project state
          if (response.memoryUpdates && response.memoryUpdates.length > 0) {
            response.memoryUpdates.forEach((item) => {
              applyMemoryItem(projectId, item);
            });
          }

          setProjects((prev) =>
            prev.map((p) =>
              p.id === projectId
                ? {
                    ...p,
                    messages: [...(p.messages || []), assistantMsg],
                    updatedAt: new Date().toISOString(),
                  }
                : p
            )
          );
        }
      } catch (err) {
        console.warn('Temporary issue getting AI response, falling back safely:', err);
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}-err`,
          projectId,
          role: 'assistant',
          content: 'Disculpa, ha ocurrido un error al conectar con el asistente. Por favor, reintenta tu mensaje.',
          timestamp: new Date().toISOString(),
        };
        setProjects((prev) =>
          prev.map((p) =>
            p.id === projectId ? { ...p, messages: [...(p.messages || []), errorMsg] } : p
          )
        );
      } finally {
        setIsAiThinking(false);
      }
    },
    [projects, events, applyMemoryItem]
  );

  // Send message in General Chat (Global strategic agent)
  const sendGeneralMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      const userMsg: ChatMessage = {
        id: `gen-msg-${Date.now()}-user`,
        projectId: 'general',
        role: 'user',
        content: content.trim(),
        timestamp: new Date().toISOString(),
      };

      const newHistory = [...generalMessages, userMsg];
      setGeneralMessages(newHistory);
      setIsAiThinking(true);

      try {
        const response = await aiService.sendMessage(newHistory, {
          projectId: 'general',
          projectContext: projects,
          eventsContext: events,
          isGeneral: true,
        });

        const assistantMsg: ChatMessage = {
          id: `gen-msg-${Date.now()}-ai`,
          projectId: 'general',
          role: 'assistant',
          content: response.reply,
          timestamp: new Date().toISOString(),
          memoryUpdates: response.memoryUpdates,
          actionsExecuted: response.actionsExecuted,
        };

        if (response.updatedEvents && Array.isArray(response.updatedEvents)) {
          setEvents(response.updatedEvents);
        }

        if (response.updatedProjects && Array.isArray(response.updatedProjects)) {
          setProjects(response.updatedProjects);
          const deletedAction = response.actionsExecuted?.find((a) => a.type === 'project_deleted');
          if (deletedAction && activeProjectId === deletedAction.projectId) {
            setActiveProjectId(null);
          }
        }

        setGeneralMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        console.warn('Temporary issue getting general AI response, falling back safely:', err);
        const errorMsg: ChatMessage = {
          id: `gen-msg-${Date.now()}-err`,
          projectId: 'general',
          role: 'assistant',
          content: 'No fue posible procesar la consulta en este momento. Por favor reintenta.',
          timestamp: new Date().toISOString(),
        };
        setGeneralMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsAiThinking(false);
      }
    },
    [generalMessages, projects, events]
  );

  const clearProjectChat = useCallback((projectId: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        return {
          ...p,
          messages: [
            {
              id: `msg-${Date.now()}-clean`,
              projectId,
              role: 'assistant',
              content: `Chat de **${p.name}** reiniciado. La memoria estructurada del proyecto sigue intacta. ¿De qué quieres hablar?`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      })
    );
  }, []);

  const clearGeneralChat = useCallback(() => {
    const fresh: ChatMessage[] = [
      {
        id: `gen-${Date.now()}-clean`,
        projectId: 'general',
        role: 'assistant',
        content: 'Conversación estratégica general reiniciada. Tengo acceso al estado actualizado de todos tus proyectos. ¿Qué tema deseas analizar?',
        timestamp: new Date().toISOString(),
      },
    ];
    setGeneralMessages(fresh);
  }, []);

  // Global operations
  const resetToDemo = useCallback(() => {
    const demo = storageService.restoreDemoData();
    setProjects(demo);
    setEvents(storageService.loadCalendarEvents());
    setActiveProjectId(null);
    setCurrentView('general-chat');
  }, []);

  const clearAllData = useCallback(() => {
    storageService.clearAll();
    setProjects([]);
    setEvents([]);
    setGeneralMessages([]);
    setActiveProjectId(null);
    setCurrentView('general-chat');
  }, []);

  // Computed values
  const allTasks = useMemo(() => {
    const list: Array<Task & { projectName: string }> = [];
    projects.forEach((proj) => {
      (proj.tasks || []).forEach((t) => {
        list.push({
          ...t,
          projectName: proj.name,
        });
      });
    });
    return list.sort((a, b) => {
      if (a.status === 'pendiente' && b.status !== 'pendiente') return -1;
      if (a.status !== 'pendiente' && b.status === 'pendiente') return 1;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [projects]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === 'Activo').length,
      paused: projects.filter((p) => p.status === 'Pausado').length,
      planning: projects.filter((p) => p.status === 'Planificación').length,
      completed: projects.filter((p) => p.status === 'Completado').length,
    };
  }, [projects]);

  const recentProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [projects]);

  const allActivities = useMemo(() => {
    const all: Activity[] = [];
    projects.forEach((proj) => {
      if (proj.activities && Array.isArray(proj.activities)) {
        proj.activities.forEach((act) => {
          all.push({
            ...act,
            projectName: proj.name,
          });
        });
      }
    });

    return all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
  }, [projects]);

  const value = {
    projects,
    activeProjectId,
    activeProject,
    currentView,
    setCurrentView,
    setActiveProjectId,
    navigateToProject,
    generalMessages,
    isAiThinking,
    aiStatus,
    sendProjectMessage,
    sendGeneralMessage,
    clearProjectChat,
    clearGeneralChat,
    applyMemoryItem,
    createProject,
    updateProject,
    deleteProject,
    togglePauseProject,
    addMilestone,
    updateMilestone,
    deleteMilestone,
    addDecision,
    updateDecision,
    deleteDecision,
    addIdea,
    updateIdea,
    deleteIdea,
    addTask,
    toggleTask,
    updateTask,
    updateTaskStatus,
    updateTaskFull,
    deleteTask,
    events,
    addEvent,
    updateEvent,
    deleteEvent,
    isGoogleCalendarConnected,
    googleCalendarUser,
    isSyncingCalendar,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    syncGoogleCalendar,
    resetToDemo,
    clearAllData,
    allTasks,
    recentProjects,
    allActivities,
    stats,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjectContext = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return context;
};
