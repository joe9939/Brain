// WaveIntegrator — bridges WaveTriggerMapper + MaslowWaveSystem
// One update() call per tick: snapshot → deltas → apply → tick → ready

import { WorldSnapshot } from '../../../world-interface/types.js';
import { MaslowWaveSystem } from './maslow-wave.js';
import { WaveTriggerMapper } from './wave-trigger-mapper.js';

export class WaveIntegrator {
  readonly wave: MaslowWaveSystem;
  readonly mapper: WaveTriggerMapper;
  private prevSnapshot: WorldSnapshot | null = null;

  constructor() {
    this.wave = new MaslowWaveSystem();
    this.mapper = new WaveTriggerMapper();
  }

  /** One tick: compute deltas from snapshot diff, apply, then evolve wave */
  update(snapshot: WorldSnapshot): void {
    if (this.prevSnapshot !== null) {
      const deltas = this.mapper.computeDeltas(this.prevSnapshot, snapshot);
      for (const [levelStr, delta] of Object.entries(deltas)) {
        const level = Number(levelStr) as 1|2|3|4|5;
        this.wave.applyDelta(level, delta);
      }
    }

    // Compute movement and tech stage for curiosity dynamics
    const moved = this.prevSnapshot !== null && (
      snapshot.position.x !== this.prevSnapshot.position.x ||
      snapshot.position.z !== this.prevSnapshot.position.z
    );
    const inv = snapshot.inventory || [];
    const techStage = inv.some(i => i.item.includes('stone_pickaxe') || i.item.includes('iron_pickaxe') || i.item.includes('stone_axe') || i.item.includes('iron_sword')) ? 3
      : inv.some(i => i.item === 'crafting_table' || i.item.includes('planks') || i.item.includes('stick')) ? 2
      : inv.some(i => i.item.includes('log') && !i.item.includes('_block') && !i.item.includes('stone')) ? 1
      : 0;

    this.wave.tick({ moved, techStage });
    this.prevSnapshot = snapshot;
  }

  /** Delegate: wave dominant need */
  getDominant(): ReturnType<MaslowWaveSystem['getDominant']> {
    return this.wave.getDominant();
  }

  /** Read current wave intensity for a need level */
  getWaveState(level: 1|2|3|4|5): number {
    return this.wave.state[level];
  }

  /** Delegate: set hormone modulators on the underlying wave system */
  setHormoneModulators(mods: { adrenaline?: number; cortisol?: number; dopamine?: number }): void {
    this.wave.setHormoneModulators(mods);
  }

  /**
   * Select best action from current wave intensities.
   * Each need level × weight → score. Highest score wins → mapped to action.
   * This runs every tick, enabling continuous motivation-driven behavior.
   */
  selectAction(): { action: string; reason: string; score: number } | null {
    const levelScores: [level: number, score: number, label: string][] = [
      [1, this.wave.state[1] * 5, 'hunger'],
      [2, this.wave.state[2] * 4, 'safety'],
      [3, this.wave.state[3] * 3, 'social'],
      [4, this.wave.state[4] * 2, 'mastery'],
      [5, this.wave.state[5] * 1, 'curiosity'],
    ];

    let best: (typeof levelScores)[0] | null = null;
    for (const entry of levelScores) {
      if (!best || entry[1] > best[1]) best = entry;
    }

    if (!best || best[1] <= 0) return null;

    const [level, score, label] = best;
    const action = ([
      'seek_food',
      'move_to_surface',
      'follow_player',
      'craft_tool',
      'wander',
    ] as const)[level - 1];

    return { action, reason: `${label}_L${level}=${this.wave.state[level as 1|2|3|4|5].toFixed(2)}`, score };
  }
}
