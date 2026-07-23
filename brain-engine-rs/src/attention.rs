//! Attention System — Itti & Koch (2001) Saliency Map
//! Corbetta & Shulman (2002): dorsal (goal) vs ventral (stimulus)
//! Desimone & Duncan (1995): biased competition
//!
//! Bottom-up: saliency from surprise + threat + novelty
//! Top-down: bias from cognitive goals
//! Winner = biased competition

use std::collections::HashMap;
use crate::types::AttentionState;

pub struct AttentionEngine;

impl AttentionEngine {
    pub fn new() -> Self { Self }

    /// Compute bottom-up saliency from environment signals
    pub fn compute_saliency(surprise: f32, threat_count: u32, novelty: f32) -> HashMap<String, f32> {
        let mut map = HashMap::new();
        map.insert("survival".into(), surprise * 1.5);
        map.insert("threat".into(), (threat_count as f32) * 0.3);
        map.insert("novelty".into(), novelty * 0.8);
        map.insert("explore".into(), 0.2);
        map
    }

    /// Biased competition: saliency × (1 + top_down_bias)
    pub fn biased_competition(
        saliency: &HashMap<String, f32>,
        top_down_bias: &HashMap<String, f32>,
        surprise: f32,
        dominant_need: Option<(usize, f32)>,
    ) -> (String, f32) {
        let mut best_focus = "explore".to_string();
        let mut best_score = 0.0f32;

        let mut all_items: Vec<&str> = saliency.keys().map(|k| k.as_str()).collect();
        // Add dominant need as candidate
        if let Some((idx, _)) = dominant_need {
            let need = match idx { 0 => "survival", 1 => "safety", 3 => "achievement", 4 => "explore", _ => "explore" };
            if !all_items.contains(&need) { all_items.push(need); }
        }

        for item in all_items {
            let s = saliency.get(item).copied().unwrap_or(0.1);
            let bias = top_down_bias.get(item).copied().unwrap_or(0.0);
            // Top-down bias has bigger effect when surprise is low (calm = can follow goals)
            let effective_bias = if surprise < 0.3 { bias * 0.5 } else { bias * 0.2 };
            let score = s * (1.0 + effective_bias) + if surprise > 0.5 { 0.3 } else { 0.0 };

            if score > best_score {
                best_score = score;
                best_focus = item.to_string();
            }
        }
        (best_focus, best_score.min(1.0))
    }

    /// Full attention update
    pub fn update(
        &self,
        state: &mut AttentionState,
        surprise: f32,
        dominant_need: Option<(usize, f32)>,
    ) {
        let threat_count = 0; // simplified: caller should inject
        let novelty = surprise * 0.5;

        state.saliency_map = Self::compute_saliency(surprise, threat_count, novelty);
        let (focus, intensity) = Self::biased_competition(
            &state.saliency_map, &state.top_down_bias, surprise, dominant_need,
        );
        state.focus = focus;
        state.intensity = intensity;
        state.source = if surprise > 0.3 { "stimulus".to_string() } else { "goal".to_string() };
    }

    /// Set top-down bias from cognitive layer
    pub fn set_top_down_bias(state: &mut AttentionState, focus: &str, bias: f32) {
        state.top_down_bias.insert(focus.to_string(), bias.clamp(0.0, 1.0));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_surprise_drives_attention() {
        let engine = AttentionEngine::new();
        let mut state = AttentionState::default();
        engine.update(&mut state, 0.8, Some((3, 0.5)));
        assert!(state.intensity > 0.3, "High surprise → high attention");
    }

    #[test] fn test_biased_competition() {
        let saliency = HashMap::from([("survival".into(), 0.9f32), ("explore".into(), 0.2f32)]);
        let bias = HashMap::new();
        let (focus, _) = AttentionEngine::biased_competition(&saliency, &bias, 0.5, None);
        assert_eq!(focus, "survival", "Higher saliency should win");
    }

    #[test] fn test_top_down_bias() {
        let mut state = AttentionState::default();
        AttentionEngine::set_top_down_bias(&mut state, "explore", 0.8);
        assert!((state.top_down_bias.get("explore").unwrap() - 0.8).abs() < 0.01);
    }
}
