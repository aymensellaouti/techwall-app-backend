import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { GeminiProvider } from './providers/gemini.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAiProvider } from './providers/openai.provider';

@Module({
  providers: [LlmService, GeminiProvider, AnthropicProvider, OpenAiProvider],
  exports: [LlmService],
})
export class LlmModule {}
