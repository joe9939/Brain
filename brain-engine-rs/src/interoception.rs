//! Interoceptive Inference (P6)
//! Seth (2013): interoceptive inference, emotion, and the embodied self
//! Barrett (2017): theory of constructed emotion
//! Petzschner et al. (2017): computational models of interoception
//!
//! TDD: tests first.

pub struct InteroceptiveSystem {
    pub predicted_health: f32,
    pub predicted_hunger: f32,
    pub prediction_horizon: usize,
    pub error: f32,
}

impl InteroceptiveSystem {
    pub fn new() -> Self {
        Self { predicted_health: 20.0, predicted_hunger: 20.0, prediction_horizon: 10, error: 0.0 }
    }

    /// Predict future health/hunger based on current values and decay rates
    pub fn predict(&mut self, current_health: f32, current_hunger: f32) {
        let health_decay = 0.02;  // slow health decay
        let hunger_decay = 0.05;  // faster hunger decay
        self.predicted_health = (current_health - health_decay * self.prediction_horizon as f32).max(0.0);
        self.predicted_hunger = (current_hunger - hunger_decay * self.prediction_horizon as f32).max(0.0);
        // Prediction error = how far off previous prediction was
        self.error = (self.predicted_health - current_health).abs() / 20.0
            + (self.predicted_hunger - current_hunger).abs() / 20.0;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_predicts_future_decline() {
        let mut intero = InteroceptiveSystem::new();
        intero.predict(15.0, 8.0);
        assert!(intero.predicted_health < 15.0, "Health should decline");
        assert!(intero.predicted_hunger < 8.0, "Hunger should decline faster");
    }

    #[test]
    fn test_no_negative_predictions() {
        let mut intero = InteroceptiveSystem::new();
        intero.predict(1.0, 0.5);
        assert!(intero.predicted_health >= 0.0);
        assert!(intero.predicted_hunger >= 0.0);
    }
}
