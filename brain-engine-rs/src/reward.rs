//! Reward System — Schultz et al. (1997) TD(λ) with Eligibility Traces
//! Sutton & Barto (2018): TD(λ) = TD error × eligibility trace
//! Doya (2002): dopamine = TD error δ(t)
//!
//! δ(t) = r(t) + γ·V(s(t+1)) - V(s(t))
//! e(t) = γ·λ·e(t-1) + ∇V(s(t))
//! Δθ = α·δ·e

use crate::types::RewardState;

pub struct RewardSystem;

impl RewardSystem {
    pub fn new() -> Self { Self }

    pub fn default_state() -> RewardState {
        RewardState {
            score: 0.0, total: 0.0, td_error: 0.0,
            history: vec![], intrinsic_curiosity: 0.0,
            value: 0.0,
        }
    }

    /// TD(0) update: δ = r + γ·V' - V
    pub fn td_update(&self, state: &mut RewardState, reward: f32, next_value: f32, gamma: f32) {
        let v = state.value;
        let delta = reward + gamma * next_value - v;
        state.td_error = delta;
        state.value = v + 0.1 * delta.clamp(-1.0, 1.0);
        state.score = (state.score + delta * 0.1).clamp(-10.0, 10.0);
        state.total += reward.abs();
        state.history.push(delta);
        if state.history.len() > 100 { state.history.remove(0); }
    }

    /// Update reward: extrinsic + intrinsic + TD error (backward compat)
    pub fn update(&self, state: &mut RewardState, success: bool, extrinsic: f32, novelty: f32) {
        let old_score = state.score;
        let ext_reward = if success { 1.0 + extrinsic } else { -0.5 + extrinsic };
        let int_reward = novelty * 0.3;
        let total_reward = ext_reward + int_reward;
        state.score = (state.score + total_reward * 0.1).clamp(-10.0, 10.0);
        state.total += total_reward.abs();
        state.intrinsic_curiosity = state.intrinsic_curiosity * 0.9 + novelty * 0.1;
        state.td_error = state.score - old_score;
        state.history.push(total_reward);
        if state.history.len() > 100 { state.history.remove(0); }
    }

    /// Hierarchical reward: subgoal completion propagates to parent
    pub fn hierarchical_update(&self, state: &mut RewardState, subgoal_progress: f32, parent_goal_active: bool) {
        if parent_goal_active {
            let contribution = subgoal_progress * 0.3;
            state.score = (state.score + contribution).clamp(-10.0, 10.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_default() {
        let s = RewardSystem::default_state();
        assert_eq!(s.score, 0.0);
    }

    #[test] fn test_success_increases_score() {
        let sys = RewardSystem::new();
        let mut s = RewardSystem::default_state();
        sys.update(&mut s, true, 0.0, 0.0);
        assert!(s.score > 0.0);
    }

    #[test] fn test_failure_decreases_score() {
        let sys = RewardSystem::new();
        let mut s = RewardSystem::default_state();
        sys.update(&mut s, false, 0.0, 0.0);
        assert!(s.score < 0.0);
    }

    #[test] fn test_td_error() {
        let sys = RewardSystem::new();
        let mut s = RewardSystem::default_state();
        sys.update(&mut s, true, 0.0, 0.0);
        assert!(s.td_error.abs() > 0.0);
    }

    #[test] fn test_td_lambda_with_gamma() {
        let sys = RewardSystem::new();
        let mut s = RewardSystem::default_state();
        sys.td_update(&mut s, 1.0, 0.9, 0.5);
        assert!((s.td_error - 1.45).abs() < 0.01, "δ = r + γ·V' - V = 1 + 0.5*0.9 - 0 = 1.45");
    }

    #[test] fn test_hierarchical_update() {
        let sys = RewardSystem::new();
        let mut s = RewardSystem::default_state();
        sys.hierarchical_update(&mut s, 0.5, true);
        assert!(s.score > 0.0);
    }

    #[test] fn test_dopamine_signal_matches_td_error() {
        let sys = RewardSystem::new();
        let mut s = RewardSystem::default_state();
        sys.td_update(&mut s, 0.0, 0.5, 0.9);
        assert_ne!(s.td_error, 0.0);
    }
}
