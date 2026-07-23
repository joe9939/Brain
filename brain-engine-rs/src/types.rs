//! Core types for Brain Engine v5 — arXiv 2504.01990 aligned
//! 21 brain components, paper-precise models

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ── Mental State ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MentalState {
    pub mem: MemoryState,
    pub wm: WorldModelState,
    pub emo: EmotionState,
    pub goal: GoalState,
    pub rew: RewardState,
    pub hormone: HormoneState,
    pub last_action: Option<ActionResult>,
    pub attention: AttentionState,
    pub signals: SignalBus,
}

impl Default for MentalState {
    fn default() -> Self {
        Self {
            mem: MemoryState::default(),
            wm: WorldModelState::default(),
            emo: EmotionState::default(),
            goal: GoalState { active: vec![], completed: 0, history: vec![] },
            rew: RewardState { score: 0.0, total: 0.0, td_error: 0.0, history: vec![], intrinsic_curiosity: 0.0, value: 0.0 },
            hormone: HormoneState::default(),
            last_action: None,
            attention: AttentionState::default(),
            signals: SignalBus::default(),
        }
    }
}

// ── P0 Doya 2002: TD Meta-learning ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ModulatorState {
    /// 5-HT → 折扣因子 γ: γ = 0.3 + 5HT * 0.6
    pub serotonin: f32,
    /// NE → 逆温度 β: β = 1.0 + NE * 5.0
    pub norepinephrine: f32,
    /// ACh → 学习率 α: α = 0.1 + ACh * 0.4
    pub acetylcholine: f32,
    /// DA → TD 误差 (由 reward 系统写入)
    pub td_error: f32,
    /// γ = 0.3 + 5HT * 0.6
    pub gamma: f32,
    /// β = 1.0 + NE * 5.0
    pub beta: f32,
    /// α = 0.1 + ACh * 0.4
    pub alpha: f32,
}

impl Default for ModulatorState {
    fn default() -> Self {
        let s = 0.5; let ne = 0.3; let a = 0.4;
        Self {
            serotonin: s, norepinephrine: ne, acetylcholine: a,
            td_error: 0.0,
            gamma: 0.3 + s * 0.6,
            beta: 1.0 + ne * 5.0,
            alpha: 0.1 + a * 0.4,
        }
    }
}

// ── Allostatic Hormone (Sapolsky 2015) ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct HormoneState {
    pub adrenaline: f32, pub cortisol: f32, pub endorphin: f32,
    pub dopamine: f32, pub serotonin: f32, pub oxytocin: f32,
    pub allostatic_load: f32,
    pub cortisol_baseline: f32,
    pub receptor_sensitivity: f32,
}
impl Default for HormoneState {
    fn default() -> Self {
        Self {
            adrenaline: 0.0, cortisol: 0.0, endorphin: 0.0,
            dopamine: 0.5, serotonin: 0.5, oxytocin: 0.0,
            allostatic_load: 0.0, cortisol_baseline: 0.0, receptor_sensitivity: 1.0,
        }
    }
}
impl HormoneState {
    pub fn modulate_reflex_threshold(&self, base: f32) -> f32 { base * (1.0 - self.adrenaline * 0.5) * self.receptor_sensitivity }
    pub fn modulate_prediction_sensitivity(&self, base: f32) -> f32 { base * (1.0 + self.cortisol * 0.3) }
    pub fn modulate_memory_importance(&self, base: f32) -> f32 { base * (1.0 + self.adrenaline * 0.5) }
}

// ── Barrett 2017: Constructed Emotion ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AppraisalDimensions {
    pub pleasantness: f32, pub certainty: f32, pub effort: f32,
    pub attention: f32, pub control: f32, pub goal_consistency: f32,
}
impl Default for AppraisalDimensions {
    fn default() -> Self { Self { pleasantness: 0.0, certainty: 0.5, effort: 0.0, attention: 0.3, control: 0.5, goal_consistency: 0.0 } }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum EmotionMode { Normal, Caution, Urgent, Explore, Support }

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EmotionState {
    pub mode: EmotionMode, pub intensity: f32, pub valence: f32,
    pub arousal: f32, pub dominance: f32, pub timestamp: f64,
    pub appraisals: AppraisalDimensions,
    pub constructed_label: String,
}

impl Default for EmotionState {
    fn default() -> Self {
        Self {
            mode: EmotionMode::Normal, intensity: 0.0, valence: 0.0,
            arousal: 0.0, dominance: 0.5, timestamp: 0.0,
            appraisals: AppraisalDimensions::default(),
            constructed_label: String::new(),
        }
    }
}

// ── Attention: Itti & Koch 2001 ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AttentionState {
    pub focus: String,
    pub intensity: f32,
    pub source: String,
    pub saliency_map: HashMap<String, f32>,
    pub top_down_bias: HashMap<String, f32>,
}
impl Default for AttentionState {
    fn default() -> Self { Self { focus: "explore".into(), intensity: 0.0, source: "default".into(), saliency_map: HashMap::new(), top_down_bias: HashMap::new() } }
}

// ── Memory ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MemoryState {
    pub sensory: Vec<SensoryBuffer>,
    pub working: Vec<String>,
    pub episodic: Vec<EpisodicMemory>,
    pub semantic: Vec<SemanticMemory>,
    pub procedural: Vec<StandardOperatingProcedure>,
    pub importance_scores: HashMap<String, f32>,
}
impl Default for MemoryState {
    fn default() -> Self {
        Self { sensory: vec![], working: vec![],
            episodic: vec![], semantic: vec![],
            procedural: vec![], importance_scores: HashMap::new() }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SensoryBuffer {
    pub modality: String, pub content: String, pub timestamp: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EpisodicMemory {
    pub id: String, pub timestamp: f64, pub content: String,
    pub importance: f32, pub tags: Vec<String>,
    pub position: Option<Position>,
    pub access_count: u32, pub last_accessed: f64,
    pub valence: f32, pub arousal: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SemanticMemory {
    pub id: String, pub concept: String, pub facts: Vec<String>,
    pub confidence: f32, pub access_count: u32, pub last_accessed: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StandardOperatingProcedure {
    pub id: String, pub trigger: String, pub steps: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WorldModelState {
    pub predictions: HashMap<String, f32>,
    pub confidence: f32,
}
impl Default for WorldModelState {
    fn default() -> Self { Self { predictions: HashMap::new(), confidence: 0.5 } }
}

// ── Goal ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GoalState { pub active: Vec<Goal>, pub completed: u32, pub history: Vec<Goal> }

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Goal {
    pub id: String, pub description: String, pub status: GoalStatus,
    pub priority: u32, pub created: f64, pub completed_at: Option<f64>,
    pub parent_id: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub enum GoalStatus { Pending, Active, Completed, Failed }

// ── Reward ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RewardState {
    pub score: f32, pub total: f32, pub td_error: f32,
    pub history: Vec<f32>, pub intrinsic_curiosity: f32,
    pub value: f32,
}

// ── Action ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Action {
    pub action_type: String,
    pub params: HashMap<String, f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ActionResult {
    pub action: String, pub success: bool, pub error: Option<String>,
}

// ── World ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WorldSnapshot {
    pub health: f32, pub hunger: f32, pub oxygen: f32,
    pub position: Position, pub velocity: (f64, f64, f64),
    pub on_fire: bool, pub in_lava: bool, pub falling: bool,
    pub entities: Vec<EntityInfo>,
    pub inventory: Vec<ItemInfo>,
    pub blocks: Vec<String>,
    pub time_of_day: f64,
    pub dimension: String,
    pub threat_trend: Option<String>,
    pub biome: Option<String>,
    pub light_level: Option<f32>,
    pub players: Vec<String>,
    pub effects: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Position {
    pub x: f64, pub y: f64, pub z: f64,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct EntityInfo {
    pub entity_type: String,
    pub distance: f32,
    pub health: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ItemInfo {
    pub item: String, pub count: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TickResult {
    pub result_type: String, pub latency_ms: f64,
    pub action: Option<Action>, pub output: Option<String>,
}

pub type WaveState = [f32; 5];

// ── Signal Bus (Foundation Agent §2.4) ──

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Signal {
    pub key: String,
    pub label: String,
    pub raw: f32,
    pub priority: f32,
    pub strength: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SignalBus {
    pub perceive: Signal,
    pub emotion: Signal,
    pub safety: Signal,
    pub memory: Signal,
    pub reward: Signal,
    pub action: Signal,
    pub learning: Signal,
}

impl Default for SignalBus {
    fn default() -> Self {
        Self {
            perceive: Signal { key: "perceive".into(), label: "L1 Perception".into(), raw: 0.0, priority: 5.0, strength: 0.0 },
            emotion: Signal { key: "emotion".into(), label: "Emotion".into(), raw: 0.0, priority: 4.0, strength: 0.0 },
            safety: Signal { key: "safety".into(), label: "Safety Gate".into(), raw: 0.0, priority: 4.0, strength: 0.0 },
            memory: Signal { key: "memory".into(), label: "Memory Retrieval".into(), raw: 0.0, priority: 3.0, strength: 0.0 },
            reward: Signal { key: "reward".into(), label: "Reward Evaluation".into(), raw: 0.0, priority: 3.0, strength: 0.0 },
            action: Signal { key: "action".into(), label: "Action Execution".into(), raw: 0.0, priority: 2.0, strength: 0.0 },
            learning: Signal { key: "learning".into(), label: "POST Learning".into(), raw: 0.0, priority: 1.0, strength: 0.0 },
        }
    }
}

impl SignalBus {
    pub fn all_signals(&self) -> Vec<&Signal> {
        vec![&self.perceive, &self.emotion, &self.safety, &self.memory, &self.reward, &self.action, &self.learning]
    }

    pub fn winner(&self) -> Option<&Signal> {
        self.all_signals().into_iter().max_by(|a, b| a.strength.partial_cmp(&b.strength).unwrap())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub enum WavePhase { Rising, Peak, Decaying, Dormant }

#[derive(Clone, Debug, Serialize, Deserialize)]
#[derive(Default)]
pub struct SignalResult {
    pub key: String, pub label: String, pub raw: f32, pub priority: f32, pub strength: f32,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GateResult {
    pub allow_all: bool, pub allowed_tools: Vec<String>,
    pub reason: String, pub signal: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ComponentOutput {
    pub component_id: String, pub summary: String,
    pub signals: HashMap<String, f32>,
    pub state_updates: HashMap<String, String>,
    pub needs: Option<[f32; 5]>,
    pub metadata: HashMap<String, String>,
}
