import { ChatMessage, ChatMemoryItem, ActionExecuted } from '../../types';
import { AIChatOptions, AIChatResponse, AIProvider } from './types';
import { MockAIProvider } from './mockProvider';
import { getDeviceFullContext } from '../../utils/deviceDateTime';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private fallbackProvider = new MockAIProvider();

  async sendMessage(
    messages: ChatMessage[],
    options: AIChatOptions
  ): Promise<AIChatResponse> {
    try {
      const timeContext = options.timeContext || getDeviceFullContext();
      const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string || '').replace(/\/$/, '');
      const chatUrl = baseUrl ? `${baseUrl}/api/chat` : '/api/chat';

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          projectContext: options.projectContext,
          eventsContext: options.eventsContext,
          isGeneral: options.isGeneral,
          projectId: options.projectId,
          timeContext,
        }),
      });

      if (!response.ok) {
        console.warn('API /api/chat returned error status:', response.status);
        const fallbackRes = await this.fallbackProvider.sendMessage(messages, options);
        return {
          ...fallbackRes,
          warning: `Atención: El servidor respondió con un código de error (${response.status}). Se utilizó el motor local de contingencia.`,
        };
      }

      const data = await response.json();
      const rawUpdates = Array.isArray(data.memoryUpdates) ? data.memoryUpdates : [];

      const formattedUpdates: ChatMemoryItem[] = rawUpdates.map((u: any, idx: number) => ({
        id: `mem-${Date.now()}-${idx}`,
        type: u.type || 'task',
        title: u.title || 'Actualización detectada',
        description: u.description || '',
        applied: true,
      }));

      // Convert actionsExecuted into memoryUpdates if memoryUpdates is empty, so existing UI cards render cleanly
      const actionsExecuted: ActionExecuted[] = Array.isArray(data.actionsExecuted) ? data.actionsExecuted : [];
      if (actionsExecuted.length > 0) {
        for (const act of actionsExecuted) {
          const alreadyInMem = formattedUpdates.some((m) => m.title === act.details);
          if (!alreadyInMem) {
            let memType: ChatMemoryItem['type'] = 'task';
            if (act.type.includes('decision')) memType = 'decision';
            else if (act.type.includes('next_step')) memType = 'next_step';
            else if (act.type.includes('idea')) memType = 'idea';
            else if (act.type.includes('blocker') || act.type.includes('problem')) memType = 'problem';

            formattedUpdates.push({
              id: `mem-act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              type: memType,
              title: act.details || act.label,
              description: act.label,
              applied: true,
            });
          }
        }
      }

      return {
        reply: data.reply || 'Sin respuesta del modelo.',
        memoryUpdates: formattedUpdates,
        actionsExecuted,
        updatedProjects: data.updatedProjects,
        updatedProject: data.updatedProject,
        updatedEvents: data.updatedEvents,
        provider: data.provider || 'gemini',
        warning: data.warning,
      };
    } catch (err: any) {
      console.warn('Network error calling /api/chat, falling back to local intelligence:', err);
      const fallbackRes = await this.fallbackProvider.sendMessage(messages, options);
      return {
        ...fallbackRes,
        warning: `Atención: No se pudo conectar con el servidor de la nube (${err?.message || 'Error de red'}). Se utilizó el motor local de contingencia.`,
      };
    }
  }
}
