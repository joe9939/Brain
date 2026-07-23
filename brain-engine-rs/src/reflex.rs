//! Reflex Arc — Sherrington (1906) Spinal Reflex Hierarchy
//! Prochazka et al. (2000): descending modulation of spinal reflexes
//! Brown (1911): central pattern generators (CPGs)
//!
//! Pathways: monosynaptic (Ia) → polysynaptic flexion → crossed extension
//! Modulation: presynaptic inhibition from cognitive + 5-HT

use crate::types::*;
use std::collections::HashMap;

#[derive(Clone, Debug)]
pub enum ReflexPathway { Monosynaptic, PolysynapticFlexion, CrossedExtension }

#[derive(Clone, Debug)]
pub struct Reflex {
    pub priority: u32,
    pub name: &'static str,
    pub pathway: ReflexPathway,
    pub check: fn(snapshot: &WorldSnapshot, hormone: &HormoneState) -> Option<Action>,
}

pub struct ReflexRegistry {
    pub reflexes: Vec<Reflex>,
    pub cognitive_suppress: bool,
    pub presynaptic_inhibition: f32,
}

impl ReflexRegistry {
    pub fn new() -> Self {
        Self {
            reflexes: vec![
                Reflex { priority: 100, name: "flee_health", pathway: ReflexPathway::PolysynapticFlexion, check: |s, h| {
                    let threshold = 5.0 * (1.0 - h.adrenaline * 0.3);
                    if s.health < threshold { Some(Action { action_type: "flee".into(), params: HashMap::new() }) } else { None }
                }},
                Reflex { priority: 90, name: "flee_fire", pathway: ReflexPathway::CrossedExtension, check: |s, _| {
                    if s.on_fire || s.in_lava { Some(Action { action_type: "flee_emergency".into(), params: HashMap::new() }) } else { None }
                }},
                Reflex { priority: 80, name: "eat_urgent", pathway: ReflexPathway::Monosynaptic, check: |s, h| {
                    let threshold = 3.0 * (1.0 - h.cortisol * 0.2);
                    if s.hunger <= threshold { Some(Action { action_type: "eat_urgent".into(), params: HashMap::new() }) } else { None }
                }},
            ],
            cognitive_suppress: false,
            presynaptic_inhibition: 0.0,
        }
    }

    /// Check reflexes in priority order. Presynaptic inhibition can block transmission.
    pub fn check(&self, snapshot: &WorldSnapshot, hormone: &HormoneState, serotonin: f32) -> Option<Action> {
        let suppress_threshold = (100.0 - serotonin * 20.0) as u32;

        for reflex in &self.reflexes {
            // Cognitive suppress: skip low-priority when cognitive is in control
            if self.cognitive_suppress && reflex.priority < suppress_threshold {
                continue;
            }
            // Presynaptic inhibition: 5-HT modulates reflex gain
            let inhibition = self.presynaptic_inhibition.max(1.0 - serotonin * 0.5);
            if inhibition > 0.8 && reflex.priority < 90 {
                continue;
            }
            if let Some(action) = (reflex.check)(snapshot, hormone) {
                return Some(action);
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers;

    fn default_registry() -> ReflexRegistry { ReflexRegistry::new() }

    #[test] fn test_flee_at_low_health() {
        let reg = default_registry();
        let h = HormoneState::default();
        let mut snap = test_helpers::basic_snapshot(); snap.health = 3.0;
        assert!(reg.check(&snap, &h, 0.5).is_some());
    }

    #[test] fn test_no_reflex_at_high_health() {
        let reg = default_registry();
        let h = HormoneState::default();
        let snap = test_helpers::basic_snapshot();
        assert!(reg.check(&snap, &h, 0.5).is_none());
    }

    #[test] fn test_adrenaline_lowers_threshold() {
        let reg = default_registry();
        let h = HormoneState { adrenaline: 0.9, ..Default::default() };
        let mut snap = test_helpers::basic_snapshot(); snap.health = 3.0;
        assert!(reg.check(&snap, &h, 0.5).is_some());
    }

    #[test] fn test_fire_triggers_emergency() {
        let reg = default_registry();
        let h = HormoneState::default();
        let mut snap = test_helpers::basic_snapshot(); snap.on_fire = true;
        assert!(reg.check(&snap, &h, 0.5).is_some());
    }

    #[test] fn test_hunger_reflex() {
        let reg = default_registry();
        let h = HormoneState::default();
        let mut snap = test_helpers::basic_snapshot(); snap.hunger = 2.0;
        assert!(reg.check(&snap, &h, 0.5).is_some());
    }

    #[test] fn test_cognitive_suppress_blocks_eat_urgent() {
        let mut reg = default_registry();
        let h = HormoneState::default();
        let mut snap = test_helpers::basic_snapshot(); snap.hunger = 2.0;
        reg.cognitive_suppress = true;
        assert!(reg.check(&snap, &h, 0.5).is_none());
    }

    #[test] fn test_cognitive_suppress_allows_high_priority() {
        let mut reg = default_registry();
        let h = HormoneState::default();
        let mut snap = test_helpers::basic_snapshot(); snap.health = 3.0;
        reg.cognitive_suppress = true;
        assert!(reg.check(&snap, &h, 0.5).is_some());
    }

    #[test] fn test_presynaptic_inhibition_blocks() {
        let mut reg = default_registry();
        let h = HormoneState::default();
        let mut snap = test_helpers::basic_snapshot(); snap.hunger = 2.0;
        reg.presynaptic_inhibition = 0.9;
        // High presynaptic inhibition should block eat_urgent (priority 80)
        assert!(reg.check(&snap, &h, 0.5).is_none());
    }
}
