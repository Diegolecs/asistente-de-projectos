import { ChatMessage, ChatMemoryItem, ActionExecuted } from '../../types';
import { AIChatOptions, AIChatResponse, AIProvider } from './types';
import { MockAIProvider } from './mockProvider';
import { getDeviceFullContext } from '../../utils/deviceDateTime';
import { getApiBaseUrl } from '../../utils/config';

export class GeminiProvider implements AIProvider {
  name = 'gemini';
  private fallbackProvider = new MockAIProvider();

  async sendMessage(
    messages: ChatMessage[],
    options: AIChatOptions
  ): Promise<AIChatResponse> {
    try {
      const tStart = performance.now();
      let firstChunkLogged = false;
      const timeContext = options.timeContext || getDeviceFullContext();
      const baseUrl = getApiBaseUrl();
      const chatUrl = baseUrl ? `${baseUrl}/api/chat` : '/api/chat';

      const wantStream = Boolean(options.stream && options.onChunk);

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(wantStream ? { Accept: 'text/event-stream' } : {}),
        },
        body: JSON.stringify({
          messages,
          projectContext: options.projectContext,
          eventsContext: options.eventsContext,
          isGeneral: options.isGeneral,
          projectId: options.projectId,
          timeContext,
          stream: wantStream,
        }),
      });

      if (!response.ok) {
        console.warn('API /api/chat returned error status:', response.status);
        const errorText = await response.text().catch(() => '');
        return {
          reply: `Inconveniente al comunicar con el asistente (código HTTP ${response.status}). Por favor, verifica tu conexión o reintenta en unos instantes.`,
          memoryUpdates: [],
          actionsExecuted: [],
          provider: 'network-error',
          warning: `Servidor respondió con código ${response.status}: ${errorText}`,
        };
      }

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;

      // Handle Server-Sent Events (SSE) progressive streaming
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let accumulatedText = '';
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();

            if (payload === '[DONE]') continue;

            try {
              const parsed = JSON.parse(payload);
              if (parsed.chunk) {
                if (!firstChunkLogged) {
                  firstChunkLogged = true;
                  const ttftMs = Math.round(performance.now() - tStart);
                  console.log(`[Chat Streaming] TTFT (Time to First Token): ${ttftMs}ms`);
                }
                accumulatedText += parsed.chunk;
                options.onChunk?.(parsed.chunk, accumulatedText);
              }
              if (parsed.done || parsed.finalPayload) {
                data = parsed.finalPayload || parsed;
              }
            } catch {
              // Ignore non-json heartbeats
            }
          }
        }

        const totalStreamMs = Math.round(performance.now() - tStart);
        console.log(`[Chat Streaming] Completed response stream in ${totalStreamMs}ms (Length: ${accumulatedText.length} chars)`);

        if (!data) {
          data = { reply: accumulatedText };
        } else if (!data.reply && accumulatedText) {
          data.reply = accumulatedText;
        }
      } else {
        // Fallback standard JSON format
        data = await response.json();
      }
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
      console.warn('Network error calling /api/chat:', err);
      return {
        reply: 'No fue posible conectar con el asistente de Project OS. Comprueba tu conexión a internet e inténtalo de nuevo.',
        memoryUpdates: [],
        actionsExecuted: [],
        provider: 'network-error',
        warning: `Error de red al conectar con /api/chat: ${err?.message || err}`,
      };
    }
  }
}
