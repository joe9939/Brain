// AgentLoop — 马斯洛 Agent 主循环
// perceive → Maslow → Goal → LLM/Execute → loop

import { AgentLoop } from '../src/core/agent-loop';

let passed = 0, failed = 0;
function assert(ok: boolean, name: string) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}`); }
}

function makeSnapshot(overrides: Record<string, any> = {}): any {
  return {
    position: { x: 0, y: 64, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    health: 20, healthDelta: 0, hunger: 20, oxygen: 20,
    onFire: false, inLava: false, falling: false,
    blocks: [], entities: [], inventory: [],
    timeOfDay: 6000, dimension: 'overworld',
    ...overrides,
  };
}

const goodInventory = [
  { item: 'iron_pickaxe', count: 1 }, { item: 'iron_axe', count: 1 },
  { item: 'iron_sword', count: 1 }, { item: 'iron_shovel', count: 1 },
  { item: 'crafting_table', count: 1 }, { item: 'furnace', count: 1 },
  { item: 'chest', count: 1 }, { item: 'red_bed', count: 1 },
  { item: 'iron_helmet', count: 1 }, { item: 'iron_chestplate', count: 1 },
  { item: 'iron_leggings', count: 1 }, { item: 'iron_boots', count: 1 },
];

async function main() {
console.log('\n🔄 AgentLoop: cycle behavior');

// RED 1: Has goal step → execute step, no LLM call
await (async function() {
  let executed: string | null = null;
  let llmCalls = 0;

  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async (step) => { executed = step; return { success: true }; },
    askLLM: async () => { llmCalls++; return null; },
    intervalMs: 50,
  });

  loop.goalManager.set({ description: 'Build', plan: ['get_wood', 'craft'], maslowLevel: 4 });
  await loop.tick();
  assert(executed === 'get_wood', 'executes current step');
  assert(llmCalls === 0, 'no LLM call when step executes');
})();

// RED 2: Step complete → advances to next step
await (async function() {
  const steps: string[] = [];
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async (step) => { steps.push(step); return { success: true }; },
    askLLM: async () => null,
    intervalMs: 50,
  });

  loop.goalManager.set({ description: 'Farm', plan: ['hoe', 'plant'], maslowLevel: 4 });
  await loop.tick(); // execute 'hoe'
  await loop.tick(); // stepComplete + execute 'plant'
  assert(steps.length === 2, '2 steps executed');
  assert(steps[0] === 'hoe', 'first step: hoe');
  assert(steps[1] === 'plant', 'second step: plant');
})();

// RED 3: No goal → calls LLM
await (async function() {
  let llmContext: any = null;
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async (ctx) => { llmContext = ctx; return null; },
    intervalMs: 50,
  });

  await loop.tick();
  assert(llmContext !== null, 'LLM called when no goal');
  assert(llmContext.maslow !== undefined, 'LLM receives maslow report');
  assert(llmContext.events !== undefined, 'LLM receives events');
  assert(llmContext.snapshot !== undefined, 'LLM receives snapshot');
})();

// RED 4: LLM returns plan → goal is set
await (async function() {
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async () => '["find_iron", "smelt_iron", "craft_tools"]',
    intervalMs: 50,
  });

  await loop.tick();
  assert(loop.goalManager.active !== null, 'goal set from LLM plan');
  assert(loop.goalManager.currentStep === 'find_iron', 'first step is find_iron');
})();

// RED 5: LLM returns single action → set as single-step goal
await (async function() {
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async () => 'wander',
    intervalMs: 50,
  });

  await loop.tick();
  assert(loop.goalManager.active !== null, 'goal set from single action');
  assert(loop.goalManager.currentStep === 'wander', 'single step action');
})();

// RED 6: L1 bottleneck interrupts L4 goal → LLM sees maslow report
await (async function() {
  let llmCalled = false;
  let executed: string | null = null;
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ hunger: 3, inventory: goodInventory }),
    executeStep: async (step) => { executed = step; return { success: true }; },
    askLLM: async (ctx) => { llmCalled = true; assert(ctx.maslow.bottleneck === 1, 'LLM sees L1 bottleneck'); return null; },
    intervalMs: 50,
  });

  loop.goalManager.set({ description: 'Build castle', plan: ['collect_stone'], maslowLevel: 4 });
  await loop.tick();
  // L1 bottleneck should interrupt L4 goal
  assert(loop.goalManager.active === null, 'L4 goal interrupted by hunger');
  // Since no goal, LLM should be called
  assert(llmCalled === true, 'LLM called after interrupt');
})();

// RED 7: Events are passed to LLM
await (async function() {
  let receivedEvents: any = null;
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async (ctx) => { receivedEvents = ctx.events; return null; },
    intervalMs: 50,
  });

  loop.eventBuffer.push({ type: 'chat', player: 'Alice', message: 'hello', time: 100 });
  loop.eventBuffer.push({ type: 'damage', amount: 2, source: 'zombie', time: 101 });
  await loop.tick();
  assert(receivedEvents !== null, 'events sent to LLM');
  assert(receivedEvents.length === 2, '2 events sent');
  assert(receivedEvents[0].type === 'chat', 'chat event preserved');
  assert(receivedEvents[1].type === 'damage', 'damage event preserved');
})();

// RED 8: Events cleared after tick (flush semantics)
await (async function() {
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async () => null,
    intervalMs: 50,
  });

  loop.eventBuffer.push({ type: 'chat', player: 'A', message: 'hi', time: 1 });
  await loop.tick();
  assert(loop.eventBuffer.size() === 0, 'events cleared after tick');
})();

// RED 9: Last action result passed to LLM
await (async function() {
  let lastResult: any = null;
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async (step) => {
      if (step === 'move') return { success: true };
      return { success: false, error: 'unknown step' };
    },
    askLLM: async (ctx) => { lastResult = ctx.lastActionResult; return null; },
    intervalMs: 50,
  });

  // Tick 1: no goal → LLM called with lastActionResult=null
  await loop.tick();
  assert(lastResult === null || lastResult === undefined, 'first tick → no last action');

  // Set a goal manually
  loop.goalManager.set({ description: 'test', plan: ['move'] });
  lastResult = null;

  // Tick 2: execute 'move' → success
  await loop.tick();
  // After execute, stepComplete advances the goal. Next tick will call LLM.
  // Actually, executeStep returns → stepComplete → no more steps → next tick calls LLM
  // But we need the LLM to be called WITH the result.
  // Let me trace: tick() calls executeStep, then stepComplete, returns.
  // Next tick: no step → askLLM called.
  // But we only call tick() once here.
  // The lastActionResult should be tracked from the execution.

  // Try again: tick() that executes step, then immediately another tick that calls LLM
  await loop.tick(); // tick 3: execute 'move', stepComplete, return
  // Now lastActionResult should have the result from 'move'
  await loop.tick(); // tick 4: no step → LLM called

  assert(lastResult !== null, 'LLM receives last action result');
  assert(lastResult.action === 'move', 'last action name');
  assert(lastResult.success === true, 'last action success');
})();

// RED 10: Failed step → retried, does NOT call LLM immediately
await (async function() {
  let llmCalled = false;
  let attemptCount = 0;
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async (step) => { attemptCount++; return { success: false, error: 'blocked' }; },
    askLLM: async (ctx) => { llmCalled = true; return null; },
    intervalMs: 50,
  });

  loop.goalManager.set({ description: 'test', plan: ['dig'] });
  await loop.tick(); // execute 'dig' → fail, retry
  await loop.tick(); // execute 'dig' → fail again
  assert(attemptCount === 2, 'failed step retried');
  assert(llmCalled === false, 'LLM NOT called on failed step (retry)');
})();

// RED 11: LLM returns markdown-wrapped JSON → parses correctly
await (async function() {
  let llmCalled = false;
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async () => '```json\n["wander"]\n```',
    intervalMs: 50,
  });
  await loop.tick();
  assert(loop.goalManager.active !== null, 'markdown json → goal set');
  assert(loop.goalManager.currentStep === 'wander', 'markdown json → step = wander');
})();

// RED 12: LLM returns bare markdown block → parses correctly
await (async function() {
  const loop = new AgentLoop({
    perceive: async () => makeSnapshot({ inventory: goodInventory }),
    executeStep: async () => ({ success: true }),
    askLLM: async () => '```\n["dig"]\n```',
    intervalMs: 50,
  });
  await loop.tick();
  assert(loop.goalManager.currentStep === 'dig', 'bare markdown → step = dig');
})();

console.log(`\n${'='.repeat(50)}`);
console.log(`AgentLoop: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
else console.log('All AgentLoop tests passed! ✅');
} // end main

main().catch(e => { console.error(e); process.exit(1); });
