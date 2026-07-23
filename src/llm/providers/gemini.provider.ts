import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { LlmProvider } from './llm.provider.interface';

@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);
  private client: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('GOOGLE_API_KEY');
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: object;
  }): Promise<T> {
    try {
      const model = this.client.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const response = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: params.systemPrompt },
              { text: params.userPrompt },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: params.jsonSchema as any,
          // Température basse: recommandations plus cohérentes/reproductibles
          temperature: 0.2,
        },
      });

      const text = response.response.text();
      const parsed = JSON.parse(text) as T;
      return parsed;
    } catch (error) {
      this.logger.error(`Gemini provider error: ${error.message}`);
      throw new Error(`Gemini error: ${error.message}`);
    }
  }
}
