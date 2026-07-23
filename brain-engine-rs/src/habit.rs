//! Habit System — Daw et al. (2005) Goal-Directed vs Habitual Control
//! Graybiel (2008): habits are action chunks in basal ganglia
//! Yin & Knowlton (2006): dorsolateral striatum mediates habit formation
//!
//! Uncertainty high → goal-directed (PFC)
//! Uncertainty low → habitual (striatum)

use std::collections::HashMap;
use crate::types::Action;
use crate::types::WaveState;

#[derive(Clone, Debug)]
pub struct ActionChunk {
    pub id: String,
    pub trigger: String,
    pub action: Action,
    pub frequency: u32,
    pub success_rate: f32,
    pub chunk_size: u32,
}

#[derive(Clone, Debug, PartialEq)]
pub enum ControlMode { GoalDirected, Habitual }

pub struct HabitLayer {
    pub habits: Vec<ActionChunk>,
    pub control_mode: ControlMode,
    pub uncertainty: f32,
}

impl HabitLayer {
    pub fn new() -> Self {
        Self { habits: vec![], control_mode: ControlMode::GoalDirected, uncertainty: 0.8 }
    }

    /// Match habit by state description
    pub fn match_habit(&self, state_desc: &str) -> Option<&ActionChunk> {
        let desc_lower = state_desc.to_lowercase();
        // First try high-confidence habits
        if let Some(h) = self.habits.iter()
            .filter(|h| h.success_rate > 0.3)
            .find(|h| desc_lower.contains(&h.trigger))
        { return Some(h); }
        // Fallback: any habit that matches
        self.habits.iter().find(|h| desc_lower.contains(&h.trigger))
    }

    /// Add a new habit chunk
    pub fn add(&mut self, id: &str, trigger: &str, action: Action) {
        if let Some(existing) = self.habits.iter_mut().find(|h| h.id == id) {
            existing.frequency += 1;
            existing.trigger = trigger.to_string();
        } else {
            self.habits.push(ActionChunk {
                id: id.to_string(), trigger: trigger.to_string(),
                action, frequency: 1, success_rate: 0.5, chunk_size: 1,
            });
        }
    }

    /// Update control mode based on uncertainty (Daw 2005)
    pub fn update_control_mode(&mut self, reward_surprise: f32) {
        if reward_surprise > 0.3 {
            self.control_mode = ControlMode::GoalDirected;
            self.uncertainty = 0.8;
        } else {
            self.uncertainty *= 0.995;
            if self.uncertainty < 0.15 {
                self.control_mode = ControlMode::Habitual;
            }
        }
    }

    /// Record outcome and update success rate
    pub fn record_outcome(&mut self, trigger: &str, success: bool) {
        for h in self.habits.iter_mut() {
            if h.trigger == trigger || h.id == trigger {
                let total = h.frequency as f32;
                let delta: f32 = if success { 1.0 } else { 0.0 };
                h.success_rate = (h.success_rate * total + delta) / (total + 1.0);
                h.frequency += 1;
            }
        }
    }

    /// Auto-propose habit from wave state levels
    pub fn auto_propose(&mut self, state: &WaveState) -> Option<String> {
        let dominant = state.iter().enumerate().max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap());
        if let Some((level, _)) = dominant {
            let action_type = match level {
                0 => "find_food", 1 => "ensure_safety",
                2 => "socialize", 3 => "find_wood",
                _ => "explore",
            };
            let id = format!("auto_{}_{}", action_type, self.habits.len());
            if !self.habits.iter().any(|h| h.id == id) {
                self.habits.push(ActionChunk {
                    id, trigger: format!("dominant_{}", level),
                    action: Action { action_type: action_type.into(), params: HashMap::new() },
                    frequency: 1, success_rate: 0.5, chunk_size: 1,
                });
                return Some(action_type.to_string());
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::HormoneState;

    #[test] fn test_add_and_match() {
        let mut h = HabitLayer::new();
        h.add("test", "hunger", Action { action_type: "eat".into(), params: HashMap::new() });
        h.record_outcome("test", true);
        h.record_outcome("test", true);
        h.record_outcome("test", true);
        assert!(h.match_habit("hunger high").is_some());
    }

    #[test] fn test_no_match() {
        let h = HabitLayer::new();
        assert!(h.match_habit("unknown").is_none());
    }

    #[test] fn test_auto_propose_creates_habit() {
        let mut h = HabitLayer::new();
        let wave_state: WaveState = [0.8, 0.2, 0.1, 0.0, 0.0];
        h.auto_propose(&wave_state);
        assert!(!h.habits.is_empty(), "Should auto-propose a habit from wave state");
    }

    #[test] fn test_daw_competition() {
        let mut h = HabitLayer::new();
        assert_eq!(h.control_mode, ControlMode::GoalDirected);
        // High uncertainty → stays goal-directed
        h.update_control_mode(0.5);
        assert_eq!(h.control_mode, ControlMode::GoalDirected);
        // Low reward surprise for many iterations → switches to habitual
        for _ in 0..2000 { h.update_control_mode(0.0); }
        assert_eq!(h.control_mode, ControlMode::Habitual);
    }

    #[test] fn test_success_rate_increases() {
        let mut h = HabitLayer::new();
        h.add("test", "hunger", Action { action_type: "eat".into(), params: HashMap::new() });
        h.record_outcome("test", true);
        let rate_before = h.habits[0].success_rate;
        h.record_outcome("test", true);
        assert!(h.habits[0].success_rate > rate_before);
    }
}
