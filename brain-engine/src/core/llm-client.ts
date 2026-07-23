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

/** Token usage entry for a single LLM call */
export interface TokenLogEntry {
  timestamp: number;
  component: string;
  model: string;
  prompt: number;
  completion: number;
  total: number;
}

/** Per-component token accumulator */
export interface ComponentTokenUsage {
  calls: number;
  prompt: number;
  completion: number;
  total: number;
}

/**
 * TokenTracker — monitors LLM token consumption per brain component.
 * Accumulates usage from every LLM call and provides summary reports.
 */
export class TokenTracker {
  private log: TokenLogEntry[] = [];
  private startTime = Date.now();

  /** Record a token usage entry */
  record(component: string, model: string, prompt: number, completion: number): void {
    this.log.push({
      timestamp: Date.now(),
      component,
      model,
      prompt,
      completion,
      total: prompt + completion,
    });
  }

  /** Get per-component breakdown */
  getByComponent(): Record<string, ComponentTokenUsage> {
    const map: Record<string, ComponentTokenUsage> = {};
    for (const entry of this.log) {
      if (!map[entry.component]) {
        map[entry.component] = { calls: 0, prompt: 0, completion: 0, total: 0 };
      }
      map[entry.component].calls++;
      map[entry.component].prompt += entry.prompt;
      map[entry.component].completion += entry.completion;
      map[entry.component].total += entry.total;
    }
    return map;
  }

  /** Get total usage across all components */
  getTotal(): ComponentTokenUsage {
    const byComp = this.getByComponent();
    const total: ComponentTokenUsage = { calls: 0, prompt: 0, completion: 0, total: 0 };
    for (const c of Object.values(byComp)) {
      total.calls += c.calls;
      total.prompt += c.prompt;
      total.completion += c.completion;
      total.total += c.total;
    }
    return total;
  }

  /** Get recent entries (last N) */
  getRecent(n = 10): TokenLogEntry[] {
    return this.log.slice(-n);
  }

  /** How long the tracker has been running (ms) */
  uptime(): number {
    return Date.now() - this.startTime;
  }

  /** Generate a human-readable summary */
  summary(): string {
    const total = this.getTotal();
    const elapsed = (this.uptime() / 1000).toFixed(0);
    const byComp = this.getByComponent();
    const lines = Object.entries(byComp)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, u]) =>
        `  ${name.padEnd(20)} ${String(u.calls).padStart(4)} calls  ${String(u.prompt).padStart(8)} in  ${String(u.completion).padStart(8)} out  ${String(u.total).padStart(8)} total`
      );
    return [
      `╔══════ LLM Token Usage ═══════`,
      `║  Duration: ${elapsed}s`,
      `║  Total:    ${total.calls} calls, ${total.total} tokens`,
      ...lines.map(l => `║  ${l}`),
      `╚═══════════════════════════════`,
    ].join('\n');
  }

  /** Reset all tracking data */
  reset(): void {
    this.log = [];
    this.startTime = Date.now();
  }
}

/** Global singleton */
export const tokenTracker = new TokenTracker();

export class LLMClient {
  private config: LLMConfig;
  private componentId: string;

  constructor(config: LLMConfig, componentId = 'unknown') {
    if (!config.apiKey) throw new Error('LLMClient: apiKey is required');
    if (!config.baseUrl) throw new Error('LLMClient: baseUrl is required');
    this.config = config;
    this.componentId = componentId;
  }

  setComponentId(id: string): void { this.componentId = id; }

  async complete(messages: Message[], options?: CompletionOptions): Promise<CompletionResult> {
    const model = this.config.model;
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model,
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
    const usage = data.usage || { prompt: 0, completion: 0, total: 0 };

    // Record token usage
    tokenTracker.record(this.componentId, model, usage.prompt || 0, usage.completion || 0);

    return {
      content: data.choices[0].message.content,
      model: data.model,
      usage,
    };
  }
}
