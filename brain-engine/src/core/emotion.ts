// Emotion Engine �?§2.5: Emotion modeling
// M^emo = {mode, intensity, valence, arousal, dominance}
// Emotion influences signal priorities and behavior

import { EmotionState } from './types.js';

export interface HormoneModulator {
  adrenaline: number;
  cortisol: number;
  endorphin: number;
}

export class EmotionEngine {
  // Default baseline emotion
  static default(): EmotionState {
    return { mode: 'NORMAL', intensity: 0.1, valence: 0.1, arousal: 0.3, dominance: 0.5 };
  }

  // Update emotion based on input analysis, optionally modulated by hormones
  update(state: EmotionState, input: string, hormone?: HormoneModulator): EmotionState {
    const urgency = this.detectUrgency(input);
    const caution = this.detectCaution(input);
    const support = this.detectSupport(input);

    if (caution) {
      return { ...state, mode: 'CAUTION', intensity: 0.8, valence: -0.3, arousal: 0.7 };
    }
    if (urgency) {
      return { ...state, mode: 'URGENT', intensity: 0.9, valence: -0.5, arousal: 0.9 };
    }
    if (support) {
      return { ...state, mode: 'SUPPORT', intensity: 0.6, valence: 0.7, arousal: 0.3 };
    }
    // Decay to normal �?hormone modulated
    const adr = hormone?.adrenaline ?? 0;
    const cort = hormone?.cortisol ?? 0;
    const endo = hormone?.endorphin ?? 0;

    // adrenaline/cortisol slow decay; endorphin accelerates
    const intensityFactor = 0.9 * (1 + adr * 0.4 + cort * 0.2) * (1 - endo * 0.3);
    const arousalFactor = 0.95 * (1 + cort * 0.3) * (1 - endo * 0.2);

    return {
      ...state,
      mode: 'NORMAL',
      intensity: Math.max(0.05, state.intensity * Math.min(1, intensityFactor)),
      valence: state.valence * 0.95,
      arousal: Math.max(0.05, state.arousal * Math.min(1, arousalFactor)),
    };
  }

  // Mood color for visualizer
  static moodColor(mode: string): string {
    const colors: Record<string, string> = {
      NORMAL: '#4CAF50', CAUTION: '#FF9800',
      URGENT: '#F44336', EXPLORE: '#2196F3', SUPPORT: '#00BCD4',
    };
    return colors[mode] || '#4CAF50';
  }

  private detectUrgency(text: string): boolean {
    const patterns = [/urgent|紧急|asap|immediately|right now|赶快|立刻/i];
    return patterns.some(p => p.test(text));
  }

  private detectCaution(text: string): boolean {
    const patterns = [/danger|危险|安全|secure|block|prevent|恶意|病毒|rm\s+-rf/i];
    return patterns.some(p => p.test(text));
  }

  private detectSupport(text: string): boolean {
    const patterns = [/help|帮助|support|fix|broken|坏了|出错/i];
    return patterns.some(p => p.test(text));
  }
}
