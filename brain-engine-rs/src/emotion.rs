//! Constructed Emotion — Barrett (2017) Theory of Constructed Emotion
//! Scherer (2009): Component Process Model
//! Smith & Ellsworth (1985): Appraisal dimensions
//!
//! Emotion = Core Affect (VA) + Concept (label) + Appraisal
//! Core affect from interoception + hormone
//! Concept constructed by cognitive layer (LLM)
//! Appraisal computed from situation evaluation

use crate::types::{EmotionState, EmotionMode, HormoneState, AppraisalDimensions};
use crate::bus::ComponentBus;

pub struct EmotionEngine;

impl EmotionEngine {
    pub fn new() -> Self { Self }

    pub fn default_state() -> EmotionState {
        EmotionState::default()
    }

    /// Update core affect from hormone + interoception signals
    pub fn update(&self, state: &mut EmotionState, _input: &str, hormone: &HormoneState) {
        // Core affect: valence from hormone balance
        let base_valence = 0.0;
        let cortisol_valence = -hormone.cortisol * 0.3;
        let dopamine_valence = (hormone.dopamine - 0.5) * 0.4;
        state.valence = state.valence * 0.90 + (base_valence + cortisol_valence + dopamine_valence) * 0.10;
        state.valence = state.valence.clamp(-1.0, 1.0);

        // Arousal from adrenaline + novelty
        state.arousal = state.arousal * 0.90 + hormone.adrenaline * 0.10;
        state.arousal = state.arousal.clamp(0.0, 1.0);

        // Mode from dominant appraisal
        if hormone.adrenaline > 0.5 { state.mode = EmotionMode::Urgent; }
        else if hormone.cortisol > 0.6 { state.mode = EmotionMode::Caution; }
        else if hormone.dopamine > 0.7 && state.mode != EmotionMode::Urgent { state.mode = EmotionMode::Explore; }
        else if hormone.oxytocin > 0.4 { state.mode = EmotionMode::Support; }
        else { state.mode = EmotionMode::Normal; }

        // Intensity from arousal × valence magnitude
        state.intensity = (state.arousal * 0.6 + state.valence.abs() * 0.4).clamp(0.0, 1.0);
        state.timestamp += 1.0;
    }

    /// Appraisal: compute appraisal dimensions from situation
    pub fn appraise(&self, state: &mut EmotionState, health_delta: f32, threat_count: u32, goal_progress: f32) {
        state.appraisals.pleasantness = (health_delta / 10.0 + goal_progress * 0.5).clamp(-1.0, 1.0);
        state.appraisals.certainty = (1.0 - threat_count as f32 * 0.2).clamp(0.0, 1.0);
        state.appraisals.effort = (state.intensity * 0.5 + state.arousal * 0.3).clamp(0.0, 1.0);
        state.appraisals.control = (1.0 - state.arousal * 0.5).clamp(0.0, 1.0);
        state.appraisals.goal_consistency = goal_progress.clamp(-1.0, 1.0);
    }

    /// Set constructed label (called by cognitive LLM)
    pub fn set_constructed_label(&self, state: &mut EmotionState, label: &str) {
        state.constructed_label = label.to_string();
    }

    /// Cognitive regulation (PFC re-appraisal)
    pub fn cognitive_regulate(&self, state: &mut EmotionState, success: bool) {
        if success {
            state.intensity *= 0.8;
            state.appraisals.control = (state.appraisals.control + 0.1).min(1.0);
            if state.mode == EmotionMode::Urgent || state.mode == EmotionMode::Caution {
                state.mode = EmotionMode::Normal;
            }
        }
    }

    /// v6: Bus mode — read/write ComponentBus
    pub fn tick(&self, bus: &mut ComponentBus) {
        // Read from bus
        let cortisol = bus.cortisol;
        let adrenaline = bus.adrenaline;
        let dopamine = bus.dopamine;
        let cognitive_label = &bus.cognitive_emotion;
        let action = bus.cognitive_action.clone();

        // Core affect from hormone (same math as before, but from bus)
        bus.emo_valence = bus.emo_valence * 0.90 + (-cortisol * 0.3 + (dopamine - 0.5) * 0.4) * 0.10;
        bus.emo_valence = bus.emo_valence.clamp(-1.0, 1.0);
        bus.emo_arousal = bus.emo_arousal * 0.90 + adrenaline * 0.10;
        bus.emo_arousal = bus.emo_arousal.clamp(0.0, 1.0);

        // Cognitive broadcast overrides emotion mode (Barrett concept construction)
        if !cognitive_label.is_empty() {
            bus.emo_label = cognitive_label.clone();
            if cognitive_label.contains("fear") || cognitive_label.contains("anxious") {
                bus.emo_mode = "Caution".into();
            } else if cognitive_label.contains("satisfied") || cognitive_label.contains("happy") {
                bus.emo_mode = "Explore".into();
            } else {
                bus.emo_mode = "Normal".into();
            }
        } else if adrenaline > 0.5 {
            bus.emo_mode = "Urgent".into();
        } else if cortisol > 0.6 {
            bus.emo_mode = "Caution".into();
        } else {
            bus.emo_mode = "Normal".into();
        }

        // Action feedback to emotion
        if let Some(a) = &action {
            if a == "flee" || a == "attack" {
                bus.emo_intensity = (bus.emo_intensity + 0.2).min(1.0);
            }
        }

        bus.emo_intensity = (bus.emo_arousal * 0.6 + bus.emo_valence.abs() * 0.4).clamp(0.0, 1.0);
    }

    /// Detect environment-driven emotion changes
    pub fn detect_from_environment(&self, state: &mut EmotionState, health: f32, health_delta: f32, threat_count: u32) {
        self.appraise(state, health_delta, threat_count, 0.0);
        if threat_count > 0 {
            if health < 5.0 {
                state.mode = EmotionMode::Urgent;
                state.intensity = state.intensity.max(0.8);
            } else if threat_count > 2 {
                state.mode = EmotionMode::Caution;
                state.intensity = state.intensity.max(0.5);
            }
        } else if health_delta > 0.0 && state.mode == EmotionMode::Normal {
            state.mode = EmotionMode::Explore;
            state.valence = state.valence.max(0.3);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_default_state() {
        let s = EmotionEngine::default_state();
        assert_eq!(s.mode, EmotionMode::Normal);
        assert!(s.appraisals.pleasantness.abs() < 0.01);
    }

    #[test] fn test_emotion_decays_over_time() {
        let engine = EmotionEngine::new();
        let mut s = EmotionEngine::default_state();
        s.valence = -0.8; s.arousal = 0.9;
        let h = HormoneState::default();
        for _ in 0..20 { engine.update(&mut s, "", &h); }
        assert!(s.valence > -0.4, "Valence should decay toward neutral");
    }

    #[test] fn test_appraisal_updates() {
        let engine = EmotionEngine::new();
        let mut s = EmotionEngine::default_state();
        engine.appraise(&mut s, -5.0, 0, 0.0);
        assert!(s.appraisals.pleasantness < 0.0, "Health drop → negative pleasantness");
    }

    #[test] fn test_constructed_label() {
        let engine = EmotionEngine::new();
        let mut s = EmotionEngine::default_state();
        engine.set_constructed_label(&mut s, "anxious_about_creeper");
        assert_eq!(s.constructed_label, "anxious_about_creeper");
    }

    #[test] fn test_cognitive_regulate_reduces_intensity() {
        let engine = EmotionEngine::new();
        let mut s = EmotionEngine::default_state();
        s.intensity = 0.8; s.mode = EmotionMode::Urgent;
        engine.cognitive_regulate(&mut s, true);
        assert!(s.intensity < 0.7);
        assert_eq!(s.mode, EmotionMode::Normal);
    }
}
