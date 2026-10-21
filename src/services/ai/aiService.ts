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
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        this.status = {
          hasGeminiKey: Boolean(data.hasGeminiKey),
          activeProvider: data.hasGeminiKey ? 'gemini' : 'local',
          model: data.model || 'gemini-flash-lite-latest',
        };
      }
    } catch {
      // In standalone client or offline mode
      this.status = {
        hasGeminiKey: false,
        activeProvider: 'local',
        model: 'local-intelligence',
      };
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
