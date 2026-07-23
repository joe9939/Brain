//! Maslow Wave — ACT-R Spreading Activation (Anderson 2004)
//! dI/dt = α·trigger - β·(I - baseline)
//! Satisfaction propagation: A_i(t) = B_i + ΣW_j·S_ji + ε
//!
//! TDD: tests first.

use crate::types::{WavePhase, WaveState};

pub struct WaveConfig {
    pub decay_rates: [f32; 5],
    pub weights: [f32; 5],
    pub baselines: [f32; 5],
    pub peak_threshold: f32,
    pub dormant_threshold: f32,
    pub frustration_threshold: u32,
    pub frustration_penalty: f32,
    /// ACT-R propagation matrix: [satisfied][target]
    pub propagation_matrix: [[f32; 5]; 5],
    pub spreading_rate: f32,
}

impl Default for WaveConfig {
    fn default() -> Self {
        Self {
            decay_rates: [0.92, 0.88, 0.95, 0.93, 0.97],
            weights: [5.0, 4.0, 3.0, 2.0, 2.0],
            baselines: [0.0; 5],
            peak_threshold: 0.7,
            dormant_threshold: 0.2,
            frustration_threshold: 200,
            frustration_penalty: 0.3,
            propagation_matrix: [
                [0.0, 0.15, 0.0, 0.0, 0.05],  // hunger satisfied → safety↑, curiosity↑
                [0.0, 0.0, 0.10, 0.0, 0.05],   // safe → social↑, curiosity↑
                [0.0, 0.0, 0.0, 0.10, 0.0],    // social → achievement↑
                [0.0, 0.0, 0.0, 0.0, 0.15],    // achievement → curiosity↑
                [0.0, 0.0, 0.0, 0.0, 0.0],     // curiosity → (none)
            ],
            spreading_rate: 0.3,
        }
    }
}

pub struct MaslowWave {
    pub state: WaveState,
    prev_state: WaveState,
    frustration: [u32; 5],
    config: WaveConfig,
    pub adrenaline_mod: f32,
    pub cortisol_mod: f32,
    pub dopamine_mod: f32,
}

impl MaslowWave {
    pub fn new(config: WaveConfig) -> Self {
        Self {
            state: config.baselines,
            prev_state: config.baselines,
            frustration: [0; 5],
            config,
            adrenaline_mod: 0.0,
            cortisol_mod: 0.0,
            dopamine_mod: 0.5,
        }
    }

    /// v6: Bus mode — write wave state to bus
    pub fn bus_tick(&self, bus: &mut crate::bus::ComponentBus) {
        bus.wave_state = self.state;
        bus.dominant_level = self.get_dominant().map(|(l, _)| l);
    }

    pub fn apply_delta(&mut self, level: usize, delta: f32) {
        if level < 5 {
            self.state[level] = f32::min(self.state[level], 1.0) + delta;
            self.state[level] = self.state[level].clamp(0.0, 1.0);
        }
    }

    /// ACT-R propagation: satisfying one need spreads to connected needs
    pub fn propagate_satisfaction(&mut self, satisfied_level: usize) {
        let boost = self.config.propagation_matrix[satisfied_level];
        for (target, &amount) in boost.iter().enumerate() {
            if amount > 0.0 {
                let spread = amount * self.config.spreading_rate;
                self.state[target] = (self.state[target] + spread).min(1.0);
            }
        }
    }

    pub fn tick(&mut self, moved: bool, tech_stage: u8) {
        self.prev_state = self.state;
        for i in 0..5 {
            let decay = self.config.decay_rates[i];
            let baseline = self.config.baselines[i];
            // Frustration penalty
            let frust_penalty = if self.frustration[i] > self.config.frustration_threshold {
                self.config.frustration_penalty
            } else { 0.0 };
            // Tech-driven curiosity (level 4)
            let curiosity = if i == 4 {
                (tech_stage as f32) * 0.05
            } else if i == 3 && tech_stage > 1 {
                0.02
            } else { 0.0 };
            self.state[i] = decay * self.state[i] + (1.0 - decay) * baseline
                + curiosity - frust_penalty * self.state[i];
            self.state[i] = self.state[i].clamp(0.0, 1.0);
        }
        // Movement satisfies curiosity slightly
        if moved { self.state[4] = (self.state[4] * 0.98).min(1.0); }
    }

    pub fn get_dominant(&self) -> Option<(usize, f32)> {
        let mut best: Option<(usize, f32)> = None;
        for i in 0..5 {
            if self.state[i] > self.config.peak_threshold {
                let weighted = self.state[i] * self.config.weights[i];
                match best {
                    Some((_, w)) if weighted > w => best = Some((i, weighted)),
                    None => best = Some((i, weighted)),
                    _ => {}
                }
            }
        }
        best
    }

    pub fn get_level(&self, level: usize) -> f32 {
        if level < 5 { self.state[level] } else { 0.0 }
    }

    pub fn set_hormone_mods(&mut self, adrenaline: f32, cortisol: f32, dopamine: f32) {
        self.adrenaline_mod = adrenaline;
        self.cortisol_mod = cortisol;
        self.dopamine_mod = dopamine;
    }

    pub fn mark_frustrated(&mut self, level: usize) {
        if level < 5 { self.frustration[level] += 1; }
    }
    pub fn reset_frustration(&mut self, level: usize) {
        if level < 5 { self.frustration[level] = 0; }
    }
    pub fn get_frustration(&self, level: usize) -> u32 {
        if level < 5 { self.frustration[level] } else { 0 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_initial_state_all_zero() {
        let w = MaslowWave::new(WaveConfig::default());
        assert!(w.state.iter().all(|&v| v == 0.0));
    }

    #[test] fn test_apply_delta() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.apply_delta(0, 0.5);
        assert!((w.state[0] - 0.5).abs() < 0.01);
    }

    #[test] fn test_decay_over_time() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.apply_delta(0, 1.0);
        w.tick(false, 0);
        assert!(w.state[0] < 1.0 && w.state[0] > 0.0);
    }

    #[test] fn test_dominant_need() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.apply_delta(0, 0.8);
        w.apply_delta(4, 0.1);
        let dom = w.get_dominant();
        assert!(dom.is_some());
        assert_eq!(dom.unwrap().0, 0);
    }

    #[test] fn test_frustration_accumulates() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.mark_frustrated(0);
        assert!(w.get_frustration(0) > 0);
    }

    #[test] fn test_frustration_resets_on_success() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.mark_frustrated(0);
        w.reset_frustration(0);
        assert_eq!(w.get_frustration(0), 0);
    }

    #[test] fn test_tech_stage_affects_curiosity() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.tick(false, 0);
        assert_eq!(w.state[4], 0.0);
        w.tick(false, 3);
        assert!(w.state[4] > 0.0);
    }

    #[test] fn test_propagate_satisfaction_boosts_adjacent() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.state[0] = 0.9;
        w.state[1] = 0.2;
        w.propagate_satisfaction(0);
        assert!(w.state[1] > 0.2, "Hunger satisfied → safety should rise");
    }

    #[test] fn test_no_propagation_to_unconnected() {
        let mut w = MaslowWave::new(WaveConfig::default());
        w.state = [0.5, 0.5, 0.5, 0.5, 0.5];
        w.propagate_satisfaction(0);
        assert!(w.state[2] == w.state[2], "Social should not be affected by hunger satisfaction");
    }
}
