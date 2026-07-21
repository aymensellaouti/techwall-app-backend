import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmProvider } from './providers/llm.provider.interface';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiProvider } from './providers/openai.provider';

@Injectable()
export class LlmService {
  private providers: LlmProvider[];
  private readonly logger = new Logger(LlmService.name);

  constructor(
    private configService: ConfigService,
    private gemini: GeminiProvider,
    private anthropic: AnthropicProvider,
    private openai: OpenAiProvider,
  ) {
    const order = this.configService.get<string>('LLM_PROVIDER_ORDER', 'gemini,anthropic,openai');
    this.providers = this.buildChain(order);
    this.logger.debug(`LLM provider chain: ${this.providers.map(p => p.name).join(' -> ')}`);
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: object;
  }): Promise<{ response: T; providerUsed: string; fallbackUsed: boolean }> {
    let lastError: Error | null = null;
    const firstProvider = this.providers[0]?.name || 'unknown';

    this.logger.debug(`[generateStructured] Starting with ${this.providers.length} providers`);

    for (const provider of this.providers) {
      try {
        this.logger.debug(`[generateStructured] Attempting ${provider.name}...`);
        const response = await provider.generateStructured<T>(params);
        const fallbackUsed = provider.name !== firstProvider;
        if (fallbackUsed) {
          this.logger.warn(`${provider.name} succeeded (fallback from ${firstProvider})`);
        } else {
          this.logger.debug(`${provider.name} succeeded`);
        }
        return { response, providerUsed: provider.name, fallbackUsed };
      } catch (error) {
        lastError = error;
        this.logger.warn(`[generateStructured] ${provider.name} failed: ${error.message}`);
      }
    }

    const allFailed = `All LLM providers failed. Last error: ${lastError?.message}`;
    this.logger.error(`[generateStructured] ${allFailed}`);
    throw new Error(allFailed);
  }

  private buildChain(order: string): LlmProvider[] {
    const providerMap: Record<string, LlmProvider> = {
      gemini: this.gemini,
      anthropic: this.anthropic,
      openai: this.openai,
    };

    return order
      .split(',')
      .map(name => providerMap[name.trim()])
      .filter((p) => !!p);
  }
}
