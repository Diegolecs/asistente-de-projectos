import { Project, ChatMessage, CalendarEvent } from '../types';
import { INITIAL_DEMO_PROJECTS } from './demoData';
import { calendarService } from './calendarService';

const STORAGE_KEY = 'project_os_data_v1';
const GENERAL_CHAT_STORAGE_KEY = 'project_os_general_chat_v1';

export interface StorageService {
  loadProjects(): Project[];
  saveProjects(projects: Project[]): void;
  getProjectById(id: string): Project | undefined;
  saveProject(project: Project): void;
  deleteProject(id: string): void;
  clearAll(): void;
  restoreDemoData(): Project[];
  loadGeneralMessages(): ChatMessage[];
  saveGeneralMessages(messages: ChatMessage[]): void;
  loadCalendarEvents(): CalendarEvent[];
  saveCalendarEvents(events: CalendarEvent[]): void;
}

class LocalStorageService implements StorageService {
  loadCalendarEvents(): CalendarEvent[] {
    return calendarService.loadEvents();
  }

  saveCalendarEvents(events: CalendarEvent[]): void {
    calendarService.saveEvents(events);
  }

  loadProjects(): Project[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Initialize with default demo data on first launch
        this.saveProjects(INITIAL_DEMO_PROJECTS);
        return INITIAL_DEMO_PROJECTS;
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        this.saveProjects(INITIAL_DEMO_PROJECTS);
        return INITIAL_DEMO_PROJECTS;
      }
      return parsed.map((p) => ({
        ...p,
        messages: Array.isArray(p.messages) ? p.messages : [],
      }));
    } catch (e) {
      console.error('Error loading projects from LocalStorage:', e);
      return INITIAL_DEMO_PROJECTS;
    }
  }

  saveProjects(projects: Project[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (e) {
      console.error('Error saving projects to LocalStorage:', e);
    }
  }

  getProjectById(id: string): Project | undefined {
    const projects = this.loadProjects();
    return projects.find((p) => p.id === id);
  }

  saveProject(project: Project): void {
    const projects = this.loadProjects();
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.unshift(project);
    }
    this.saveProjects(projects);
  }

  deleteProject(id: string): void {
    const projects = this.loadProjects();
    const filtered = projects.filter((p) => p.id !== id);
    this.saveProjects(filtered);
  }

  clearAll(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      localStorage.removeItem(GENERAL_CHAT_STORAGE_KEY);
      localStorage.removeItem('project_os_calendar_events_v1');
    } catch (e) {
      console.error('Error clearing LocalStorage:', e);
    }
  }

  restoreDemoData(): Project[] {
    this.saveProjects(INITIAL_DEMO_PROJECTS);
    localStorage.removeItem(GENERAL_CHAT_STORAGE_KEY);
    localStorage.removeItem('project_os_calendar_events_v1');
    return INITIAL_DEMO_PROJECTS;
  }

  loadGeneralMessages(): ChatMessage[] {
    try {
      const stored = localStorage.getItem(GENERAL_CHAT_STORAGE_KEY);
      if (!stored) {
        return [
          {
            id: 'gen-msg-init-1',
            projectId: 'general',
            role: 'assistant',
            content: 'Hola. Soy el **Agente General** de Project OS. Tengo visibilidad de todo tu portfolio de proyectos, sus objetivos, hitos, tareas pendientes y próximos pasos.\n\nPuedes consultarme para priorizar qué proyecto avanzar hoy, revisar cuellos de botella transversales o plantear nuevas iniciativas.',
            timestamp: new Date().toISOString(),
          },
        ];
      }
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveGeneralMessages(messages: ChatMessage[]): void {
    try {
      localStorage.setItem(GENERAL_CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Error saving general chat messages:', e);
    }
  }
}

// Export singleton instance. Can easily be swapped with RemoteDatabaseStorageService in future phases.
export const storageService: StorageService = new LocalStorageService();
