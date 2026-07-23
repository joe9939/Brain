// Minecraft Brain Bot — AgentLoop 驱动
// reflex 50ms → 事件收集 → Maslow → LLM → 执行

import { createInterface } from 'readline';
import { readFileSync, appendFileSync } from 'fs';
import { BrainEngine } from './brain-engine/src/core/brain-engine';
import { SurvivalReflex } from './brain-engine/src/core/reflex-arc';
import { AgentLoop } from './brain-engine/src/core/agent-loop';
import { MinecraftPerceiver } from './adapter/minecraft/mc-perceive';
import { act } from './adapter/minecraft/mc-act';
import { NavigationArc } from './adapter/minecraft/mc-navigate-action';
import { runAgentBridge } from './app/mc-agent-bridge';
const { pathfinder: PathfinderPlugin, Movements } = require('mineflayer-pathfinder');
const { GoalBlock, GoalNear, GoalXZ, GoalFollow } = require('mineflayer-pathfinder').goals;

const LOG = 'brainy-debug.log';
function log(msg: string) {
  const line = `[${new Date().toISOString().slice(11,19)}] ${msg}`;
  appendFileSync(LOG, line + '\n');
  console.log(line);
}

function buildTerrainSummary(snapshot: any, bot?: any): string {
  const blocks = snapshot.blocks || [];
  const pos = snapshot.position;
  const px = Math.floor(pos.x);
  const py = Math.floor(pos.y);
  const pz = Math.floor(pos.z);

  const ground = blocks.find((b: any) => b.position.x === px && b.position.y === py - 1 && b.position.z === pz);
  const here = blocks.find((b: any) => b.position.x === px && b.position.y === py && b.position.z === pz);

  const dirs = [
    { label: 'S(+Z)', dx: 0, dz: 1 },
    { label: 'N(-Z)', dx: 0, dz: -1 },
    { label: 'E(+X)', dx: 1, dz: 0 },
    { label: 'W(-X)', dx: -1, dz: 0 },
  ];
  const dirInfo = dirs.map(d => {
    const f = blocks.find((b: any) => b.position.x === px+d.dx && b.position.y === py && b.position.z === pz+d.dz);
    const g = blocks.find((b: any) => b.position.x === px+d.dx && b.position.y === py-1 && b.position.z === pz+d.dz);
    const above = blocks.find((b: any) => b.position.x === px+d.dx && b.position.y === py+1 && b.position.z === pz+d.dz);
    return `${d.label}: front=${f?.type||'air'} below=${g?.type||'air'} above=${above?.type||'air'}`;
  }).join('\n');

  const head = blocks.find((b: any) => b.position.x === px && b.position.y === py+1 && b.position.z === pz);

  let facing = 'unknown';
  if (bot?.entity?.yaw !== undefined) {
    const yaw = bot.entity.yaw;
    if (Math.abs(yaw) < 0.5) facing = 'S(+Z)';
    else if (Math.abs(yaw - Math.PI) < 0.5) facing = 'N(-Z)';
    else if (yaw > 0) facing = 'W(-X)';
    else facing = 'E(+X)';
  }

  return `ground: ${ground?.type||'?'}  stand: ${here?.type||'?'}  head: ${head?.type||'?'}
facing: ${facing}  weather: ${snapshot.isRaining ? '🌧️' : '☀️'}  light: ${snapshot.lightLevel ?? '?'}
${dirInfo}`;
}

const BASE_PROMPT = readFileSync('prompts/survival.md', 'utf8');

function buildLLMPrompt(ctx: {
  snapshot: any; events: any[]; maslow: any; goal: any; bot?: any; lastActionResult?: any;
}): string {
  const s = ctx.snapshot;
  const terrain = buildTerrainSummary(s, ctx.bot);

  let extra = '';

  // last action result
  if (ctx.lastActionResult && !ctx.lastActionResult.success) {
    const err = ctx.lastActionResult.error || '';
    extra += `⚠️ Last action "${ctx.lastActionResult.action}" failed: ${err}\n`;
    if (err.includes('cant move') || err.includes('stuck')) {
      extra += `→ Try: ["wander"] to turn, or ["jump"] to break free\n`;
    } else     if (err.includes('no bed')) {
      extra += `→ Craft a bed! Get 3 wool (kill sheep) + 3 planks, use crafting table.\n`;
    }
  }

  // bottleneck alert
  const b = ctx.maslow?.bottleneck;
  if (b === 1) extra += '🔴 Hunger/health/oxygen is critical\n';
  else if (b === 2) extra += '🟡 Environment dangerous (night/monsters)\n';
  else if (b === 4) extra += '🟢 Need better tools/armor\n';
  else if (b === 5) extra += '🔵 Nothing to do, find a goal\n';

  // water alert
  if (terrain.includes('stand: water')) {
    extra += '⚠️ You are in water! Use move_forward to swim. If stuck, use wander to change direction.\n';
  }

  // nearby resources
  const nearby = s.nearbyBlocks?.slice(0, 6).map((b: any) => `${b.type}(${b.distance}m ${b.direction})`).join(', ') || '';
  const recipes = s.recipes?.slice(0, 8).map((r: any) => `${r.item}=${r.materials}`).join('\n') || '';

  // dynamic context
  const context = `## Current State
Position: (${s.position.x.toFixed(1)}, ${s.position.y.toFixed(0)}, ${s.position.z.toFixed(1)})
Health: ${s.health}/20  Hunger: ${s.hunger}/20  Oxygen: ${s.oxygen}/20
Dimension: ${s.dimension}  Time: ${s.timeOfDay}  Biome: ${s.biome||'?'}  Difficulty: ${s.difficulty||'?'}
${s.onFire ? '🔥 ON FIRE!' : ''}${s.inLava ? '🌋 IN LAVA!' : ''}${s.falling ? '⬇️ FALLING!' : ''}${s.isRaining ? '🌧️ RAINING' : ''}

## Terrain
${terrain}

## Nearby Resources
${nearby || 'none detected'}

## Crafting Recipes
${recipes || 'use craft action to check'}

## Nearby Entities (${s.entities.length})
${s.entities.slice(0, 5).map((e: any) => `  ${e.type} at (${e.position.x.toFixed(1)}, ${e.position.y.toFixed(0)}, ${e.position.z.toFixed(1)})`).join('\n')}

${s.effects?.length ? `## Effects\n${s.effects.map((e:any) => `  ${e.name} lv${e.amplifier} ${e.duration}t`).join('\n')}\n` : ''}
${s.players?.length ? `## Players Online (${s.players.length})\n${s.players.slice(0,5).map((p:any) => `  ${p.username} HP:${p.health}`).join('\n')}\n` : ''}
## Inventory (${s.inventory.length})
${s.inventory.slice(0, 8).map((i: any) => `  ${i.item} x${i.count}`).join('\n')}

## Maslow Needs
${Object.entries(ctx.maslow.levels).map(([k, v]: [string, any]) =>
  `  L${k}: ${v.satisfied ? 'OK' : 'WARN'} ${v.detail}`
).join('\n')}
Bottleneck: ${ctx.maslow.bottleneck ? `L${ctx.maslow.bottleneck}` : 'none'}

## Events (${ctx.events.length})
${ctx.events.slice(-5).map((e: any) => `  [${e.type}] ${JSON.stringify(e)}`).join('\n')}

${ctx.goal ? `## Current Goal\n  ${ctx.goal.description} (step ${ctx.goal.stepIndex + 1})` : ''}
`;

  return extra + '\n' + context + '\n' + BASE_PROMPT;
}

async function main() {
  // 加载 .env
  try {
    const env = readFileSync('.env', 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^(\w+)=(.+)/);
      if (m) process.env[m[1]] = m[2];
    }
  } catch {}

  log('🧠 Starting Brainy with AgentLoop...');

  // 动态 import mineflayer
  let mineflayer: any;
  try { mineflayer = await import('mineflayer'); }
  catch { log('❌ mineflayer not installed'); process.exit(1); }

  // 创建 bot
  const bot = mineflayer.createBot({
    host: process.env.MC_HOST || 'localhost',
    port: parseInt(process.env.MC_PORT || '25565', 10),
    username: process.env.MC_USERNAME || 'Brainy',
    auth: 'offline',
  });

  // Load mineflayer-pathfinder (A* navigation replaces custom edge detection)
  bot.loadPlugin(PathfinderPlugin);
  const defaultMove = new Movements(bot);
  defaultMove.canDig = true;
  defaultMove.allowParkour = true;
  defaultMove.allowSprinting = true;
  defaultMove.allow1by1towers = true;
  bot.pathfinder.setMovements(defaultMove);
  log('🧭 Pathfinder loaded');

  // Create Brain Engine (大脑)
  const brain = new BrainEngine({
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
  });
  brain.reflexRegistry.register(new SurvivalReflex());

  const perceiver = new MinecraftPerceiver();
  const navArc = new NavigationArc(20);

  // Create AgentLoop with BrainEngine as cognitive layer
  let stuckCount = 0;
  const loop = new AgentLoop({
    perceive: async () => perceiver.perceive(bot),
    executeStep: async (step: string) => {
      // Parse action string → structured action
      // "goto(100,64,200)" → { action: 'goto', params: { x:100, y:64, z:200 } }
      // "dig_block(100,64,200)" → { action: 'dig', params: { position: Vec3(100,64,200) } }
      // "eat()" → { action: 'eat' }
      // "craft(planks,4)" → { action: 'craft', params: { item: 'planks', count: 4 } }
      let actAction: { action: string; params: any } = { action: step, params: {} };
      const parenMatch = step.match(/^(\w+)\((.+)\)$/);
      if (parenMatch) {
        const cmd = parenMatch[1];
        const rawArgs = parenMatch[2];
        if (cmd === 'goto' || cmd === 'goto_near') {
          const args = rawArgs.split(',').map(Number);
          if (args.length >= 3) actAction = { action: cmd, params: { x: args[0], y: args[1], z: args[2], range: args[3] || 2 } };
          else return { success: false, error: 'invalid coords' };
        } else if (cmd === 'dig_block') {
          const args = rawArgs.split(',').map(Number);
          if (args.length >= 3) {
            const Vec3 = require('vec3').Vec3;
            actAction = { action: 'dig', params: { position: new Vec3(args[0], args[1], args[2]) } };
          } else return { success: false, error: 'invalid coords' };
        } else if (cmd === 'follow') {
          actAction = { action: 'follow', params: { player: rawArgs.trim() } };
        } else if (cmd === 'craft') {
          const [item, count] = rawArgs.split(',').map(s => s.trim());
          actAction = { action: 'craft', params: { item, count: parseInt(count) || 1 } };
        } else if (cmd === 'eat' || cmd === 'sleep' || cmd === 'wake' || cmd === 'respawn' || cmd === 'stop_path' || cmd === 'close_container') {
          actAction = { action: cmd, params: {} };
        } else if (cmd === 'chat') {
          actAction = { action: 'chat', params: { message: rawArgs } };
        } else if (cmd === 'place_block') {
          const args = rawArgs.split(',').map(s => s.trim());
          if (args.length >= 3) {
            const Vec3 = require('vec3').Vec3;
            actAction = { action: 'place_block', params: { position: new Vec3(+args[0], +args[1], +args[2]), blockType: args[3] } };
          }
        } else if (cmd === 'use_block') {
          const args = rawArgs.split(',').map(Number);
          if (args.length >= 3) {
            const Vec3 = require('vec3').Vec3;
            actAction = { action: 'use_block', params: { position: new Vec3(args[0], args[1], args[2]) } };
          }
        } else if (cmd === 'sleep') {
          const args = rawArgs.split(',').map(Number);
          if (args.length >= 3) {
            const Vec3 = require('vec3').Vec3;
            actAction = { action: 'sleep', params: { position: new Vec3(args[0], args[1], args[2]) } };
          }
        }
      }

      // Execute via mc-act (pathfinder or reflex handled inside)
      const result = await act(bot, actAction, bot.entities);
      return result;
    },
    askLLM: async (ctx) => {
      const prompt = buildLLMPrompt({ ...ctx, bot });
      try {
        const resp = await fetch(`${process.env.LLM_BASE || 'https://api.deepseek.com'}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || ''}` },
          body: JSON.stringify({
            model: process.env.LLM_MODEL || 'deepseek-chat',
            messages: [
              { role: 'system', content: BASE_PROMPT },
              { role: 'user', content: prompt },
            ],
            max_tokens: 250, temperature: 0.3,
          }),
        });
        const data = await resp.json() as any;
        const text = data.choices?.[0]?.message?.content || '';
        log(`🧠 Brain: ${text.slice(0, 200)}`);
        return text;
      } catch (e: any) {
        log(`❌ Brain error: ${e.message}`);
        return null;
      }
    },
    intervalMs: 3000,
  });

  bot.once('spawn', () => {
    log(`✅ Spawned at (${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y}, ${bot.entity.position.z.toFixed(1)})`);

    // TP to safe location if spawned in water/tree
    setTimeout(async () => {
      try {
        const Vec3 = require('vec3').Vec3;
        const below = bot.blockAt(new Vec3(Math.floor(bot.entity.position.x), Math.floor(bot.entity.position.y) - 1, Math.floor(bot.entity.position.z)));
        const here = bot.blockAt(new Vec3(Math.floor(bot.entity.position.x), Math.floor(bot.entity.position.y), Math.floor(bot.entity.position.z)));
        const bad = ['water', 'oak_leaves', 'birch_leaves', 'jungle_leaves', 'spruce_leaves', 'dark_oak_leaves', 'acacia_leaves'];
        if (below && bad.includes(below.name)) {
          log(`⚠️ Spawned on ${below.name}, trying /tp`);
          bot.chat('/tp 0 64 0');
          setTimeout(() => { log(`📌 After TP: (${bot.entity.position.x.toFixed(1)}, ${bot.entity.position.y}, ${bot.entity.position.z.toFixed(1)})`); }, 2000);
        }
      } catch {}
    }, 3000);

    // 启动 bridge (reflex 50ms + 事件监听)
    const bridge = runAgentBridge(bot, loop, {
      act: (action) => {
        const safe = navArc.drive(bot, action);
        act(bot, safe, bot.entities);
      },
    });

    // 状态日志
    setInterval(() => {
      const e = loop.eventBuffer;
      const lastAct = loop['lastAction'] as any;
      const failInfo = lastAct && !lastAct.success ? ` FAIL:${lastAct.error||''}` : '';
      log(`📍(${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(0)},${bot.entity.position.z.toFixed(1)}) HP:${bot.health} Food:${bot.food} ev:${e.size()} goal:${loop.goalManager.active?.description?.slice(0,20) || 'none'}${failInfo}`);
    }, 5000);
  });

  bot.on('health', () => log(`❤️ HP:${bot.health} Food:${bot.food}`));
  bot.on('death', () => { log('💀 Died!'); loop.eventBuffer.push({ type: 'death' as any, time: Date.now() }); });
  bot.on('kicked', (r: string) => log(`❌ Kicked: ${r}`));
  bot.on('error', (e: Error) => log(`❌ Error: ${e.message}`));
  bot.on('end', () => {
    log('🔌 Disconnected, reconnecting in 10s...');
    setTimeout(() => main(), 10000); // Auto-reconnect
  });

  // Chat command response
  bot.on('chat', (username: string, message: string) => {
    if (username === bot.username) return;
    if (message.startsWith('!')) {
      const cmd = message.slice(1).toLowerCase();
      if (cmd === 'status') {
        bot.chat(`HP:${bot.health}/20 Food:${bot.food}/20 Pos:(${bot.entity.position.x.toFixed(0)},${bot.entity.position.y.toFixed(0)},${bot.entity.position.z.toFixed(0)})`);
      } else if (cmd === 'come') {
        const player = bot.players[username]?.entity;
        if (player) bot.chat(`/${'tp'} ${bot.username} ${player.position.x} ${player.position.y} ${player.position.z}`);
      } else if (cmd === 'stop') {
        bot.clearControlStates();
        loop.goalManager.clear();
        bot.chat('Stopped');
      }
    }
  });

  log('✅ Brainy online. Type status/chat/quit');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (line) => {
    if (line === 'quit' || line === 'exit') { bot.end(); process.exit(0); }
    if (line.startsWith('chat ')) { bot.chat(line.slice(5)); log(`💬 ${line.slice(5)}`); }
    if (line === 'status') {
      log(`📍 (${bot.entity.position.x.toFixed(1)},${bot.entity.position.y.toFixed(0)},${bot.entity.position.z.toFixed(1)}) HP:${bot.health} Food:${bot.food}`);
      log(`🎯 ${loop.goalManager.active?.description || '无目标'}`);
      log(`📦 EventBuffer: ${loop.eventBuffer.size()} 事件`);
    }
  });
}

main().catch(e => { log(`❌ Fatal: ${e.message}`); process.exit(1); });
