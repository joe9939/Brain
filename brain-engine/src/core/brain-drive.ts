// Drive System — Maslow-inspired motivational engine
// Aggregates component-level needs into unified drive state per tick.
// Each drive (hunger/fear/fatigue/curiosity/social/mastery) is 0-1.

import { WorldSnapshot } from '../../../world-interface/types.js';
import { ComponentOutput, DriveState } from './types.js';

export interface DriveGoal {
  action: string;
  priority: number;  // 5=highest (physiological), 1=lowest (self-actualization)
  reason: string;
  blockType?: string;
}

export class DriveSystem {
  state: DriveState = {
    hunger: 0,
    fear: 0,
    fatigue: 0,
    curiosity: 0,
    social: 0,
    mastery: 0,
  };

  private currentGoal: DriveGoal | null = null;
  private boredomTicks = 0;
  private prevHunger = 20;
  private masteryGoal: string | null = null;

  /**
   * Tick: evaluate needs from a world snapshot and return a drive goal.
   * Uses Maslow hierarchy: L1 (physiological) → L2 (safety) → L4 (mastery) → L5 (curiosity).
   */
  tick(snapshot: WorldSnapshot): DriveGoal | null {
    const inv = snapshot.inventory || [];
    const hasTools = inv.some(i => i.item.includes('pickaxe') || i.item.includes('axe') || i.item.includes('sword'));
    const hasIron = inv.some(i => i.item.includes('iron_ingot') || i.item.includes('diamond'));
    const hunger = snapshot.hunger ?? 20;
    const health = snapshot.health ?? 20;
    const atNight = snapshot.timeOfDay > 13000 || snapshot.timeOfDay < 500;
    const isHungry = hunger < 17;
    const isLowHealth = health < 10;

    // L1: Physiological — hunger and health
    if (isHungry) {
      this.boredomTicks = 0;
      const hasFood = inv.some(i => ['bread','apple','cooked_beef','cooked_porkchop','beef','porkchop','chicken','potato','carrot'].includes(i.item));
      this.currentGoal = {
        action: hasFood ? 'eat' : 'seek_food',
        priority: 5,
        reason: `hunger_${hunger}`,
      };
      return this.currentGoal;
    }

    if (isLowHealth) {
      this.boredomTicks = 0;
      this.currentGoal = {
        action: 'seek_healing',
        priority: 4,
        reason: `health_${health}`,
      };
      return this.currentGoal;
    }

    // L2: Safety — night or hostiles
    if (atNight) {
      this.boredomTicks = 0;
      this.currentGoal = {
        action: 'seek_shelter',
        priority: 3,
        reason: `night_${snapshot.timeOfDay}`,
      };
      return this.currentGoal;
    }

    // L4: Mastery — resource upgrades
    if (hasIron && !hasTools) {
      this.boredomTicks = 0;
      this.currentGoal = {
        action: 'upgrade_tools',
        priority: 2,
        reason: 'has_iron',
      };
      return this.currentGoal;
    }

    // Boredom: accumulate idle ticks, then explore
    this.boredomTicks++;
    if (this.boredomTicks > 10) {
      this.currentGoal = {
        action: 'wander',
        priority: 1,
        reason: `bored_${this.boredomTicks}`,
      };
    } else {
      // Default: gather resources
      this.currentGoal = {
        action: 'gather',
        priority: 1,
        reason: 'initial_gather',
      };
    }

    return this.currentGoal;
  }

  /** Returns the most recent goal or null if no tick has been made. */
  getCurrentGoal(): DriveGoal | null {
    return this.currentGoal;
  }

  /**
   * Aggregates needs from component outputs into unified DriveState.
   * Called after each circuit stage completes (via onStageComplete in brain-engine.ts).
   * Maps: amygdala/fear → fear, safety → fear, exploration → curiosity,
   * reward → mastery, energy → fatigue, social → social, hunger → hunger.
   */
  updateFromComponents(outputs: Map<string, ComponentOutput>): void {
    // Derive needs from component signals and explicit needs output
    for (const [id, out] of outputs) {
      // Direct needs from component (component explicitly declares its needs)
      if (out.needs) {
        if (out.needs[1]) this.state.hunger = Math.max(this.state.hunger, out.needs[1]);
        if (out.needs[2]) this.state.fear = Math.max(this.state.fear, out.needs[2]);
        if (out.needs[3]) this.state.social = Math.max(this.state.social, out.needs[3]);
        if (out.needs[4]) this.state.mastery = Math.max(this.state.mastery, out.needs[4]);
        if (out.needs[5]) this.state.curiosity = Math.max(this.state.curiosity, out.needs[5]);
      }

      // Map component signals to drives by component id / signal key conventions
      if (id === 'amygdala' && out.signals.emotion) {
        this.state.fear = Math.max(this.state.fear, out.signals.emotion * 0.6);
      }
      if (id === 'safety' && out.signals.safety) {
        this.state.fear = Math.max(this.state.fear, out.signals.safety * 0.5);
      }
      if (id === 'hypothalamus' && out.signals.hunger) {
        this.state.hunger = Math.max(this.state.hunger, out.signals.hunger);
      }
      if (out.signals.hunger !== undefined && id === 'hypothalamus') {
        this.state.hunger = Math.max(this.state.hunger, out.signals.hunger);
      }
      if (out.signals.curiosity) {
        this.state.curiosity = Math.max(this.state.curiosity, out.signals.curiosity);
      }
      if (out.signals.mastery) {
        this.state.mastery = Math.max(this.state.mastery, out.signals.mastery);
      }
      if (out.signals.fatigue) {
        this.state.fatigue = Math.max(this.state.fatigue, out.signals.fatigue);
      }
      if (id === 'social' && out.signals.social !== undefined) {
        this.state.social = Math.max(this.state.social, out.signals.social);
      }
    }

    // Clamp all drives to [0, 1]
    for (const key of Object.keys(this.state) as (keyof DriveState)[]) {
      this.state[key] = Math.max(0, Math.min(1, this.state[key]));
    }
  }

  /**
   * Emergent dominant drive — the one with highest intensity.
   * Used when a single drive direction is needed for quick decisions.
   */
  getDominantDrive(): { name: keyof DriveState; intensity: number } | null {
    let max = 0;
    let dominant: keyof DriveState | null = null;
    for (const [key, val] of Object.entries(this.state)) {
      if (val > max) { max = val; dominant = key as keyof DriveState; }
    }
    return dominant && max > 0 ? { name: dominant, intensity: max } : null;
  }
}
