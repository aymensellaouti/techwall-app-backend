export interface LlmProvider {
  readonly name: string;

  generateStructured<T>(params: {
    systemPrompt: string;
    userPrompt: string;
    jsonSchema: object;
  }): Promise<T>;
}
