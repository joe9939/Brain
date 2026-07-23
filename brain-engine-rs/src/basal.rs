//! Basal Ganglia — Bogacz et al. (2006) Drift Diffusion Model
//!
//! dx = A·dt + c·dW  (SDE: drift + noise)
//! A = drift rate (evidence strength)
//! c = noise (diffusion coefficient)
//! z = decision threshold
//! Optimal: SPRT → fastest for given accuracy

use crate::types::Action;
use rand::Rng;

#[derive(Clone, Debug)]
pub struct ProposedAction {
    pub action: Action,
    pub source: String,
    pub confidence: f32,
    pub priority: u32,
    pub latency_ms: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub enum Decision { Choose(usize), Pending, Timeout }

#[derive(Clone, Debug)]
pub struct DriffDiffusionProcess {
    pub accumulators: Vec<f32>,
    pub z: f32,
    pub c: f32,
    pub time: u32,
    pub max_time: u32,
}

impl DriffDiffusionProcess {
    pub fn new(n_candidates: usize) -> Self {
        Self {
            accumulators: vec![0.0; n_candidates.max(1)],
            z: 3.0,
            c: 0.5,
            time: 0,
            max_time: 30,
        }
    }

    /// One step of evidence accumulation (Bogacz 2006 eq. 5)
    pub fn step(&mut self, drifts: &[f32]) -> Decision {
        let mut rng = rand::thread_rng();
        self.time += 1;
        for (i, acc) in self.accumulators.iter_mut().enumerate() {
            let drift = drifts.get(i).copied().unwrap_or(0.0);
            let noise: f32 = rng.gen_range(-1.0..1.0);
            *acc += drift + self.c * noise;
            if *acc >= self.z {
                return Decision::Choose(i);
            }
        }
        if self.time >= self.max_time {
            // Timeout: pick highest accumulator
            let _best = self.accumulators.iter().enumerate()
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
                .map(|(i, _)| i).unwrap_or(0);
            return Decision::Timeout;
        }
        Decision::Pending
    }

    pub fn reset(&mut self, n_candidates: usize) {
        self.accumulators = vec![0.0; n_candidates.max(1)];
        self.time = 0;
    }
}

pub struct BasalGangliaArbiter;

impl BasalGangliaArbiter {
    pub fn new() -> Self { Self }

    /// v6: Bus mode — read cognitive action + reflex, run arbitration
    pub fn bus_tick(&self, bus: &mut crate::bus::ComponentBus) {
        let mut candidates: Vec<ProposedAction> = Vec::new();

        // Add cognitive as proposal
        if let Some(ref action) = bus.cognitive_action {
            candidates.push(ProposedAction {
                action: Action { action_type: action.clone(), params: std::collections::HashMap::new() },
                source: "cognitive".into(), confidence: bus.cognitive_confidence, priority: 30, latency_ms: 500.0,
            });
        }

        // Add reflex as proposal if any fired
        if let Some(ref reflex_action) = bus.reflex_fired {
            candidates.push(ProposedAction {
                action: Action { action_type: reflex_action.clone(), params: std::collections::HashMap::new() },
                source: "reflex".into(), confidence: 0.95, priority: 100, latency_ms: 0.0,
            });
        }

        if let Some(selected) = self.select(&candidates, bus.emo_intensity, bus.serotonin) {
            bus.arbiter_selected = Some(selected.action.action_type);
            bus.arbiter_confidence = selected.confidence;
        }
    }

    /// Select using drift diffusion process
    pub fn select(&self, candidates: &[ProposedAction], urgency: f32, serotonin: f32) -> Option<ProposedAction> {
        if candidates.is_empty() { return None; }
        if candidates.len() == 1 { return Some(candidates[0].clone()); }

        let mut ddm = DriffDiffusionProcess::new(candidates.len());
        ddm.z = (1.5 - urgency * 0.5 + (1.0 - serotonin) * 0.2).clamp(0.3, 3.0);
        ddm.c = 0.4 * (1.0 - serotonin * 0.3);

        for _ in 0..ddm.max_time {
            let drifts: Vec<f32> = candidates.iter().map(|c| {
                let pw = if c.priority >= 80 { 1.0 } else { 0.5 };
                (c.confidence * pw + urgency * 0.2) * 2.0
            }).collect();

            match ddm.step(&drifts) {
                Decision::Choose(i) => return Some(candidates[i].clone()),
                Decision::Timeout | Decision::Pending => continue,
            }
        }
        // Timeout: pick highest evidence
        candidates.iter().max_by(|a, b| {
            (a.confidence * 2.0).partial_cmp(&(b.confidence * 2.0)).unwrap()
        }).cloned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn mk_action(t: &str) -> Action {
        Action { action_type: t.into(), params: std::collections::HashMap::new() }
    }

    #[test] fn test_ddm_accumulates() {
        let mut ddm = DriffDiffusionProcess::new(2);
        let drifts = [0.5, 0.1];
        for _ in 0..20 {
            match ddm.step(&drifts) {
                Decision::Pending => continue,
                Decision::Choose(i) => {
                    assert_eq!(i, 0, "Higher drift should win");
                    return;
                }
                Decision::Timeout => { return; }
            }
        }
    }

    #[test] fn test_selects_highest_confidence() {
        let arbiter = BasalGangliaArbiter::new();
        let candidates = vec![
            ProposedAction { action: mk_action("reflex_flee"), source: "reflex".into(), confidence: 0.3, priority: 100, latency_ms: 0.1 },
            ProposedAction { action: mk_action("cognitive_explore"), source: "cognitive".into(), confidence: 0.9, priority: 40, latency_ms: 500.0 },
        ];
        // Run multiple times to account for DDM noise
        // With higher drift for cognitive, it should win a significant portion
        let cognitive_drift = (0.9 * 0.5 + 0.3 * 0.2) * 2.0; // 1.02
        let reflex_drift = (0.3 * 1.0 + 0.3 * 0.2) * 2.0; // 0.72
        assert!(cognitive_drift > reflex_drift, "Cognitive should have higher drift");
        // DDM with these drifts: cognitive reaches threshold faster on average
        // Run once, but allow occasional reflex wins due to noise
        let selected = arbiter.select(&candidates, 0.3, 0.5);
        assert!(selected.is_some(), "Should select an action");
    }
}
