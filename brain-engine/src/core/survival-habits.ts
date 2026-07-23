// SurvivalHabits — seeded procedural memory for Minecraft survival
// Returns ABSTRACT actions (gather, craft, eat, explore, build, rest, move)
// MC Adaptor translates to concrete mineflayer calls

import { CraftingKnowledge } from './crafting-knowledge.js';

export interface HabitAction {
  action: string;
  params: Record<string, any>;
}

interface SeededHabit {
  trigger: string;
  check: (inventory: { item: string; count: number }[], snapshot?: { position: { x: number; y: number; z: number } }) => HabitAction | null;
}

export class SurvivalHabits {
  private knowledge = new CraftingKnowledge();
  private habits: SeededHabit[] = [];

  constructor() {
    this.seedHabits();
  }

  private seedHabits(): void {
    // ═══════════════════════════════════════════
    // L1: Physiological
    // ═══════════════════════════════════════════

    this.add('need_food', (inv, snapshot) => {
      const foodItems = ['bread', 'apple', 'cooked_beef', 'cooked_porkchop', 'cooked_chicken', 'beef', 'porkchop', 'chicken', 'potato', 'carrot', 'baked_potato'];
      const hasFood = inv.some(i => foodItems.includes(i.item));
      if (hasFood) return { action: 'eat', params: {} };
      if (snapshot && snapshot.position.y < 58) {
        return { action: 'move', params: { to: 'surface' } };
      }
      return { action: 'gather', params: { resource: 'food' } };
    });

    this.add('need_shelter', () => {
      return { action: 'build', params: { structure: 'shelter' } };
    });

    // ═══════════════════════════════════════════
    // L2: Safety
    // ═══════════════════════════════════════════

    this.add('need_sleep', (inv) => {
      const hasBed = inv.some(i => i.item === 'bed' || i.item === 'white_bed');
      const canCraftBed = inv.some(i => i.item === 'wool') && inv.some(i => i.item === 'planks');
      if (hasBed || canCraftBed) return { action: 'rest', params: {} };
      return null;
    });

    this.add('need_torch', (inv) => {
      if (inv.some(i => i.item === 'torch')) return null;
      if (inv.some(i => i.item === 'coal') && inv.some(i => i.item === 'stick')) {
        return { action: 'craft', params: { item: 'torch', count: 4 } };
      }
      return null;
    });

    // ═══════════════════════════════════════════
    // L4: Resource gathering (FIRST — before any crafting)
    // ═══════════════════════════════════════════

    this.add('need_wood', (inv) => {
      const hasLog = inv.some(i => i.item.includes('log') && !i.item.includes('_block'));
      if (hasLog) return null;
      return { action: 'gather', params: { resource: 'wood' } };
    });

    // ═══════════════════════════════════════════
    // L4: Tool progression chain
    // ═══════════════════════════════════════════

    this.add('need_planks', (inv) => {
      const log = inv.find(i => i.item.includes('_log') || i.item === 'log');
      if (!log) return null;
      // Abstract: brain just needs "planks" — MC adaptor picks specific recipe
      return { action: 'craft', params: { item: 'planks', count: 1 } };
    });

    this.add('need_stick', (inv) => {
      return this.craftIfPossible('stick', inv);
    });

    this.add('need_crafting_table', (inv) => {
      return this.craftIfPossible('crafting_table', inv);
    });

    this.add('need_wooden_pickaxe', (inv) => {
      return this.craftIfPossible('wooden_pickaxe', inv);
    });

    this.add('need_stone_pickaxe', (inv) => {
      const craft = this.craftIfPossible('stone_pickaxe', inv);
      if (craft) return craft;
      return { action: 'gather', params: { resource: 'stone' } };
    });

    this.add('need_materials', () => {
      return { action: 'gather', params: { resource: 'any' } };
    });

    this.add('need_iron_pickaxe', (inv) => {
      const craft = this.craftIfPossible('iron_pickaxe', inv);
      if (craft) return craft;
      const hasIronOre = inv.some(i => i.item === 'iron_ore');
      if (hasIronOre) {
        const hasFurnace = inv.some(i => i.item === 'furnace');
        return hasFurnace
          ? { action: 'craft', params: { item: 'iron_ingot', burn: 'iron_ore' } }
          : { action: 'place', params: { block: 'furnace' } };
      }
      return { action: 'gather', params: { resource: 'iron_ore' } };
    });

    this.add('need_iron_sword', (inv) => {
      return this.craftIfPossible('iron_sword', inv);
    });

    this.add('need_bed', (inv) => {
      const hasWool = inv.some(i => i.item === 'wool' || i.item === 'white_wool');
      const hasPlanks = inv.some(i => i.item.includes('planks'));
      if (hasWool && hasPlanks) {
        return { action: 'craft', params: { item: 'bed' } };
      }
      return { action: 'gather', params: { resource: 'wool' } };
    });

    this.add('need_furnace', (inv) => {
      return this.craftIfPossible('furnace', inv);
    });

    this.add('need_chest', (inv) => {
      return this.craftIfPossible('chest', inv);
    });

    this.add('need_shield', (inv) => {
      return this.craftIfPossible('shield', inv);
    });

    // ═══════════════════════════════════════════
    // L5: Exploration
    // ═══════════════════════════════════════════

    this.add('need_explore', () => {
      return { action: 'explore', params: {} };
    });
  }

  private add(trigger: string, check: (inv: { item: string; count: number }[]) => HabitAction | null): void {
    this.habits.push({ trigger, check });
  }

  private craftIfPossible(recipe: string, inv: { item: string; count: number }[]): HabitAction | null {
    const missing = this.knowledge.missingMaterials(recipe, inv);
    if (missing.length === 0) {
      return { action: 'craft', params: { item: recipe } };
    }
    return null;
  }

  match(trigger: string, inventory: { item: string; count: number }[]): HabitAction | null {
    for (const habit of this.habits) {
      if (habit.trigger === trigger) {
        const result = habit.check(inventory);
        if (result) return result;
      }
    }
    for (const habit of this.habits) {
      if (trigger.includes(habit.trigger) || habit.trigger.includes(trigger)) {
        const result = habit.check(inventory);
        if (result) return result;
      }
    }
    return null;
  }

  getFirableTriggers(inventory: { item: string; count: number }[]): string[] {
    return this.habits
      .filter(h => h.check(inventory) !== null)
      .map(h => h.trigger);
  }

  getAllTriggers(): string[] {
    return this.habits.map(h => h.trigger);
  }
}
