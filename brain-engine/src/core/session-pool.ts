// Session Pool — §1.3A: Each brain component has its own LLM session
// Independent context windows, parallel execution, different models possible

import { BrainComponent, ComponentOutput, MentalState } from './types';

interface LLMConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

interface Session {
  id: string;
  componentId: string;
  history: { role: string; content: string }[];
  config: LLMConfig;
  createdAt: number;
}

export class SessionPool {
  private sessions: Map<string, Session> = new Map();
  private defaultConfig: LLMConfig;

  constructor(config: LLMConfig) {
    this.defaultConfig = config;
  }

  /**
   * Get or create a session for a component
   */
  getOrCreate(componentId: string, config?: Partial<LLMConfig>): Session {
    const existing = this.sessions.get(componentId);
    if (existing) return existing;

    const session: Session = {
      id: `br-${componentId}`,
      componentId,
      history: [],
      config: { ...this.defaultConfig, ...config },
      createdAt: Date.now(),
    };
    this.sessions.set(componentId, session);
    return session;
  }

  /**
   * Run a component with its own session context
   */
  async runComponent(
    component: BrainComponent,
    input: string,
    state: MentalState
  ): Promise<ComponentOutput> {
    const session = this.getOrCreate(component.id, { model: component.model });

    // Build prompt with context
    const systemPrompt = component.prompt;
    const contextPrompt = this.buildContextPrompt(input, state);

    // In real implementation: call LLM API here
    // For now, return a mock that passes the signal computation
    const output = await this.callLLM(session, systemPrompt, contextPrompt);

    // Parse structured output
    try {
      const parsed = JSON.parse(output);
      return {
        componentId: component.id,
        summary: parsed.summary || output.slice(0, 200),
        signals: parsed.signals || {},
        state: parsed.state || {},
      };
    } catch {
      return {
        componentId: component.id,
        summary: output.slice(0, 200),
        signals: {},
        state: {},
      };
    }
  }

  /**
   * Run multiple components in parallel
   */
  async runAll(
    components: BrainComponent[],
    input: string,
    state: MentalState
  ): Promise<Map<string, ComponentOutput>> {
    const results = await Promise.all(
      components.map(c => this.runComponent(c, input, state)
        .then(r => [c.id, r] as const)
        .catch(e => [c.id, { componentId: c.id, summary: `Error: ${e.message}`, signals: {}, state: {} }] as const)
      )
    );
    return new Map(results);
  }

  private buildContextPrompt(input: string, state: MentalState): string {
    return `
## Input
${input}

## Current Mental State
- Emotion: ${state.emo.mode} @${state.emo.intensity.toFixed(1)}
- Score: ${state.rew.score.toFixed(1)}, td_error: ${state.rew.td_error.toFixed(2)}
- Goals completed: ${state.goal.completed}
- Working memory: ${state.mem.working.length} items
- Episodic memories: ${state.mem.episodic.length}
- SOPs available: ${state.mem.procedural.length}
`;
  }

  private async callLLM(session: Session, system: string, context: string): Promise<string> {
    // Store in history
    session.history.push({ role: 'user', content: context });

    // TODO: replace with actual LLM API call
    // For now, return a structured response based on component
    session.history.push({ role: 'assistant', content: '{}' });
    return '{}';
  }

  /**
   * Clear a component's session history
   */
  clear(componentId: string): void {
    this.sessions.delete(componentId);
  }

  /**
   * Get session stats
   */
  stats(): { total: number; sessions: { id: string; historyLen: number }[] } {
    const sessions = Array.from(this.sessions.values()).map(s => ({
      id: s.id,
      historyLen: s.history.length,
    }));
    return { total: sessions.length, sessions };
  }
}
