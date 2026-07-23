// World Model â€?Â§2.3: Codebase dependency graph + predictions
// M^wm â€?internal representation of environment dynamics

import { WorldModelState, MentalState } from './types.js';

export class WorldModel {
  static default(): WorldModelState {
    return { lastScan: 0, changedFiles: [], codebaseDigest: '', predictions: new Map() };
  }

  update(state: MentalState, changedFiles: string[]): void {
    state.wm.changedFiles = [...new Set([...state.wm.changedFiles, ...changedFiles])].slice(-50);
    state.wm.lastScan = Date.now();
  }

  predictImpact(state: MentalState, file: string): string[] {
    // Simplified: predict which files might be affected
    const predictions: string[] = [];
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      predictions.push(file.replace('.ts', '.test.ts'), file.replace('.tsx', '.test.tsx'));
    }
    state.wm.predictions.set(file, Date.now());
    return predictions;
  }
}
