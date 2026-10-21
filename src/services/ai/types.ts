import { ActionExecuted, ChatMessage, ChatMemoryItem, Project, CalendarEvent } from '../../types';
import { DeviceTimeContext } from '../../utils/deviceDateTime';

export interface AIProviderStatus {
  hasGeminiKey: boolean;
  activeProvider: 'gemini' | 'local';
  model: string;
}

export interface AIChatOptions {
  projectId: string;
  isGeneral?: boolean;
  projectContext?: Project | Project[];
  eventsContext?: CalendarEvent[];
  timeContext?: DeviceTimeContext;
}

export interface AIChatResponse {
  reply: string;
  memoryUpdates: ChatMemoryItem[];
  actionsExecuted?: ActionExecuted[];
  updatedProjects?: Project[];
  updatedProject?: Project;
  updatedEvents?: CalendarEvent[];
  provider: string;
  warning?: string;
}

export interface AIProvider {
  name: string;
  sendMessage(
    messages: ChatMessage[],
    options: AIChatOptions
  ): Promise<AIChatResponse>;
}
