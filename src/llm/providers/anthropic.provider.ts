import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider } from './llm.provider.interface';

@Injectable()
export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly logger = new Logger(AnthropicProvider.name);
  private client: Anthropic | null = null;
  private available = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (apiKey && apiKey.trim()) {
      this.client = new Anthropic({ apiKey });
      this.available = true;
    } else {
      this.logger.warn('ANTHROPIC_API_KEY not configured, provider will be unavailable');
    }
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: object;
  }): Promise<T> {
    if (!this.available || !this.client) {
      throw new Error('Anthropic provider not available (API key not configured)');
    }

    try {
      const toolSchema = params.jsonSchema as any;

      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        temperature: 0.2, // cohérence des recommandations
        system: params.systemPrompt,
        tools: [
          {
            name: 'json_response',
            description: 'Return structured JSON response',
            input_schema: toolSchema,
          },
        ],
        messages: [
          {
            role: 'user',
            content: params.userPrompt,
          },
        ],
        tool_choice: { type: 'tool', name: 'json_response' },
      });

      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new Error('No tool use in response');
      }

      return toolUse.input as T;
    } catch (error) {
      this.logger.error(`Anthropic provider error: ${error.message}`);
      throw new Error(`Anthropic error: ${error.message}`);
    }
  }
}
