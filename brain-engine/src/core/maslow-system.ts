// MaslowSystem — 马斯洛需求 L1-L5 评估
// 纯计算, 无 LLM, 无副作用
// 输入 WorldSnapshot + 可选的上下文
// 输出 MaslowReport (含 bottleneck)

import { WorldSnapshot } from './types.js';

export interface MaslowLevel1 {
  satisfied: boolean;
  detail: string;
  hunger: number;
  health: number;
  oxygen: number;
  onFire: boolean;
  inLava: boolean;
}

export interface MaslowLevel2 {
  satisfied: boolean;
  detail: string;
  isNight: boolean;
  hostiles: string[];
  falling: boolean;
}

export interface MaslowLevel3 {
  satisfied: boolean;
  detail: string;
  nearbyPlayers: number;
}

export interface MaslowLevel4 {
  satisfied: boolean;
  detail: string;
  hasIronTools: boolean;
  hasFullArmor: boolean;
  techProgress: string[];
}

export interface MaslowLevel5 {
  satisfied: boolean;
  detail: string;
  activeGoalDesc: string | null;
}

export interface MaslowLevels {
  1: MaslowLevel1;
  2: MaslowLevel2;
  3: MaslowLevel3;
  4: MaslowLevel4;
  5: MaslowLevel5;
}

export type MaslowBottleneck = 1 | 2 | 3 | 4 | 5 | null;

export interface MaslowContext {
  hasBed?: boolean;
  activeGoal?: { description: string; progress: number } | null;
}

export interface MaslowReport {
  timestamp: number;
  levels: MaslowLevels;
  bottleneck: MaslowBottleneck;
  summary: string;
}

// ── helpers ──

function timeOfDayLabel(t: number): string {
  if (t < 1000 || t >= 13000) return 'night';
  return 'day';
}

const HOSTILE_TYPES = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'phantom'];

function findHostiles(snapshot: WorldSnapshot): string[] {
  const result: string[] = [];
  for (const e of snapshot.entities || []) {
    const t = (e.type || '').toLowerCase();
    if (HOSTILE_TYPES.some(h => t.includes(h))) {
      const dx = e.position.x - snapshot.position.x;
      const dz = e.position.z - snapshot.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 24) {
        result.push(`${e.type}(${Math.round(dist)}m)`);
      }
    }
  }
  return result;
}

function toolLevel(itemName: string): number {
  if (itemName.includes('netherite')) return 5;
  if (itemName.includes('diamond')) return 4;
  if (itemName.includes('iron')) return 3;
  if (itemName.includes('stone')) return 2;
  if (itemName.includes('wood')) return 1;
  return 0;
}

function detectIronTools(inventory: { item: string; count: number }[]): boolean {
  const toolKeywords = ['pickaxe', 'axe', 'sword', 'shovel', 'hoe'];
  let ironCount = 0;
  for (const item of inventory) {
    const name = item.item;
    if (toolKeywords.some(k => name.includes(k))) {
      if (toolLevel(name) >= 3) ironCount++;
    }
  }
  return ironCount >= 2; // at least 2 iron tools
}

function detectArmor(inventory: { item: string; count: number }[]): boolean {
  const slots = { helmet: false, chestplate: false, leggings: false, boots: false };
  for (const item of inventory) {
    const name = item.item;
    if (name.includes('helmet')) slots.helmet = true;
    if (name.includes('chestplate')) slots.chestplate = true;
    if (name.includes('leggings')) slots.leggings = true;
    if (name.includes('boots')) slots.boots = true;
  }
  return slots.helmet && slots.chestplate && slots.leggings && slots.boots;
}

function detectTech(inventory: { item: string; count: number }[]): string[] {
  const progress: string[] = [];
  const checks: Record<string, string> = {
    crafting_table: '⚒️',
    furnace: '🔥',
    chest: '📦',
    bed: '🛏️',
    shield: '🛡️',
    enchanting_table: '✨',
    anvil: '🔨',
  };
  for (const item of inventory) {
    for (const [keyword, icon] of Object.entries(checks)) {
      if (item.item.includes(keyword) && !progress.includes(icon)) {
        progress.push(icon);
      }
    }
  }
  return progress;
}

// ── MaslowSystem ──

export class MaslowSystem {
  evaluate(snapshot: WorldSnapshot, context: MaslowContext = {}): MaslowReport {
    const l1 = this.evaluateL1(snapshot);
    const l2 = this.evaluateL2(snapshot, context);
    const l3 = this.evaluateL3(snapshot);
    const l4 = this.evaluateL4(snapshot);
    const l5 = this.evaluateL5(context);

    // Bottleneck: 最低不满足的层级
    let bottleneck: MaslowBottleneck = null;
    if (!l1.satisfied) bottleneck = 1;
    else if (!l2.satisfied) bottleneck = 2;
    else if (!l3.satisfied) bottleneck = 3;
    else if (!l4.satisfied) bottleneck = 4;
    else if (!l5.satisfied) bottleneck = 5;

    const icons = ['', '🍖', '🛡️', '👥', '⛏️', '🏗️'];
    const parts = [l1, l2, l3, l4, l5].map((l, i) => {
      return l.satisfied ? `${icons[i + 1]}✓` : `${icons[i + 1]}✗`;
    });
    const summary = parts.join(' ');

    return {
      timestamp: Date.now(),
      levels: { 1: l1, 2: l2, 3: l3, 4: l4, 5: l5 },
      bottleneck,
      summary,
    };
  }

  private evaluateL1(snapshot: WorldSnapshot): MaslowLevel1 {
    const hungry = snapshot.hunger < 10;
    const injured = snapshot.health < 10;
    const suffocating = snapshot.oxygen < 5;
    const burning = snapshot.onFire || snapshot.inLava;

    const satisfied = !hungry && !injured && !suffocating && !burning;

    const issues: string[] = [];
    if (hungry) issues.push(`饥饿${snapshot.hunger}/20`);
    if (injured) issues.push(`受伤${snapshot.health}/20`);
    if (suffocating) issues.push(`O₂${snapshot.oxygen}/20`);
    if (snapshot.onFire) issues.push('着火');
    if (snapshot.inLava) issues.push('岩浆');

    return {
      satisfied,
      detail: satisfied ? '健康 ✓' : `⚠️ ${issues.join(' | ')}`,
      hunger: snapshot.hunger,
      health: snapshot.health,
      oxygen: snapshot.oxygen,
      onFire: snapshot.onFire,
      inLava: snapshot.inLava,
    };
  }

  private evaluateL2(snapshot: WorldSnapshot, context: MaslowContext): MaslowLevel2 {
    const tod = timeOfDayLabel(snapshot.timeOfDay);
    const isNight = tod === 'night';
    const hasBed = context.hasBed ?? false;
    const hostiles = findHostiles(snapshot);

    // Satisfied: daytime (or hasBed) AND no hostiles AND not falling
    const safeTime = !isNight || hasBed;
    const safePlace = hostiles.length === 0;
    const safeEnv = !snapshot.falling && snapshot.oxygen > 5;

    const satisfied = safeTime && safePlace && safeEnv;

    const issues: string[] = [];
    if (!safeTime) issues.push(isNight ? '夜晚' : '黄昏');
    if (!safePlace) issues.push(`敌对: ${hostiles.join(',')}`);
    if (snapshot.falling) issues.push('坠落');

    return {
      satisfied,
      detail: satisfied ? '安全 ✓' : `⚠️ ${issues.join(' | ')}`,
      isNight,
      hostiles,
      falling: snapshot.falling,
    };
  }

  private evaluateL3(snapshot: WorldSnapshot): MaslowLevel3 {
    const players = (snapshot.entities || []).filter(e => (e.type || '').toLowerCase() === 'player');
    const satisfied = true; // 单人模式默认满足
    return {
      satisfied,
      detail: players.length > 0 ? `附近有 ${players.length} 个玩家` : '独自一人',
      nearbyPlayers: players.length,
    };
  }

  private evaluateL4(snapshot: WorldSnapshot): MaslowLevel4 {
    const inv = snapshot.inventory || [];
    const hasIron = detectIronTools(inv);
    const armor = detectArmor(inv);
    const tech = detectTech(inv);
    const hasBed = inv.some(i => i.item.includes('bed'));
    const hasBasicTech = tech.length >= 2; // at least crafting table + furnace

    const satisfied = hasIron && armor && hasBasicTech && hasBed;

    return {
      satisfied,
      detail: satisfied
        ? `⛏️ 铁工具 ✓ 防具✓ 科技${tech.length}项`
        : `⛏️ ${!hasIron ? '缺铁工具 ' : ''}${!armor ? '缺防具 ' : ''}${!hasBasicTech ? '缺基础科技 ' : ''}${!hasBed ? '缺床 ' : ''}`,
      hasIronTools: hasIron,
      hasFullArmor: armor,
      techProgress: tech,
    };
  }

  private evaluateL5(context: MaslowContext): MaslowLevel5 {
    const goal = context.activeGoal ?? null;
    const satisfied = goal !== null; // 有目标即满足 L5（哪怕还没开始做）
    return {
      satisfied,
      detail: goal ? `🏗️ ${goal.description} (${Math.round(goal.progress * 100)}%)` : '无活跃目标',
      activeGoalDesc: goal?.description ?? null,
    };
  }
}
