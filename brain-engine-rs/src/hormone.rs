//! Hormone System — Sapolsky (2015) Allostatic Load Model
//! McEwen (2007): chronic stress → allostatic load → receptor desensitization
//!
//! 6 hormones: adrenaline, cortisol, endorphin, dopamine, serotonin, oxytocin
//! Allostatic load: cumulative wear from chronic stress

use crate::types::{HormoneState, EmotionState, EmotionMode, RewardState};

pub struct HormoneSystem;

impl HormoneSystem {
    pub fn new() -> Self { Self }

    /// Main tick: decay + update from emotion + allostatic load
    pub fn tick(&self, state: &mut HormoneState, emotion: &EmotionState, reward: &RewardState) {
        // Decay all hormones
        state.adrenaline *= 0.90;
        state.cortisol *= 0.95;
        state.endorphin *= 0.92;
        state.oxytocin *= 0.97;

        // Emotion-driven hormone release
        match emotion.mode {
            EmotionMode::Urgent => state.adrenaline = (state.adrenaline + 0.3).min(1.0),
            EmotionMode::Caution => state.cortisol = (state.cortisol + 0.1).min(1.0),
            EmotionMode::Support => state.oxytocin = (state.oxytocin + 0.2).min(1.0),
            _ => {}
        }

        // Reward-driven dopamine
        if reward.td_error.abs() > 0.1 {
            state.dopamine = (state.dopamine + reward.td_error * 0.2).clamp(0.0, 1.0);
        }

        // Allostatic load: chronic cortisol elevation → baseline drift
        let cortisol_avg = state.cortisol;
        state.cortisol_baseline += (cortisol_avg - state.cortisol_baseline) * 0.001;

        if state.cortisol > state.cortisol_baseline * 1.3 {
            state.allostatic_load = (state.allostatic_load + 0.005).min(1.0);
        } else {
            state.allostatic_load *= 0.998;
        }

        // Receptor sensitivity decreases with allostatic load
        state.receptor_sensitivity = 1.0 / (1.0 + state.allostatic_load * 2.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base_emotion() -> EmotionState { EmotionState::default() }
    fn base_reward() -> RewardState { RewardState { score: 0.0, total: 0.0, td_error: 0.0, history: vec![], intrinsic_curiosity: 0.0, value: 0.0 } }

    #[test] fn test_hormone_defaults() {
        let h = HormoneState::default();
        assert!((h.dopamine - 0.5).abs() < 0.01);
        assert_eq!(h.allostatic_load, 0.0);
        assert_eq!(h.receptor_sensitivity, 1.0);
    }

    #[test] fn test_urgent_spikes_adrenaline() {
        let sys = HormoneSystem::new();
        let mut h = HormoneState::default();
        let e = EmotionState { mode: EmotionMode::Urgent, ..Default::default() };
        let r = base_reward();
        sys.tick(&mut h, &e, &r);
        assert!(h.adrenaline > 0.0);
    }

    #[test] fn test_allostatic_load_accumulates() {
        let sys = HormoneSystem::new();
        let mut h = HormoneState::default();
        let e = EmotionState { mode: EmotionMode::Caution, intensity: 0.8, arousal: 0.7, ..Default::default() };
        let r = base_reward();
        for _ in 0..100 {
            h.cortisol = h.cortisol.max(0.6);
            sys.tick(&mut h, &e, &r);
        }
        assert!(h.allostatic_load > 0.01, "Chronic stress should accumulate allostatic load");
        assert!(h.receptor_sensitivity < 0.9, "Receptor sensitivity should decrease");
    }
}
