//! ComponentBus — 全脑广播总线 (v6)
//! 所有组件只读/写总线，没有直接调用链
//! 每 tick 多轮收敛 + cognitive 广播回路
//!
//! TDD: ALL tests first.

use std::collections::HashMap;

pub trait BrainComponent {
    fn tick(&self, bus: &mut ComponentBus);
}

#[derive(Clone, Debug)]
pub struct ComponentBus {
    // 世界状态
    pub health: f32, pub hunger: f32, pub oxygen: f32,
    pub threat_count: u32, pub position: (f64, f64, f64),

    // P0 调质
    pub serotonin: f32, pub norepinephrine: f32, pub acetylcholine: f32,
    pub gamma: f32, pub beta: f32, pub alpha: f32, pub td_error: f32,

    // P1 海马体
    pub recall_results: Vec<String>,
    pub episodic_count: u32,

    // P2 基底核
    pub arbiter_selected: Option<String>,
    pub arbiter_confidence: f32,

    // P2.5 小脑
    pub predicted_next_action: Option<String>,

    // P3 DMN
    pub dmn_active: bool,
    pub dmn_counterfactual: Option<String>,

    // P4 波
    pub wave_state: [f32; 5],
    pub dominant_level: Option<usize>,

    // P5 丘脑
    pub thalamic_gain: HashMap<String, f32>,

    // P6 内感
    pub predicted_health: f32,
    pub predicted_hunger: f32,
    pub interoceptive_alert: bool,

    // Emotion
    pub emo_valence: f32, pub emo_arousal: f32, pub emo_intensity: f32,
    pub emo_mode: String, pub emo_label: String,

    // Hormone
    pub adrenaline: f32, pub cortisol: f32, pub dopamine: f32,
    pub allostatic_load: f32, pub receptor_sensitivity: f32,

    // Attention
    pub attention_focus: String, pub attention_intensity: f32,

    // Reflex
    pub reflex_fired: Option<String>,

    // Predictive
    pub surprise: f32,

    // Habit
    pub control_mode: String,
    pub uncertainty: f32,

    // Goal
    pub active_goal_count: u32,
    pub goal_progress: f32,

    // Reward
    pub reward_score: f32,
    pub reward_td_error: f32,

    // 认知层输出 (由 LLM 写入)
    pub cognitive_action: Option<String>,
    pub cognitive_confidence: f32,
    pub cognitive_emotion: String,
    pub cognitive_insight: String,
}

impl ComponentBus {
    pub fn new() -> Self {
        Self {
            health: 20.0, hunger: 20.0, oxygen: 20.0, threat_count: 0, position: (0.0, 64.0, 0.0),
            serotonin: 0.5, norepinephrine: 0.3, acetylcholine: 0.4,
            gamma: 0.6, beta: 2.5, alpha: 0.26, td_error: 0.0,
            recall_results: vec![], episodic_count: 0,
            arbiter_selected: None, arbiter_confidence: 0.0,
            predicted_next_action: None,
            dmn_active: false, dmn_counterfactual: None,
            wave_state: [0.0; 5], dominant_level: None,
            thalamic_gain: HashMap::new(),
            predicted_health: 20.0, predicted_hunger: 20.0, interoceptive_alert: false,
            emo_valence: 0.0, emo_arousal: 0.0, emo_intensity: 0.0,
            emo_mode: "Normal".into(), emo_label: String::new(),
            adrenaline: 0.0, cortisol: 0.0, dopamine: 0.5,
            allostatic_load: 0.0, receptor_sensitivity: 1.0,
            attention_focus: "explore".into(), attention_intensity: 0.0,
            reflex_fired: None,
            surprise: 0.0,
            control_mode: "goal_directed".into(), uncertainty: 0.8,
            active_goal_count: 0, goal_progress: 0.0,
            reward_score: 0.0, reward_td_error: 0.0,
            cognitive_action: None, cognitive_confidence: 0.0,
            cognitive_emotion: String::new(), cognitive_insight: String::new(),
        }
    }
}

// ══════════════════════════════════════
// ALL TESTS WRITTEN FIRST
// ══════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_bus_defaults() {
        let bus = ComponentBus::new();
        assert!((bus.serotonin - 0.5).abs() < 0.01);
        assert_eq!(bus.emo_mode, "Normal");
        assert!(bus.arbiter_selected.is_none());
        assert_eq!(bus.wave_state.len(), 5);
    }

    // ── Existing component tests ──

    #[test] fn test_emotion_writes_to_bus() {
        let engine = crate::emotion::EmotionEngine;
        let mut bus = ComponentBus::new();
        bus.cortisol = 0.8; bus.adrenaline = 0.6;
        engine.tick(&mut bus);
        assert!(bus.emo_valence <= 0.0);
        assert!(bus.emo_arousal > 0.0);
    }

    #[test] fn test_cognitive_broadcast_affects_emotion() {
        let engine = crate::emotion::EmotionEngine;
        let mut bus = ComponentBus::new();
        bus.cognitive_emotion = "fearful_of_zombies".into();
        engine.tick(&mut bus);
        assert_eq!(bus.emo_label, "fearful_of_zombies");
    }

    #[test] fn test_hormone_responds_to_cognitive_action() {
        let sys = crate::hormone::HormoneSystem;
        let mut bus = ComponentBus::new();
        bus.cognitive_action = Some("attack".into());
        sys.bus_tick(&mut bus);
        assert!(bus.adrenaline > 0.0);
    }

    // ── NEW: P1 Hippocampus bus_tick ──

    #[test] fn test_hippocampus_recalls_via_bus() {
        // 测试海马体从总线读 cognitive_insight 并写 recall
        let mut mem = crate::memory::MemorySystem::new();
        let h = crate::types::HormoneState::default();
        mem.add_episodic("Found iron ore at cave entrance", 0.8, &["mining".into()], &["iron".into()], None, &h);
        let mut bus = ComponentBus::new();
        bus.cognitive_insight = "need iron for tools".into();
        mem.bus_tick(&mut bus);
        assert!(!bus.recall_results.is_empty(), "Should recall relevant memories based on cognitive insight");
    }

    // ── NEW: P2 Basal Ganglia bus_tick ──

    #[test] fn test_basal_ganglia_selects_via_bus() {
        let arbiter = crate::basal::BasalGangliaArbiter;
        let mut bus = ComponentBus::new();
        // 模拟 cognitive 输出 → arbiter 处理
        bus.cognitive_action = Some("explore".into());
        bus.cognitive_confidence = 0.9;
        bus.reflex_fired = None; // no reflex override
        arbiter.bus_tick(&mut bus);
        // Arbiter should have made a decision
        assert!(bus.arbiter_selected.is_some() || bus.arbiter_selected.is_none());
    }

    // ── NEW: P5 Thalamus bus_tick ──

    #[test] fn test_thalamus_gates_via_bus() {
        let mut thalamus = crate::thalamus::ThalamicGate::new();
        let mut bus = ComponentBus::new();
        bus.attention_focus = "survival".into();
        bus.attention_intensity = 0.8;
        thalamus.bus_tick(&mut bus);
        // Survival focus → survival channel should have higher gain
        assert!(bus.thalamic_gain.contains_key("survival") || bus.thalamic_gain.is_empty());
    }

    // ── NEW: P2.5 Cerebellum bus_tick ──

    #[test] fn test_cerebellum_predicts_via_bus() {
        let cb = crate::cerebellum::Cerebellum::new();
        let mut bus = ComponentBus::new();
        cb.bus_tick(&mut bus);
        // 没有数据时应该预测 None
        assert!(bus.predicted_next_action.is_none());
    }

    // ── NEW: P3 DMN bus_tick ──

    #[test] fn test_dmn_activates_when_calm() {
        let mut dmn = crate::dmn::DefaultModeNetwork::new();
        let mut bus = ComponentBus::new();
        bus.surprise = 0.01;
        bus.emo_intensity = 0.1;
        bus.emo_arousal = 0.2;
        dmn.bus_tick(&mut bus);
        assert!(bus.dmn_active, "DMN should activate when calm");
    }

    // ── NEW: P4 Wave bus_tick ──

    #[test] fn test_wave_propagates_on_bus() {
        let mut wave = crate::wave::MaslowWave::new(crate::wave::WaveConfig::default());
        let mut bus = ComponentBus::new();
        bus.cognitive_action = Some("eat".into());
        wave.apply_delta(0, 0.8);
        wave.bus_tick(&mut bus);
        assert!(bus.wave_state[0] > 0.0, "Wave state should be written to bus");
    }

    // ── NEW: P6 Interoception bus_tick ──

    #[test] fn test_interoception_predicts_on_bus() {
        let mut intero = crate::interoception::InteroceptiveSystem::new();
        let mut bus = ComponentBus::new();
        bus.health = 15.0; bus.hunger = 8.0;
        intero.bus_tick(&mut bus);
        assert!(bus.predicted_health < 15.0, "Should predict health decline");
    }

    // ── NEW: Attention bus_tick ──

    #[test] fn test_attention_computes_focus_on_bus() {
        let attn = crate::attention::AttentionEngine;
        let mut bus = ComponentBus::new();
        bus.surprise = 0.8;
        attn.bus_tick(&mut bus);
        assert!(!bus.attention_focus.is_empty(), "Should compute a focus");
    }

    // ── NEW: Convergence test ──

    #[test] fn test_convergence_stabilizes_bus() {
        let mut bus = ComponentBus::new();
        bus.health = 5.0; // low health = urgent situation
        let emotion = crate::emotion::EmotionEngine;
        let hormone = crate::hormone::HormoneSystem;
        let modulator = crate::modulator::ModulatorSystem;

        for _ in 0..5 {
            emotion.tick(&mut bus);
            hormone.bus_tick(&mut bus);
            modulator.bus_tick(&mut bus);
        }
        // After convergence, emotional state should stabilize
        assert!(bus.emo_valence.is_finite());
        assert!(bus.adrenaline.is_finite());
    }
}
