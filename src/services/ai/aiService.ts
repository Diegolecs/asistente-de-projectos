import { ChatMessage } from '../../types';
import { AIChatOptions, AIChatResponse, AIProvider, AIProviderStatus } from './types';
import { GeminiProvider } from './geminiProvider';
import { MockAIProvider } from './mockProvider';

class AIService {
  private activeProvider: AIProvider;
  private status: AIProviderStatus = {
    hasGeminiKey: false,
    activeProvider: 'gemini',
    model: 'gemini-flash-lite-latest',
  };
  private isCheckingHealth = false;

  constructor() {
    this.activeProvider = new GeminiProvider();
    this.checkHealth();
  }

  async checkHealth(): Promise<AIProviderStatus> {
    if (this.isCheckingHealth) return this.status;
    this.isCheckingHealth = true;
    try {
      const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string || '').replace(/\/$/, '');
      const healthUrl = baseUrl ? `${baseUrl}/api/health` : '/api/health';
      const res = await fetch(healthUrl);
      if (res.ok) {
        const data = await res.json();
        const hasKey = Boolean(data.hasGeminiKey);
        this.status = {
          hasGeminiKey: hasKey,
          activeProvider: hasKey ? 'gemini' : 'local',
          model: data.model || 'gemini-3.8-flash',
        };
        this.setProvider(hasKey ? 'gemini' : 'local');
      } else {
        this.status = {
          hasGeminiKey: false,
          activeProvider: 'local',
          model: 'local-intelligence',
        };
        this.setProvider('local');
      }
    } catch {
      // In standalone client or offline mode
      this.status = {
        hasGeminiKey: false,
        activeProvider: 'local',
        model: 'local-intelligence',
      };
      this.setProvider('local');
    } finally {
      this.isCheckingHealth = false;
    }
    return this.status;
  }

  getStatus(): AIProviderStatus {
    return this.status;
  }

  setProvider(providerName: 'gemini' | 'local') {
    if (providerName === 'local') {
      this.activeProvider = new MockAIProvider();
      this.status.activeProvider = 'local';
    } else {
      this.activeProvider = new GeminiProvider();
      this.status.activeProvider = 'gemini';
    }
  }

  async sendMessage(
    messages: ChatMessage[],
    options: AIChatOptions
  ): Promise<AIChatResponse> {
    return this.activeProvider.sendMessage(messages, options);
  }
}

export const aiService = new AIService();
