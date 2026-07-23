import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LlmProvider } from './llm.provider.interface';

@Injectable()
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAiProvider.name);
  private client: OpenAI | null = null;
  private available = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey && apiKey.trim()) {
      this.client = new OpenAI({ apiKey });
      this.available = true;
    } else {
      this.logger.warn('OPENAI_API_KEY not configured, provider will be unavailable');
    }
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: object;
  }): Promise<T> {
    if (!this.available || !this.client) {
      throw new Error('OpenAI provider not available (API key not configured)');
    }

    try {
      const schema = params.jsonSchema as any;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0.2, // cohérence des recommandations
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'response',
            schema,
          },
        },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No content in response');

      const parsed = JSON.parse(content) as T;
      return parsed;
    } catch (error) {
      this.logger.error(`OpenAI provider error: ${error.message}`);
      throw new Error(`OpenAI error: ${error.message}`);
    }
  }
}
