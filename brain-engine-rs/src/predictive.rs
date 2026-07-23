//! Hierarchical Predictive Coding — Friston (2010) Free Energy Principle
//! Rao & Ballard (1999): each layer predicts the layer below
//! Precision-weighted prediction errors flow upward
//!
//! L0 raw → L1 patterns → L2 concepts
//! Free energy = Σ precision_i × error_i²

use crate::types::WorldSnapshot;

#[derive(Clone, Debug)]
pub struct PredictionNode {
    pub expected: f32,
    pub error: f32,
    pub precision: f32,
}

pub struct HierarchicalPredictor {
    pub levels: Vec<Vec<PredictionNode>>,
    pub last_surprise: f32,
    pub initialized: bool,
}

impl HierarchicalPredictor {
    pub fn new() -> Self {
        Self {
            levels: vec![
                vec![PredictionNode { expected: 20.0, error: 0.0, precision: 1.0 }; 3],
                vec![PredictionNode { expected: 0.0, error: 0.0, precision: 0.8 }; 2],
                vec![PredictionNode { expected: 0.0, error: 0.0, precision: 0.5 }; 1],
            ],
            last_surprise: 0.0,
            initialized: false,
        }
    }

    pub fn get_surprise(&self) -> f32 { self.last_surprise }

    /// v6: Bus mode — read world from bus, write surprise
    pub fn bus_tick(&mut self, bus: &mut crate::bus::ComponentBus) {
        let health_pe = (bus.health - self.levels[0][0].expected).abs() / 20.0;
        let hunger_pe = (bus.hunger - self.levels[0][1].expected).abs() / 20.0;
        let threat = bus.threat_count as f32 / 5.0;
        let threat_pe = (threat - self.levels[0][2].expected).abs();

        self.levels[0][0].error = health_pe;
        self.levels[0][1].error = hunger_pe;
        self.levels[0][2].error = threat_pe;

        let total_fe: f32 = self.levels.iter().flat_map(|l| l.iter())
            .map(|n| n.precision * n.error * n.error).sum();
        let surprise = total_fe.min(1.0);
        self.last_surprise = surprise;
        bus.surprise = surprise;

        // Update expectations
        self.levels[0][0].expected = self.levels[0][0].expected * 0.9 + bus.health * 0.1;
        self.levels[0][1].expected = self.levels[0][1].expected * 0.9 + bus.hunger * 0.1;
        self.levels[0][2].expected = self.levels[0][2].expected * 0.9 + threat * 0.1;
    }

    pub fn observe(&mut self, snapshot: &WorldSnapshot) -> f32 {
        if !self.initialized {
            self.levels[0][0].expected = snapshot.health;
            self.levels[0][1].expected = snapshot.hunger;
            // L0[2] = aggregate position + threat
            let threat = snapshot.entities.iter().filter(|e| e.entity_type == "zombie" || e.entity_type == "creeper").count() as f32 / 5.0;
            self.levels[0][2].expected = threat;
            self.initialized = true;
            return 0.0;
        }

        // L0 prediction errors: actual - expected
        let health_pe = (snapshot.health - self.levels[0][0].expected).abs() / 20.0;
        let hunger_pe = (snapshot.hunger - self.levels[0][1].expected).abs() / 20.0;
        let threat = snapshot.entities.iter().filter(|e| e.entity_type == "zombie" || e.entity_type == "creeper").count() as f32 / 5.0;
        let threat_pe = (threat - self.levels[0][2].expected).abs();

        self.levels[0][0].error = health_pe;
        self.levels[0][1].error = hunger_pe;
        self.levels[0][2].error = threat_pe;

        // L1: pattern detection from L0 errors
        let health_pattern = if health_pe > 0.3 { 1.0 } else if health_pe > 0.1 { 0.5 } else { 0.0 };
        let danger_pattern = threat_pe.max(if hunger_pe > 0.3 { 0.5 } else { 0.0 });
        self.levels[1][0].error = (health_pattern - self.levels[1][0].expected).abs();
        self.levels[1][1].error = (danger_pattern - self.levels[1][1].expected).abs();

        // L2: abstract concept (overall free energy)
        let total_fe: f32 = self.levels.iter().flat_map(|l| l.iter())
            .map(|n| n.precision * n.error * n.error)
            .sum();
        self.levels[2][0].error = (total_fe.min(1.0) - self.levels[2][0].expected).abs();

        // Update expectations with exponential smoothing
        self.levels[0][0].expected = self.levels[0][0].expected * 0.9 + snapshot.health * 0.1;
        self.levels[0][1].expected = self.levels[0][1].expected * 0.9 + snapshot.hunger * 0.1;
        self.levels[0][2].expected = self.levels[0][2].expected * 0.9 + threat * 0.1;
        self.levels[1][0].expected = self.levels[1][0].expected * 0.95 + health_pattern * 0.05;
        self.levels[1][1].expected = self.levels[1][1].expected * 0.95 + danger_pattern * 0.05;
        self.levels[2][0].expected = self.levels[2][0].expected * 0.98 + total_fe.min(1.0) * 0.02;

        let surprise = total_fe.min(1.0);
        self.last_surprise = surprise;
        surprise
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers;

    #[test] fn test_initial_observe_no_surprise() {
        let mut p = HierarchicalPredictor::new();
        let snap = test_helpers::basic_snapshot();
        assert!(p.observe(&snap) < 0.01);
    }

    #[test] fn test_health_drop_causes_surprise() {
        let mut p = HierarchicalPredictor::new();
        let snap = test_helpers::basic_snapshot();
        p.observe(&snap);
        let mut snap2 = snap.clone(); snap2.health = 10.0;
        let surprise = p.observe(&snap2);
        assert!(surprise > 0.1);
    }

    #[test] fn test_precision_weights_error() {
        let mut p_high = HierarchicalPredictor::new();
        let mut p_low = HierarchicalPredictor::new();
        p_low.levels[0][0].precision = 0.0;
        p_low.levels[0][1].precision = 0.0;
        p_low.levels[0][2].precision = 0.0;
        let snap = test_helpers::basic_snapshot();
        p_high.observe(&snap);
        p_low.observe(&snap);
        let mut snap2 = snap.clone(); snap2.health = 5.0;
        let surprise_high = p_high.observe(&snap2);
        let surprise_low = p_low.observe(&snap2);
        assert!(surprise_low < surprise_high, "Lower precision should give less surprise");
    }

    #[test] fn test_predictive_decay() {
        let mut p = HierarchicalPredictor::new();
        let snap = test_helpers::basic_snapshot();
        p.observe(&snap);
        for _ in 0..10 { assert!(p.observe(&snap) < 0.01); }
    }
}
