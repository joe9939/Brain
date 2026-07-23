//! Default Mode Network (P3)
//! Raichle et al. (2001): default mode of brain function
//! Buckner et al. (2008): DMN for autobiographical recall, counterfactual thinking
//!
//! TDD: tests first.

use crate::types::EmotionState;
use crate::memory::MemNode;

pub struct DefaultModeNetwork {
    pub active: bool,
    pub autobiographical_recall: Vec<MemNode>,
    pub identity_consolidation: f32,
}

impl DefaultModeNetwork {
    pub fn new() -> Self {
        Self { active: false, autobiographical_recall: vec![], identity_consolidation: 0.0 }
    }

    /// Check if DMN should activate (low surprise, low urgency, no threats)
    pub fn should_activate(&self, surprise: f32, emotion: &EmotionState) -> bool {
        surprise < 0.05 && emotion.intensity < 0.3 && emotion.arousal < 0.4
    }
}

// ══════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{EmotionState, EmotionMode};

    fn calm_emotion() -> EmotionState {
        EmotionState { mode: EmotionMode::Normal, intensity: 0.1, valence: 0.0, arousal: 0.2, dominance: 0.5, timestamp: 0.0, ..Default::default() }
    }

    fn stressed_emotion() -> EmotionState {
        EmotionState { mode: EmotionMode::Urgent, intensity: 0.8, valence: -0.5, arousal: 0.7, dominance: 0.3, timestamp: 0.0, ..Default::default() }
    }

    #[test]
    fn test_activates_when_calm() {
        let dmn = DefaultModeNetwork::new();
        assert!(dmn.should_activate(0.01, &calm_emotion()));
    }

    #[test]
    fn test_stays_inactive_when_stressed() {
        let dmn = DefaultModeNetwork::new();
        assert!(!dmn.should_activate(0.5, &stressed_emotion()));
    }
}
