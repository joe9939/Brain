// LLM Client — DeepSeek API (OpenAI-compatible)
// arXiv 2504.01990v2 §1.3A: The LLM is the "neuron" — every brain component calls it

export interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage: { prompt: number; completion: number; total: number };
}

export class LLMClient {
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    if (!config.apiKey) throw new Error('LLMClient: apiKey is required');
    if (!config.baseUrl) throw new Error('LLMClient: baseUrl is required');
    this.config = config;
  }

  async complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`LLM API error ${response.status}: ${text.slice(0, 200)}`);
    }

    const data = await response.json() as any;
    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage: data.usage || { prompt: 0, completion: 0, total: 0 },
    };
  }
}
