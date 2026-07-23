// WaveTriggerMapper — bridges WorldSnapshot deltas to MaslowWaveSystem.applyDelta
// Each diff between prev/curr snapshot produces one or more need-level deltas

import { WorldSnapshot } from '../../../world-interface/types.js';

export type WaveDeltas = Partial<Record<1|2|3|4|5, number>>;

const HOSTILE_TYPES = ['zombie', 'skeleton', 'creeper', 'spider', 'enderman', 'witch', 'phantom'];

export class WaveTriggerMapper {
  computeDeltas(prev: WorldSnapshot, curr: WorldSnapshot): WaveDeltas {
    const deltas: WaveDeltas = {};

    // ── L1: Physiological — continuous pressure from state gap + spike on change ──
    // 85% threshold: food ≥ 17 → satiated (no hunger pressure)
    // Maslow: "a need does not require 100% satisfaction before higher needs emerge"
    // target = max(0, (17 - hunger) / 17), delta = target × (1 - L1_decay)
    // At food=17: target=0 → L1 decays to 0 (satiated)
    // At food=10: target=0.412 → steady L1≈0.4 (moderate hunger)
    // At food=3:  target=0.824 → steady L1≈0.75 (strong hunger)
    const l1Target = Math.max(0, (17 - (curr.hunger ?? 20)) / 17);
    const l1Delta = l1Target * 0.08;
    deltas[1] = (deltas[1] || 0) + l1Delta;
    // Spike on sharp hunger changes (eating → -delta, starving → +delta)
    const hungerDiff = prev.hunger - curr.hunger;
    if (Math.abs(hungerDiff) >= 3) {
      deltas[1] = (deltas[1] || 0) + hungerDiff * 0.05;
    }
    const healthDiff = prev.health - curr.health;
    if (Math.abs(healthDiff) >= 3) {
      deltas[1] = (deltas[1] || 0) + healthDiff * 0.04;
    }
    if (curr.oxygen !== undefined && curr.oxygen < 5) {
      deltas[1] = (deltas[1] || 0) + 0.3;  // drowning
    }
    if (curr.onFire && !prev.onFire) {
      deltas[1] = (deltas[1] || 0) + 0.5;
    }

    // ── L2: Safety — continuous threat pressure + spike on change ──
    const isNight = curr.timeOfDay > 13000 || curr.timeOfDay < 500;
    const hasHostiles = curr.entities.some(e =>
      HOSTILE_TYPES.some(h => e.type.toLowerCase().includes(h))
    );
    // Night + hostiles = high pressure, nothing = 0
    const l2Base = (isNight ? 0.3 : 0) + (hasHostiles ? 0.5 : 0);
    deltas[2] = (deltas[2] || 0) + l2Base * 0.12;  // 0.12 = 1 - L2_decay
    // Spike on hostile count change
    const prevHostiles = prev.entities.filter(e =>
      HOSTILE_TYPES.some(h => e.type.toLowerCase().includes(h))
    );
    const currHostiles = curr.entities.filter(e =>
      HOSTILE_TYPES.some(h => e.type.toLowerCase().includes(h))
    );
    if (currHostiles.length > prevHostiles.length) {
      deltas[2] = (deltas[2] || 0) + 0.3;
    } else if (currHostiles.length < prevHostiles.length && prevHostiles.length > 0) {
      deltas[2] = (deltas[2] || 0) - 0.2;
    }
    // Spike on night transition
    const wasNight = prev.timeOfDay > 13000 || prev.timeOfDay < 500;
    if (isNight && !wasNight) deltas[2] = (deltas[2] || 0) + 0.3;
    else if (!isNight && wasNight) deltas[2] = (deltas[2] || 0) - 0.25;

    // ── L4: Esteem/mastery — continuous pressure for improvement ──
    // No good tools → pressure, fully equipped → 0
    const bestTool = Math.max(0, ...curr.inventory.map(i =>
      i.item.includes('netherite') ? 5 : i.item.includes('diamond') ? 4 : i.item.includes('iron') ? 3 : i.item.includes('stone') ? 2 : i.item.includes('wood') ? 1 : 0
    ));
    const l4Target = bestTool >= 3 ? 0 : 0.6;
    deltas[4] = (deltas[4] || 0) + l4Target * 0.07;  // 0.07 = 1 - L4_decay

    // ── L5: Curiosity — spike on novelty ──
    if (curr.biome && prev.biome && curr.biome !== prev.biome) deltas[5] = (deltas[5] || 0) + 0.3;
    if (curr.dimension !== prev.dimension) deltas[5] = (deltas[5] || 0) + 0.5;

    return deltas;
  }
}
