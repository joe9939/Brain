//! Thalamocortical Gate (P5)
//! Sherman (2005): thalamus as cortical relay + gate
//! Saalmann et al. (2012): pulvinar regulates info transmission
//!
//! TDD: tests first.

use std::collections::HashMap;

#[derive(Clone, Debug, PartialEq)]
pub enum GateMode { Suppress, Passthrough, Amplify }

pub struct ThalamicGate {
    pub relay_gain: HashMap<String, f32>,
    pub gating_mode: GateMode,
}

impl ThalamicGate {
    pub fn new() -> Self {
        Self { relay_gain: HashMap::new(), gating_mode: GateMode::Passthrough }
    }

    /// Set gain for a specific channel
    pub fn set_gain(&mut self, channel: &str, gain: f32) {
        self.relay_gain.insert(channel.to_string(), gain.clamp(0.0, 2.0));
    }

    /// Get effective gain for a channel (defaults to 1.0)
    pub fn get_gain(&self, channel: &str) -> f32 {
        self.relay_gain.get(channel).copied().unwrap_or(1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_gain_is_passthrough() {
        let gate = ThalamicGate::new();
        assert!((gate.get_gain("visual") - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_set_gain_modulates_channel() {
        let mut gate = ThalamicGate::new();
        gate.set_gain("auditory", 0.3);
        assert!((gate.get_gain("auditory") - 0.3).abs() < 0.01);
        assert!((gate.get_gain("visual") - 1.0).abs() < 0.01);
    }

    #[test]
    fn test_gain_clamped() {
        let mut gate = ThalamicGate::new();
        gate.set_gain("overdrive", 5.0);
        assert!((gate.get_gain("overdrive") - 2.0).abs() < 0.01);
    }
}
