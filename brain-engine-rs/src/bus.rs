//! ComponentBus — 全脑广播总线 (v6)
//! 所有组件只读/写总线，没有直接调用链
//! 每 tick 多轮收敛 + cognitive 广播回路
//!
//! TDD: ALL tests first.

use crate::types::*;
use std::collections::HashMap;

/// 统一组件接口
pub trait BrainComponent {
    fn tick(&self, bus: &mut ComponentBus);
}

/// 每 tick 重建一次的总线快照
#[derive(Clone, Debug)]
pub struct ComponentBus {
    // 世界状态
    pub health: f32,
    pub hunger: f32,
    pub threat_count: u32,
    
    // P0 调质
    pub serotonin: f32, pub norepinephrine: f32, pub acetylcholine: f32,
    pub gamma: f32, pub beta: f32, pub alpha: f32,
    pub td_error: f32,
    
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
    
    // 认知层输出 (由 LLM 写入)
    pub cognitive_action: Option<String>,
    pub cognitive_confidence: f32,
    pub cognitive_emotion: String,
    pub cognitive_insight: String,
}

impl ComponentBus {
    pub fn new() -> Self {
        Self {
            health: 20.0, hunger: 20.0, threat_count: 0,
            serotonin: 0.5, norepinephrine: 0.3, acetylcholine: 0.4,
            gamma: 0.6, beta: 2.5, alpha: 0.26, td_error: 0.0,
            emo_valence: 0.0, emo_arousal: 0.0, emo_intensity: 0.0,
            emo_mode: "Normal".into(), emo_label: String::new(),
            adrenaline: 0.0, cortisol: 0.0, dopamine: 0.5,
            allostatic_load: 0.0, receptor_sensitivity: 1.0,
            attention_focus: "explore".into(), attention_intensity: 0.0,
            reflex_fired: None,
            surprise: 0.0,
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

    #[test]
    fn test_bus_defaults() {
        let bus = ComponentBus::new();
        assert!((bus.serotonin - 0.5).abs() < 0.01);
        assert_eq!(bus.emo_mode, "Normal");
        assert_eq!(bus.attention_focus, "explore");
        assert!(bus.cognitive_action.is_none());
    }

    #[test]
    fn test_emotion_writes_to_bus() {
        // Emotion 组件从总线读 hormone，写 emotion 到总线
        let engine = crate::emotion::EmotionEngine;
        let mut bus = ComponentBus::new();
        bus.cortisol = 0.8;
        bus.adrenaline = 0.6;
        
        // Emotion 从总线读 hormone，更新总线上的 emotion 字段
        engine.tick(&mut bus);
        
        // 高皮质醇 → 负 valence
        assert!(bus.emo_valence <= 0.0, "High cortisol should lower valence");
        // 高肾上腺素 → 高 arousal
        assert!(bus.emo_arousal > 0.0, "High adrenaline should raise arousal");
    }

    #[test]
    fn test_cognitive_broadcast_affects_emotion() {
        // LLM 输出写入总线 → emotion 组件读取并响应
        let engine = crate::emotion::EmotionEngine;
        let mut bus = ComponentBus::new();
        
        // 模拟 cognitive 广播
        bus.cognitive_emotion = "fearful_of_zombies".into();
        
        // Emotion 组件响应
        engine.tick(&mut bus);
        
        // 标签 "fearful" → 情绪模式应为 Caution
        assert_eq!(bus.emo_label, "fearful_of_zombies", "Emotion label should be set from cognitive broadcast");
    }

    #[test]
    fn test_hormone_responds_to_cognitive_action() {
        let sys = crate::hormone::HormoneSystem;
        let mut bus = ComponentBus::new();
        
        // cognitive 决定攻击
        bus.cognitive_action = Some("attack".into());
        
        sys.bus_tick(&mut bus);
        
        // 攻击决策 → 肾上腺素飙升
        assert!(bus.adrenaline > 0.0, "Aggressive action should spike adrenaline");
    }
}
