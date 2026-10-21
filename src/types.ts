export type ProjectCategory = 'Producto' | 'Negocio' | 'Personal' | 'Experimento' | 'Otro';

export type ProjectStatus = 'Idea' | 'Planificación' | 'Activo' | 'Pausado' | 'Completado' | 'Archivado';

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'status_changed'
  | 'next_step_changed'
  | 'milestone_added'
  | 'milestone_updated'
  | 'milestone_deleted'
  | 'decision_added'
  | 'decision_updated'
  | 'decision_deleted'
  | 'idea_added'
  | 'idea_updated'
  | 'idea_deleted'
  | 'task_added'
  | 'task_completed'
  | 'task_uncompleted'
  | 'task_updated'
  | 'task_deleted'
  | 'event_added'
  | 'event_updated'
  | 'event_deleted'
  | 'project_paused'
  | 'project_resumed';

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface Decision {
  id: string;
  projectId: string;
  title: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface Idea {
  id: string;
  projectId: string;
  title: string;
  description: string;
  date: string;
  createdAt: string;
}

export type TaskStatus = 'pendiente' | 'en_progreso' | 'completado';
export type TaskPriority = 'alta' | 'media' | 'baja';

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  dataUrl: string; // base64 data string
  createdAt: string;
  source?: 'upload' | 'camera';
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  createdAt: string;
  completedAt?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: TaskPriority;
  notes?: string;
  checklist?: TaskChecklistItem[];
  attachments?: TaskAttachment[];
}

export type EventStatus = 'confirmado' | 'tentativo' | 'cancelado';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm (ej. "16:00")
  endTime?: string; // HH:mm (ej. "17:00")
  durationMinutes?: number;
  location?: string;
  status: EventStatus;
  projectId?: string;
  projectName?: string;
  createdAt: string;
  updatedAt?: string;

  // Preparación para futura sincronización bidireccional
  externalId?: string;
  provider?: 'local' | 'google';
  syncStatus?: 'local_only' | 'exported' | 'synced' | 'pending';
}

export interface Blocker {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'activo' | 'resuelto';
  createdAt: string;
  resolvedAt?: string;
}

export interface Activity {
  id: string;
  projectId: string;
  projectName?: string;
  type: ActivityType;
  description: string;
  timestamp: string;
}

export interface ActionExecuted {
  type: string;
  label: string;
  details: string;
  projectId?: string;
}

export interface ChatMemoryItem {
  id: string;
  type: 'decision' | 'task' | 'idea' | 'next_step' | 'status_change' | 'problem';
  title: string;
  description?: string;
  applied?: boolean;
}

export interface ChatMessage {
  id: string;
  projectId: string; // 'general' or specific projectId
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  memoryUpdates?: ChatMemoryItem[];
  actionsExecuted?: ActionExecuted[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  status: ProjectStatus;
  mainGoal: string;
  nextStep: string;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
  decisions: Decision[];
  ideas: Idea[];
  tasks: Task[];
  blockers?: Blocker[];
  activities: Activity[];
  messages?: ChatMessage[];
}

export type ViewType =
  | 'general-chat'
  | 'project-chat'
  | 'projects'
  | 'tasks'
  | 'calendar'
  | 'dashboard'
  | 'project-detail'
  | 'settings';
