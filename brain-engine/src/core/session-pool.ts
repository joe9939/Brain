// Session Pool �?v2: Each brain component has its own LLM session
// arXiv 2504.01990v2 §1.3A: Independent context windows, fully parallel

import { BrainCircuit, BrainComponent, CircuitStage, ComponentOutput, MentalState } from './types.js';
import { LLMClient, LLMConfig, Message } from './llm-client.js';

interface Session {
  id: string;
  componentId: string;
  history: Message[];
  config: LLMConfig;
  createdAt: number;
}

export class SessionPool {
  private sessions: Map<string, Session> = new Map();
  private clients: Map<string, LLMClient> = new Map();
  private defaultConfig: LLMConfig;

  constructor(config: LLMConfig) {
    this.defaultConfig = config;
  }

  private getClient(componentId: string, model?: string): LLMClient {
    const key = model || this.defaultConfig.model;
    if (!this.clients.has(key)) {
      this.clients.set(key, new LLMClient({ ...this.defaultConfig, model: key }, key));
    }
    return this.clients.get(key)!;
  }

  getOrCreate(componentId: string, model?: string): Session {
    const existing = this.sessions.get(componentId);
    if (existing) return existing;
    const session: Session = {
      id: `br-${componentId}`,
      componentId,
      history: [],
      config: { ...this.defaultConfig, model: model || this.defaultConfig.model },
      createdAt: Date.now(),
    };
    this.sessions.set(componentId, session);
    return session;
  }

  async runComponent(component: BrainComponent, input: string, state: MentalState): Promise<ComponentOutput> {
    const session = this.getOrCreate(component.id, component.model);
    const client = this.getClient(component.id, component.model);
    client.setComponentId(component.id);
    const systemPrompt = component.prompt;
    // Use sensory afferent if defined (analogous to hard-wired sensory pathways)
    const afferentInput = component.extractAfferent ? component.extractAfferent(input, state) : input;
    const context = this.buildContext(afferentInput, state);

    const result = await client.complete([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: context },
    ], { temperature: 0.3 });

    session.history.push(
      { role: 'user', content: context.slice(0, 500) },
      { role: 'assistant', content: result.content },
    );
    if (session.history.length > 20) session.history.splice(0, 2);

    return this.parseOutput(result.content, component.id);
  }

  /**
   * Run circuits with optional hormone/drive context injection.
   * After each stage, calls onStageComplete(accumulated) so caller can update hormones.
   */
  runCircuit(
    circuit: BrainCircuit, components: BrainComponent[], rawInput: string,
    state: MentalState, contextInjector?: () => string,
    onStageComplete?: (accumulated: Map<string, ComponentOutput>) => void,
  ): Promise<Map<string, ComponentOutput>> {
    return this.runCircuitStages(circuit, components, rawInput, state, new Map(), contextInjector, onStageComplete);
  }

  private async runCircuitStages(
    circuit: BrainCircuit, components: BrainComponent[], rawInput: string,
    state: MentalState, accumulated: Map<string, ComponentOutput>,
    contextInjector?: () => string,
    onStageComplete?: (accumulated: Map<string, ComponentOutput>) => void,
  ): Promise<Map<string, ComponentOutput>> {
    const stage = circuit.stages[0];
    if (!stage) return accumulated;

    // Determine input for this stage
    let stageInput: string;
    if (stage.inputSource === 'raw') {
      stageInput = rawInput;
    } else if (stage.inputSource === 'previous') {
      stageInput = stage.inputMapper
        ? stage.inputMapper(accumulated, rawInput)
        : Array.from(accumulated.entries()).map(([id, o]) => `[${id}] ${o.summary}`).join('\n');
    } else {
      const prev = stage.inputMapper
        ? stage.inputMapper(accumulated, rawInput)
        : Array.from(accumulated.entries()).map(([id, o]) => `[${id}] ${o.summary}`).join('\n');
      stageInput = `## Previous Stage\n${prev}\n\n## Raw Input\n${rawInput}`;
    }

    // Prepend hormone/drive context if injector provided
    if (contextInjector) {
      stageInput = contextInjector() + '\n\n## Task\n' + stageInput;
    }

    // Run stage components in parallel
    const stageComponents = components.filter(c => stage.componentIds.includes(c.id));
    const results = await Promise.allSettled(
      stageComponents.map(c => this.runComponent(c, stageInput, state).then(r => [c.id, r] as const))
    );

    for (const r of results) {
      if (r.status === 'fulfilled') accumulated.set(r.value[0], r.value[1]);
      else accumulated.set('error', {
        componentId: 'error', summary: r.reason?.message || 'unknown error', signals: {}, state: {},
      });
    }

    // Notify caller that stage completed (for hormone/drive updates)
    if (onStageComplete) onStageComplete(accumulated);

    // Continue to next stage
    const remaining: BrainCircuit = { ...circuit, stages: circuit.stages.slice(1) };
    return this.runCircuitStages(remaining, components, rawInput, state, accumulated, contextInjector, onStageComplete);
  }

  async runAll(components: BrainComponent[], input: string, state: MentalState): Promise<Map<string, ComponentOutput>> {
    const results = await Promise.allSettled(
      components.map(c => this.runComponent(c, input, state).then(r => [c.id, r] as const))
    );
    const map = new Map<string, ComponentOutput>();
    for (const r of results) {
      if (r.status === 'fulfilled') map.set(r.value[0], r.value[1]);
      else map.set('error', { componentId: 'error', summary: r.reason?.message || 'unknown error', signals: {}, state: {} });
    }
    return map;
  }

  private buildContext(input: string, state: MentalState): string {
    return `## User Input\n${input}\n\n## Current Mental State\n- Emotion: ${state.emo.mode} @${state.emo.intensity.toFixed(2)}\n- Score: ${state.rew.score.toFixed(1)}\n- Goals: ${state.goal.active.length} active, ${state.goal.completed} done\n- Working memory: ${state.mem.working.length} items`;
  }

  private parseOutput(text: string, componentId: string): ComponentOutput {
    let signals: Record<string, number> = {};
    let state: Record<string, any> = {};
    let needs: Partial<Record<1|2|3|4|5, number>> | undefined;
    let summary = text.slice(0, 500);

    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*"signals"[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        signals = parsed.signals || {};
        state = parsed.state || {};
        needs = parsed.needs;
        summary = parsed.summary || summary;
      } catch {}
    }
    return { componentId, summary, signals, state, needs };
  }

  clear(componentId: string): void { this.sessions.delete(componentId); }

  stats(): { total: number } {
    return { total: this.sessions.size };
  }
}
