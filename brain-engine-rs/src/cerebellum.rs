//! Cerebellum (P2.5) — motor sequence learning
//! Ito (2006): cerebellar circuitry as temporal sequence predictor
//! Doya (2000): cerebellum = fine-tuning, BG = action selection
//!
//! TDD: tests first, minimal implementation.

#[derive(Clone, Debug)]
pub struct MotorSequence {
    pub id: String,
    pub steps: Vec<String>,
    pub success_rate: f32,
    pub avg_latency_ms: f64,
}

pub struct Cerebellum {
    pub sequences: Vec<MotorSequence>,
}

impl Cerebellum {
    pub fn new() -> Self { Self { sequences: vec![] } }

    /// v6: Bus mode — predict next action from bus state
    pub fn bus_tick(&self, bus: &mut crate::bus::ComponentBus) {
        if let Some(ref action) = bus.cognitive_action {
            bus.predicted_next_action = self.predict_next(action);
        }
    }

    /// Learn (or update) a motor sequence
    pub fn learn(&mut self, seq: MotorSequence) {
        if let Some(existing) = self.sequences.iter_mut().find(|s| s.id == seq.id) {
            existing.success_rate = seq.success_rate;
            existing.avg_latency_ms = seq.avg_latency_ms;
            existing.steps = seq.steps;
        } else {
            self.sequences.push(seq);
        }
    }

    /// Given current action, predict the next step
    pub fn predict_next(&self, current_action: &str) -> Option<String> {
        for seq in &self.sequences {
            for (i, step) in seq.steps.iter().enumerate() {
                if step == current_action && i + 1 < seq.steps.len() {
                    return Some(seq.steps[i + 1].clone());
                }
            }
        }
        None
    }
}

// ══════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_learn_new_sequence() {
        let mut cb = Cerebellum::new();
        let seq = MotorSequence {
            id: "seq_1".into(),
            steps: vec!["find_food".into(), "eat".into()],
            success_rate: 0.0,
            avg_latency_ms: 0.0,
        };
        cb.learn(seq);
        assert_eq!(cb.sequences.len(), 1);
    }

    #[test]
    fn test_predict_next_step() {
        let mut cb = Cerebellum::new();
        cb.learn(MotorSequence {
            id: "seq_1".into(),
            steps: vec!["find_wood".into(), "craft_planks".into(), "build".into()],
            success_rate: 0.8,
            avg_latency_ms: 100.0,
        });
        let next = cb.predict_next("find_wood");
        assert!(next.is_some());
        assert_eq!(next.unwrap(), "craft_planks");
    }

    #[test]
    fn test_no_prediction_for_unknown() {
        let cb = Cerebellum::new();
        assert!(cb.predict_next("unknown_action").is_none());
    }
}
