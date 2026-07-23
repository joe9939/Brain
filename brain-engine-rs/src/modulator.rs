//! Neuromodulator System — Doya (2002) TD Meta-learning
//!
//! DA = TD error δ(t) = r(t) + γ·V(s(t)) - V(s(t-1))
//! 5-HT = discount factor γ = 0.3 + 5HT * 0.6
//! NE = inverse temperature β = 1.0 + NE * 5.0
//! ACh = learning rate α = 0.1 + ACh * 0.4

use crate::types::ModulatorState;

pub struct ModulatorSystem;

impl ModulatorSystem {
    pub fn new() -> Self { Self }

    /// Decay and update metaparameters from state
    pub fn tick(&self, state: &mut ModulatorState) {
        // Update metaparameters from current levels FIRST (Doya 2002 eq. 12-14)
        state.gamma = 0.3 + state.serotonin * 0.6;
        state.beta = 1.0 + state.norepinephrine * 5.0;
        state.alpha = 0.1 + state.acetylcholine * 0.4;

        // Slow decay toward baseline
        state.serotonin += (0.5 - state.serotonin) * 0.01;
        state.norepinephrine *= 0.95;
        state.norepinephrine = state.norepinephrine.max(0.1);
        state.acetylcholine *= 0.95;
    }

    /// Cognitive success → 5-HT up (strengthens long-term planning)
    pub fn cognitive_success(&self, state: &mut ModulatorState) {
        state.serotonin = (state.serotonin + 0.1).min(1.0);
    }

    /// Cognitive failure → 5-HT down (impulsive shift)
    pub fn cognitive_failure(&self, state: &mut ModulatorState) {
        state.serotonin = (state.serotonin - 0.05).max(0.0);
    }

    /// Surprise → NE spike (increases exploration)
    pub fn on_surprise(&self, state: &mut ModulatorState, surprise: f32) {
        state.norepinephrine = (state.norepinephrine + surprise * 0.5).min(1.0);
    }

    /// Novelty → ACh spike (increases learning rate)
    pub fn on_novelty(&self, state: &mut ModulatorState, novelty: f32) {
        state.acetylcholine = (state.acetylcholine + novelty * 0.4).min(1.0);
    }

    /// TD error update from reward system (DA signal)
    pub fn set_td_error(&self, state: &mut ModulatorState, td_error: f32) {
        state.td_error = td_error;
    }

    /// Yerkes-Dodson: optimal NE ≈ 0.6
    pub fn yerkes_dodson_factor(&self, ne: f32) -> f32 {
        if ne < 0.2 { 0.3 }
        else if ne > 0.9 { 0.4 }
        else { 1.0 - (ne - 0.6).powi(2) * 4.0 }
    }

    /// Softmax action selection with inverse temperature β
    pub fn softmax<T, F>(&self, items: &[T], score_fn: F, beta: f32) -> usize
    where F: Fn(&T) -> f32 {
        let scores: Vec<f32> = items.iter().map(score_fn).collect();
        let max_score = scores.iter().cloned().fold(f32::NEG_INFINITY, f32::max);
        let exps: Vec<f32> = scores.iter().map(|s| ((s - max_score) * beta).exp()).collect();
        let sum: f32 = exps.iter().sum();
        let r = rand::random::<f32>() * sum;
        let mut cum = 0.0f32;
        for (i, e) in exps.iter().enumerate() {
            cum += e;
            if r <= cum { return i; }
        }
        items.len() - 1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_baselines() {
        let m = ModulatorState::default();
        assert!((m.serotonin - 0.5).abs() < 0.01);
        assert!((m.gamma - 0.6).abs() < 0.01);
        assert!((m.beta - 2.5).abs() < 0.1);
    }

    #[test] fn test_decay() {
        let sys = ModulatorSystem::new();
        let mut m = ModulatorState { serotonin: 0.8, norepinephrine: 0.9, acetylcholine: 0.9, ..Default::default() };
        for _ in 0..200 { sys.tick(&mut m); }
        assert!((m.serotonin - 0.5).abs() < 0.1);
    }

    #[test] fn test_cognitive_success_raises_serotonin() {
        let sys = ModulatorSystem::new();
        let mut m = ModulatorState::default();
        sys.cognitive_success(&mut m);
        assert!(m.serotonin > 0.5);
    }

    #[test] fn test_metaparameters_update() {
        let sys = ModulatorSystem::new();
        let mut m = ModulatorState { serotonin: 1.0, norepinephrine: 1.0, acetylcholine: 1.0, ..Default::default() };
        sys.tick(&mut m);
        assert!((m.gamma - 0.9).abs() < 0.01, "5HT=1 → γ≈0.9");
        assert!((m.beta - 6.0).abs() < 0.1, "NE=1 → β≈6.0");
        assert!((m.alpha - 0.5).abs() < 0.01, "ACh=1 → α≈0.5");
        // After decay: serotonin should have decreased slightly
        assert!(m.serotonin < 1.0, "Should have decayed");
    }

    #[test] fn test_softmax_exploit() {
        let sys = ModulatorSystem::new();
        let items = vec!["low", "medium", "high"];
        let high_beta = 100.0;
        let picks: Vec<usize> = (0..20).map(|_| sys.softmax(&items, |s| match *s { "high" => 1.0, "medium" => 0.5, _ => 0.0 }, high_beta)).collect();
        let high_count = picks.iter().filter(|&&i| i == 2).count();
        assert!(high_count > 15, "High beta should mostly pick 'high'");
    }
}
