// Minecraft Perceive — Mineflayer bot → WorldSnapshot
// Full perception: terrain, biome, entities, inventory, recipes, effects

import { WorldSnapshot } from '../../world-interface/types';

export interface MineflayerBotLike {
  entity: {
    position: { x: number; y: number; z: number };
    velocity: { x: number; y: number; z: number };
    onGround?: boolean;
    effects?: { amplifier: number; duration: number; id: number }[];
  };
  health: number;
  food: number;
  oxygenLevel?: number;
  isOnFire: boolean;
  isInLava?: boolean;
  isSleeping?: boolean;
  game?: { dimension?: string; difficulty?: string };
  time?: { timeOfDay?: number; isDay?: boolean };
  isRaining?: boolean;
  inventory: { items: () => { name?: string; count: number }[] };
  entities: Record<string, { type?: string; position: { x: number; y: number; z: number }; velocity: { x: number; y: number; z: number } }>;
  blockAt?: (pos: any) => any;
  findBlock?: (opts: any) => { name: string; position: { x: number; y: number; z: number } } | null;
  recipesFor?: (itemType: number) => { resultCount: number; ingredients: { id: number; count: number }[] }[];
  registry?: any;
  players?: Record<string, { entity?: { position: { x: number; y: number; z: number } }; health?: number }>;
}

function scanTerrain(bot: MineflayerBotLike): { type: string; position: { x: number; y: number; z: number } }[] {
  const results: { type: string; position: { x: number; y: number; z: number } }[] = [];
  const pos = bot.entity.position;
  if (!pos || !bot.blockAt) return results;
  try {
    const Vec3 = require('vec3').Vec3;
    const px = Math.floor(pos.x), py = Math.floor(pos.y), pz = Math.floor(pos.z);
    const seen = new Set<string>();
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        for (let dy = -2; dy <= 2; dy++) {
          const key = `${px+dx},${py+dy},${pz+dz}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const block = bot.blockAt(new Vec3(px+dx, py+dy, pz+dz));
          if (block) results.push({ type: block.name, position: { x: px+dx, y: py+dy, z: pz+dz } });
        }
      }
    }
  } catch {}
  return results;
}

function scanNearby(bot: MineflayerBotLike): { type: string; distance: number; direction: string }[] {
  const results: { type: string; distance: number; direction: string }[] = [];
  if (!bot.findBlock || !bot.registry) return results;
  const dirLabels = ['N','NE','E','SE','S','SW','W','NW'];
  try {
    const blocks = ['tree', 'log', 'stone', 'coal_ore', 'iron_ore', 'water', 'grass_block', 'sand', 'cactus', 'chest', 'crafting_table', 'furnace', 'bed'];
    for (const name of blocks) {
      const id = bot.registry.blocksByName?.[name]?.id;
      if (id == null) continue;
      const found = bot.findBlock({ matching: id, maxDistance: 24, count: 1 });
      if (found) {
        const dx = found.position.x - Math.floor(bot.entity.position.x);
        const dz = found.position.z - Math.floor(bot.entity.position.z);
        const dist = Math.round(Math.sqrt(dx*dx + dz*dz));
        const angle = Math.round((Math.atan2(-dx, -dz) * 180 / Math.PI + 360) % 360 / 45) % 8;
        results.push({ type: name, distance: dist, direction: dirLabels[angle] });
      }
    }
  } catch {}
  return results;
}

function getRecipes(bot: MineflayerBotLike, registry: any): { item: string; materials: string; count: number }[] {
  const results: { item: string; materials: string; count: number }[] = [];
  if (!bot.recipesFor || !registry) return results;
  try {
    const essentials = ['oak_planks', 'stick', 'crafting_table', 'oak_door', 'furnace', 'white_bed', 'chest', 'torch', 'wooden_pickaxe', 'stone_pickaxe', 'stone_axe', 'iron_pickaxe', 'iron_sword', 'shield'];
    for (const name of essentials) {
      const item = registry.itemsByName?.[name];
      if (!item) continue;
      const recipes = bot.recipesFor(item.id);
      if (!recipes || !recipes[0]) continue;
      const mats = recipes[0].ingredients.map((ing: any) => {
        const ingName = registry.items?.[ing.id]?.name || `id_${ing.id}`;
        return `${ing.count}x${ingName}`;
      }).join(' + ');
      results.push({ item: name, materials: mats, count: recipes[0].resultCount || 1 });
    }
  } catch {}
  return results;
}

export class MinecraftPerceiver {
  private lastHealth: number | null = null;
  private lastHunger: number | null = null;
  private lastHostileCount: number = -1;
  private noMealTicks: number = 0;
  private lastScanPos: string = '';
  private scanCache: { type: string; position: { x: number; y: number; z: number } }[] = [];
  private scanTicks = 0;

  perceive(bot: MineflayerBotLike): WorldSnapshot {
    try {
    const health = bot.health;
    const hunger = bot.food;
    const healthDelta = this.lastHealth !== null ? health - this.lastHealth : 0;
    this.lastHealth = health;
    const hungerRising = this.lastHunger !== null && hunger > this.lastHunger;
    this.lastHunger = hunger;

    // Track time since last meal (hunger rising means ate)
    if (hungerRising) this.noMealTicks = 0;
    else this.noMealTicks++;

    const pos = bot.entity.position;
    const registry = (bot as any).registry;

    // Get light level
    let lightLevel: number | undefined;
    try {
      const Vec3 = require('vec3').Vec3;
      const here = bot.blockAt?.(new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z)));
      lightLevel = here?.light ?? here?.skyLight;
    } catch {}

    // Get biome from block below
    let biome: string | undefined;
    try {
      const Vec3 = require('vec3').Vec3;
      const ground = bot.blockAt?.(new Vec3(Math.floor(pos.x), Math.floor(pos.y)-1, Math.floor(pos.z)));
      biome = ground?.biome?.id ?? ground?.biome?.name;
    } catch {}

    // Effects
    const effects = (bot.entity as any)?.effects?.length 
      ? Object.entries((bot.entity as any).effects).map(([id, e]: any) => ({
          name: registry?.effects?.[id]?.name || `effect_${id}`,
          amplifier: e.amplifier,
          duration: e.duration,
        }))
      : undefined;

    // Players
    const players = bot.players
      ? Object.entries(bot.players).slice(0, 10).map(([name, p]: [string, any]) => ({
          username: name,
          position: p.entity?.position ? { x: p.entity.position.x, y: p.entity.position.y, z: p.entity.position.z } : { x: 0, y: 0, z: 0 },
          health: p.entity?.health ?? 20,
        }))
      : undefined;

    let nearby: ReturnType<typeof scanNearby> = [];
    let recipes: ReturnType<typeof getRecipes> = [];
    try { nearby = scanNearby(bot); } catch {}
    try { recipes = getRecipes(bot, registry); } catch {}

    // Compute threat trend from hostile entity count change
    const HOSTILE_TYPES = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'phantom'];
    const hostileCount = Object.values(bot.entities || {}).filter(
      (e: any) => HOSTILE_TYPES.some(h => (e.type || '').toLowerCase().includes(h))
    ).length;
    let threatTrend: 'increasing' | 'stable' | 'decreasing' | undefined;
    if (this.lastHostileCount >= 0) {
      if (hostileCount > this.lastHostileCount) threatTrend = 'increasing';
      else if (hostileCount < this.lastHostileCount) threatTrend = 'decreasing';
      else threatTrend = 'stable';
    }
    this.lastHostileCount = hostileCount;

    return {
      position: { x: pos.x, y: pos.y, z: pos.z },
      velocity: { x: bot.entity.velocity.x, y: bot.entity.velocity.y, z: bot.entity.velocity.z },
      health, healthDelta, hunger,
      oxygen: bot.oxygenLevel ?? 20,
      onFire: bot.isOnFire, inLava: bot.isInLava ?? false,
      falling: !bot.entity.onGround && bot.entity.velocity.y < -0.1,
      blocks: scanTerrain(bot),
      entities: Object.entries(bot.entities || {}).map(([id, e]) => ({
        id, type: (e as any).type || 'unknown',
        position: { x: (e as any).position.x, y: (e as any).position.y, z: (e as any).position.z },
        velocity: { x: (e as any).velocity.x, y: (e as any).velocity.y, z: (e as any).velocity.z },
      })),
      inventory: (bot.inventory?.items() || []).map((item: any) => ({ item: item.name || 'unknown', count: item.count })),
      timeOfDay: bot.time?.timeOfDay ?? 0,
      dimension: bot.game?.dimension ?? 'overworld',
      threatTrend,
      timeSinceLastMeal: this.noMealTicks,
      biome, lightLevel,
      difficulty: bot.game?.difficulty,
      players, effects,
      nearbyBlocks: nearby.length > 0 ? nearby : undefined,
      recipes: recipes.length > 0 ? recipes : undefined,
    };
    } catch (e) {
      // Fallback: return minimal snapshot on perception error
      return {
        position: { x: 0, y: 64, z: 0 },
        velocity: { x: 0, y: 0, z: 0 },
        health: 20, hunger: 20, oxygen: 20, timeOfDay: 0,
        onFire: false, inLava: false, falling: false,
        blocks: [], entities: [], inventory: [],
        dimension: 'overworld',
      };
    }
  }

  reset(): void {
    this.lastHealth = null;
    this.lastHunger = null;
  }
}

let _perceiver = new MinecraftPerceiver();
export function perceive(bot: MineflayerBotLike): WorldSnapshot {
  return _perceiver.perceive(bot);
}
