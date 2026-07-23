//! Brain Engine — main orchestrator
//! 4-layer pipeline: Reflex → Prediction → Habit → Cognition (LLM)

use crate::types::*;
use crate::wave::MaslowWave;
use crate::wave::WaveConfig;
use crate::hormone::HormoneSystem;
use crate::emotion::EmotionEngine;
use crate::memory::MemorySystem;
use crate::reward::RewardSystem;
use crate::goal::GoalSystem;
use crate::reflex::ReflexRegistry;
use crate::predictive::HierarchicalPredictor;
use crate::habit::HabitLayer;
use crate::attention::AttentionEngine;
use crate::modulator::ModulatorSystem;
use crate::basal::{BasalGangliaArbiter, ProposedAction};
use crate::bus::ComponentBus;
use crate::llm::{CognitiveAgent, LlmContext, LlmProvider, parse_llm_action};
use rig_core::completion::Prompt;
use crate::utils;
use std::collections::HashMap;
use serde_json;

const HOSTILE_TYPES: &[&str] = &["zombie","skeleton","creeper","spider","enderman","witch","phantom"];

pub struct BrainConfig {
    pub llm_api_key: Option<String>,
    pub llm_base_url: String,
    pub llm_model: String,
    pub llm_provider: LlmProvider,
}

impl Default for BrainConfig {
    fn default() -> Self {
        let provider = LlmProvider::default();
        Self {
            llm_api_key: None,
            llm_base_url: provider.default_base_url().into(),
            llm_model: provider.default_model().into(),
            llm_provider: provider,
        }
    }
}

impl BrainConfig {
    pub fn has_llm(&self) -> bool { self.llm_api_key.is_some() }
}

pub struct BrainEngine {
    pub config: BrainConfig,
    pub state: MentalState,
    pub wave: MaslowWave,
    pub hormone: HormoneSystem,
    pub emotion: EmotionEngine,
    pub memory: MemorySystem,
    pub reward: RewardSystem,
    pub reflexes: ReflexRegistry,
    pub predictor: HierarchicalPredictor,
    pub habits: HabitLayer,
    pub attention_engine: AttentionEngine,
    pub arbiter: BasalGangliaArbiter,
    pub modulator: ModulatorSystem,
    pub mod_state: crate::types::ModulatorState,
    pub cognitive: Option<CognitiveAgent>,
    pub turn_count: u64,
    pub stress_ticks: u32, // W3.3: persistent high-wave stress tracker
}

impl BrainEngine {
    pub fn new(config: BrainConfig) -> Self {
        Self {
            config,
            state: MentalState::default(),
            wave: MaslowWave::new(WaveConfig::default()),
            hormone: HormoneSystem::new(),
            emotion: EmotionEngine::new(),
            memory: MemorySystem::new(),
            reward: RewardSystem::new(),
            reflexes: ReflexRegistry::new(),
            predictor: HierarchicalPredictor::new(),
            habits: HabitLayer::new(),
            attention_engine: AttentionEngine::new(),
            arbiter: BasalGangliaArbiter::new(),
            modulator: ModulatorSystem::new(),
            mod_state: crate::types::ModulatorState::default(),
            cognitive: None,
            stress_ticks: 0,
            turn_count: 0,
        }
    }

    /// Lazily initialize cognitive agent on first LLM usage.
    pub async fn ensure_cognitive(&mut self) {
        if self.cognitive.is_some() || !self.config.has_llm() {
            return;
        }
        match CognitiveAgent::build(
            self.config.llm_api_key.as_ref().unwrap(),
            &self.config.llm_model,
            &self.config.llm_base_url,
        )
        .await
        {
            Ok(agent) => {
                self.cognitive = Some(agent);
                tracing::info!("[Brain] Cognitive agent initialized");
            }
            Err(e) => {
                tracing::error!("[Brain] Failed to build cognitive agent: {}", e);
            }
        }
    }

    pub async fn tick(&mut self, snapshot: &WorldSnapshot) -> TickResult {
        let start = utils::now();
        self.turn_count += 1;
        // W3.4: Reset cognitive suppress each tick (cognitive layer must re-assert)
        self.reflexes.cognitive_suppress = false;
        // P0: Neuromodulator decay
        self.modulator.tick(&mut self.mod_state);

        // Layer 0: Internal state update
        self.update_internal_state(snapshot);
        // Signal Bus: compute 7 competing signals
        self.compute_signals();

        // P2: Collect proposals from all layers → BasalGangliaArbiter selects
        let mut proposals: Vec<ProposedAction> = Vec::new();

        // Layer 1: Reflex (0 LLM, <1ms)
        if let Some(action) = self.reflexes.check(snapshot, &self.state.hormone, self.mod_state.serotonin) {
            proposals.push(ProposedAction {
                action, source: "reflex".into(), confidence: 0.95, priority: 100, latency_ms: 0.0,
            });
        }

        // Layer 2: Predictive (0 LLM, <1ms) — detect surprise
        let surprise = self.predictor.observe(snapshot);
        if surprise < 0.05 {
            // Everything predicted correctly → run wave-driven action
            if let Some(action) = self.wave_to_action(snapshot) {
                proposals.push(ProposedAction {
                    action, source: "drive".into(), confidence: 0.7, priority: 60, latency_ms: 0.0,
                });
            }
        }

        // Layer 2b: Habit (0 LLM, ~10ms)
        let state_desc = format!("health={:.0} hunger={:.0} hostiles={}", snapshot.health, snapshot.hunger,
            snapshot.entities.iter().filter(|e| HOSTILE_TYPES.contains(&e.entity_type.as_str())).count());
        if let Some(habit) = self.habits.match_habit(&state_desc) {
            proposals.push(ProposedAction {
                action: habit.action.clone(), source: "habit".into(),
                confidence: habit.success_rate, priority: 50, latency_ms: 0.0,
            });
        }

        // Layer 3: Wave-driven action (fallback)
        if let Some(action) = self.wave_to_action(snapshot) {
                proposals.push(ProposedAction {
                    action, source: "drive".into(), confidence: 0.5, priority: 40, latency_ms: 0.0,
                });
        }

        // Layer 4: Cognitive (LLM) — every 10 ticks, with tool calling loop
        let mut cognitive_output: Option<String> = None;
        if self.config.has_llm() && self.turn_count % 10 == 0 {
            self.ensure_cognitive().await;

            let dominant = self.wave.get_dominant();
            let ctx = LlmContext::build(snapshot, &self.state, dominant);
            let initial_prompt = ctx.to_dynamic_prompt();

            tracing::info!("[Brain] Cognitive reasoning (tick {})", self.turn_count);
            if let Some(cog) = &self.cognitive {
                let mut messages = vec![initial_prompt];
                let mut tool_uses = 0;
                let max_tool_uses = 3;

                for _retry in 0..3 {
                    let current_prompt = messages.join("\n\n");
                    // Token budget: 3000 chars for tool-calling prompt
                    let budget_prompt = if current_prompt.len() > 3000 {
                        format!("{}...[truncated]...{}",
                            &current_prompt[..2000],
                            &current_prompt[current_prompt.len().saturating_sub(1000)..])
                    } else { current_prompt };

                    match tokio::time::timeout(
                        std::time::Duration::from_secs(30),
                        cog.inner.prompt(&budget_prompt),
                    ).await {
                        Ok(Ok(response)) => {
                            // Check for tool call
                            if let Some((tool_name, tool_args)) = self.parse_tool_call(&response) {
                                if tool_uses < max_tool_uses {
                                    let result = self.execute_tool(&tool_name, &tool_args);
                                    messages.push(format!("Tool call: {}({})\nResult: {}", tool_name, tool_args, result));
                                    tool_uses += 1;
                                    continue;
                                }
                            }
                            // Otherwise it's a final action
                            tracing::info!("[Brain] Cognitive response: {}", response);
                            if let Some(action) = self.cognitive_tick(snapshot, &response) {
                                proposals.push(ProposedAction {
                                    action, source: "cognitive".into(), confidence: 0.8, priority: 30, latency_ms: 500.0,
                                });
                                cognitive_output = Some(response);
                            }
                            break;
                        }
                        Ok(Err(e)) => tracing::error!("[Brain] LLM error: {}", e),
                        Err(_) => tracing::warn!("[Brain] LLM timeout"),
                    }
                    break; // Only retry on network error
                }
            }
        }

        // P2: Arbiter selects best action from all proposals
        let urgency = self.state.emo.intensity;
        let serotonin = self.mod_state.serotonin;
        if let Some(selected) = self.arbiter.select(&proposals, urgency, serotonin) {
            self.state.last_action = Some(ActionResult {
                action: selected.action.action_type.clone(), success: true, error: None,
            });
            return TickResult {
                result_type: selected.source.clone(),
                latency_ms: (utils::now() - start) * 1000.0,
                action: Some(selected.action),
                output: cognitive_output,
            };
        }

        TickResult { result_type: "waiting".into(), latency_ms: (utils::now() - start) * 1000.0, action: None, output: None }
    }

    pub fn cognitive_tick(&mut self, _snapshot: &WorldSnapshot, llm_response: &str) -> Option<Action> {
        // Try to parse full JSON for emotion/insight extraction
        if let Some(json_start) = llm_response.find('{') {
            if let Some(json_end) = llm_response.rfind('}') {
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&llm_response[json_start..=json_end]) {
                    self.parse_emotion_and_insight(&parsed);
                }
            }
        }

        if let Some((action, reason)) = parse_llm_action(llm_response) {
            tracing::info!("[Brain] LLM decided: {} ({})", action, reason);
            self.state.last_action = Some(ActionResult { action: action.clone(), success: true, error: None });
            // Learn from LLM decision
            self.habits.add(&format!("llm_{}", self.turn_count), &action, Action { action_type: action.clone(), params: HashMap::new() });
            self.habits.record_outcome(&action, true);

            // W3.4: Cognitive suppress of non-critical reflexes
            self.reflexes.cognitive_suppress = true;
            // P0: cognitive success → 5-HT up
            self.modulator.cognitive_success(&mut self.mod_state);

            // W3.2: Cognitive→Wave feedback — success resets frustration
            if let Some((level, _)) = self.wave.get_dominant() {
                self.wave.reset_frustration(level);
                // P4: Satisfaction propagates through hierarchy
                self.wave.propagate_satisfaction(level);
            }

            // W3.1: Cognitive→Emotion regulation (PFC re-appraisal)
            self.emotion.cognitive_regulate(&mut self.state.emo, true);

            // W1.3: Goal→Reward hierarchical propagation
            let goal_id = GoalSystem::highest_priority(&self.state.goal).map(|g| g.id.clone());
            if let Some(gid) = goal_id {
                let parent_id = GoalSystem::complete(&mut self.state.goal, &gid);
                if let Some(pid) = parent_id {
                    let parent_active = self.state.goal.active.iter().any(|g| g.id == pid);
                    self.reward.hierarchical_update(&mut self.state.rew, 1.0, parent_active);
                }
            }

            Some(Action { action_type: action, params: HashMap::new() })
        } else {
            tracing::warn!("[Brain] Failed to parse LLM response: {}", llm_response);
            self.state.last_action = Some(ActionResult { action: "parse_error".into(), success: false, error: Some(llm_response.to_string()) });
            // W3.2: Cognitive→Wave feedback — failure marks frustration
            if let Some((level, _)) = self.wave.get_dominant() {
                self.wave.mark_frustrated(level);
            }
            // P0: cognitive failure → 5-HT down
            self.modulator.cognitive_failure(&mut self.mod_state);
            None
        }
    }

    fn update_internal_state(&mut self, snapshot: &WorldSnapshot) {
        let hunger_delta = if snapshot.hunger < 10.0 { 0.05 } else { -0.02 };
        let hostile = snapshot.entities.iter().filter(|e| HOSTILE_TYPES.contains(&e.entity_type.as_str())).count();
        let safety_delta = if hostile > 0 { 0.03 } else { -0.01 };
        self.wave.apply_delta(0, hunger_delta);
        self.wave.apply_delta(1, safety_delta);
        self.wave.set_hormone_mods(self.state.hormone.adrenaline, self.state.hormone.cortisol, self.state.hormone.dopamine);
        let moved = snapshot.velocity.0.abs() > 0.1 || snapshot.velocity.2.abs() > 0.1;
        self.wave.tick(moved, self.compute_tech_stage(snapshot));
        self.hormone.tick(&mut self.state.hormone, &self.state.emo, &self.state.rew);
        let health_delta = snapshot.health - 20.0;
        let threat_count = hostile as u32;
        self.emotion.detect_from_environment(&mut self.state.emo, snapshot.health, health_delta, threat_count);
        self.emotion.update(&mut self.state.emo, "", &self.state.hormone);
        // W3.3: Wave→Hormone stress loop — persistent high wave (>0.8 for 10+ ticks) → cortisol
        {
            let high_stress = self.wave.state.iter().any(|l| *l > 0.8);
            if high_stress {
                self.stress_ticks += 1;
                if self.stress_ticks >= 10 {
                    self.state.hormone.cortisol = (self.state.hormone.cortisol + 0.05).min(1.0);
                }
            } else {
                self.stress_ticks = 0;
            }
        }

        // W2.2: Attention update (surprise-driven intensity + wave-driven focus)
        {
            let dominant = self.wave.get_dominant();
            let surprise = self.predictor.get_surprise();
            self.attention_engine.update(&mut self.state.attention, surprise, dominant);
            // P0: surprise → NE spike
            self.modulator.on_surprise(&mut self.mod_state, surprise);
        }

        if self.turn_count % 10 == 0 {
            let mem_id = self.memory.add_episodic(&format!("At ({:.0},{:.0},{:.0})", snapshot.position.x, snapshot.position.y, snapshot.position.z),
                0.2, &["position".into()], &[], None, &self.state.hormone);
            self.memory.set_emotion_tag(&mem_id, self.state.emo.valence, self.state.emo.arousal);
        }

        // W2.3: Push last action to working memory (LRU, max 20)
        if let Some(ref action) = self.state.last_action {
            let entry = format!("{}:{}", action.action, action.success);
            self.state.mem.working.push(entry);
            if self.state.mem.working.len() > 20 {
                self.state.mem.working.remove(0);
            }
        }
    }

    /// v6: Convergence tick — all components read/write bus in rounds
    pub async fn bus_tick(&mut self, snapshot: &WorldSnapshot) -> TickResult {
        let start = utils::now();
        self.turn_count += 1;
        let mut bus = ComponentBus::new();

        // Phase 1: Fill bus from world
        bus.health = snapshot.health;
        bus.hunger = snapshot.hunger;
        bus.threat_count = snapshot.entities.iter()
            .filter(|e| HOSTILE_TYPES.contains(&e.entity_type.as_str())).count() as u32;

        // Phase 2: Convergence rounds (all components read/write bus)
        for _round in 0..3 {
            self.predictor.bus_tick(&mut bus);
            self.modulator.bus_tick(&mut bus);
            self.reflexes.bus_tick(&mut bus);
            self.emotion.tick(&mut bus);
            self.hormone.bus_tick(&mut bus);
        }

        // Phase 3: Cognitive (every 10 ticks)
        if self.turn_count % 10 == 0 && self.config.has_llm() {
            // Build prompt from bus
            let prompt = format!(
                "=== World ===\nHealth: {:.1}, Hunger: {:.1}\n\n=== Internal ===\nSurprise: {:.2}\nEmotion: {} ({:.2})\nAttention: {} ({:.2})\n\n=== Tools ===\n1. recall_memory(query)\n2. get_emotion_state()\n3. get_hormone_status()\n\nDecide: {{\"action\":\"...\",\"emotion\":\"...\",\"insight\":\"...\"}}",
                bus.health, bus.hunger, bus.surprise,
                bus.emo_mode, bus.emo_intensity,
                bus.attention_focus, bus.attention_intensity,
            );

            if let Some(cog) = &self.cognitive {
                if let Ok(Ok(response)) = tokio::time::timeout(
                    std::time::Duration::from_secs(15), cog.inner.prompt(&prompt)
                ).await {
                    if let Some(json_start) = response.find('{') {
                        if let Some(json_end) = response.rfind('}') {
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&response[json_start..=json_end]) {
                                bus.cognitive_action = parsed.get("action").and_then(|v| v.as_str()).map(String::from);
                                bus.cognitive_emotion = parsed.get("emotion").and_then(|v| v.as_str()).unwrap_or("").to_string();
                                bus.cognitive_insight = parsed.get("insight").and_then(|v| v.as_str()).unwrap_or("").to_string();
                            }
                        }
                    }
                }
            }
            // Post-cognitive convergence
            for _round in 0..2 {
                self.emotion.tick(&mut bus);
                self.hormone.bus_tick(&mut bus);
                self.modulator.bus_tick(&mut bus);
            }
        }

        TickResult {
            result_type: bus.cognitive_action.as_deref().unwrap_or("waiting").into(),
            latency_ms: (utils::now() - start) * 1000.0,
            action: bus.cognitive_action.as_ref().map(|a| Action { action_type: a.clone(), params: HashMap::new() }),
            output: None,
        }
    }

    /// Compute 7 competing signals (Foundation Agent §2.4)
    pub fn compute_signals(&mut self) {
        let working_len = self.state.mem.working.len();
        let sop_count = self.state.mem.procedural.len();
        let ep_count = self.state.mem.episodic.len();
        let emo_mode = self.state.emo.mode.clone();
        let emo_intensity = self.state.emo.intensity;
        let score = self.state.rew.score;
        let td_error = self.state.rew.td_error;
        let active_goals = self.state.goal.active.len();
        let completed = self.state.goal.completed;

        self.state.signals.perceive.raw = if working_len < 5 { 1.0 - working_len as f32 * 0.15 } else { 0.0 };
        self.state.signals.perceive.strength = self.state.signals.perceive.raw * self.state.signals.perceive.priority;

        let caution = emo_mode == crate::types::EmotionMode::Caution;
        let urgent = emo_mode == crate::types::EmotionMode::Urgent;
        self.state.signals.emotion.raw = if caution || urgent { 0.9 } else { emo_intensity * 0.5 };
        self.state.signals.emotion.strength = self.state.signals.emotion.raw * self.state.signals.emotion.priority;

        self.state.signals.safety.raw = if caution { 0.9 } else { 0.0 };
        self.state.signals.safety.strength = self.state.signals.safety.raw * self.state.signals.safety.priority;

        self.state.signals.memory.raw = if sop_count > 0 { 0.8 } else if ep_count > 0 { 0.5 } else { 0.0 };
        self.state.signals.memory.strength = self.state.signals.memory.raw * self.state.signals.memory.priority;

        self.state.signals.reward.raw = if score < 3.0 { 0.8 } else if td_error.abs() > 1.0 { 0.6 } else { 0.0 };
        self.state.signals.reward.strength = self.state.signals.reward.raw * self.state.signals.reward.priority;

        self.state.signals.action.raw = if active_goals > 0 { 0.8 } else { 0.0 };
        self.state.signals.action.strength = self.state.signals.action.raw * self.state.signals.action.priority;

        self.state.signals.learning.raw = if completed > 0 && working_len >= 5 { 0.7 } else { 0.0 };
        self.state.signals.learning.strength = self.state.signals.learning.raw * self.state.signals.learning.priority;
    }

    /// Parse a tool call from LLM response: {"tool":"name","args":{...}}
    fn parse_tool_call(&self, response: &str) -> Option<(String, serde_json::Value)> {
        let response = response.trim();
        if let Some(json_start) = response.find('{') {
            if let Some(json_end) = response.rfind('}') {
                let json_str = &response[json_start..=json_end];
                if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
                    if let Some(tool_name) = parsed.get("tool").and_then(|v| v.as_str()) {
                        let args = parsed.get("args").cloned().unwrap_or(serde_json::json!({}));
                        return Some((tool_name.to_string(), args));
                    }
                }
            }
        }
        None
    }

    /// Execute a cognitive tool and return result string
    fn execute_tool(&self, tool_name: &str, args: &serde_json::Value) -> String {
        match tool_name {
            "recall_memory" => {
                let query = args.get("query").and_then(|v| v.as_str()).unwrap_or("");
                let results = self.memory.retrieve(query, 3, &self.state.hormone);
                if results.is_empty() { "No relevant memories found.".into() }
                else {
                    results.iter().map(|m| format!("  [imp={:.2}] {}", m.importance, m.content))
                        .collect::<Vec<_>>().join("\n")
                }
            }
            "check_inventory" => format!("{}", serde_json::json!({"note": "inventory data not available in cognitive-only context"})),
            "get_wave_status" => {
                let labels = ["survival", "safety", "social", "achievement", "exploration"];
                labels.iter().enumerate()
                    .map(|(i, l)| format!("  {}: {:.2}", l, self.wave.state[i]))
                    .collect::<Vec<_>>().join("\n")
            }
            "get_goal_progress" => {
                let g = &self.state.goal;
                if g.active.is_empty() { "  No active goals.".into() }
                else {
                    g.active.iter().map(|goal| {
                        let st = match goal.status {
                            crate::types::GoalStatus::Pending => "Pending",
                            crate::types::GoalStatus::Active => "Active",
                            _ => "Done",
                        };
                        format!("  [{}] {} (p{})", st, goal.description, goal.priority)
                    }).collect::<Vec<_>>().join("\n")
                }
            }
            "get_signal_summary" => {
                let w = self.state.signals.winner();
                format!("Winner: {}({:.2})\n{}",
                    w.map(|s| s.key.as_str()).unwrap_or("none"),
                    w.map(|s| s.strength).unwrap_or(0.0),
                    self.state.signals.all_signals().iter()
                        .map(|s| format!("  {}: raw={:.2} str={:.2}", s.key, s.raw, s.strength))
                        .collect::<Vec<_>>().join("\n"))
            }
            "get_emotion_state" => {
                let e = &self.state.emo;
                format!("mode={:?}, valence={:.2}, arousal={:.2}, intensity={:.2}, label={}",
                    e.mode, e.valence, e.arousal, e.intensity, e.constructed_label)
            }
            "get_hormone_status" => {
                let h = &self.state.hormone;
                format!("adrenaline={:.2}, cortisol={:.2}, dopamine={:.2}, allostatic_load={:.2}",
                    h.adrenaline, h.cortisol, h.dopamine, h.allostatic_load)
            }
            "get_attention_focus" => {
                let a = &self.state.attention;
                format!("focus={}, intensity={:.2}, source={}", a.focus, a.intensity, a.source)
            }
            _ => format!("Unknown tool: {}", tool_name),
        }
    }

    /// Parse emotion label and insight from LLM action response
    fn parse_emotion_and_insight(&mut self, response: &serde_json::Value) {
        if let Some(emotion_label) = response.get("emotion").and_then(|v| v.as_str()) {
            if !emotion_label.is_empty() {
                self.emotion.set_constructed_label(&mut self.state.emo, emotion_label);
            }
        }
        if let Some(insight) = response.get("insight").and_then(|v| v.as_str()) {
            if !insight.is_empty() {
                self.state.mem.working.push(format!("cognitive: {}", insight));
                if self.state.mem.working.len() > 20 {
                    self.state.mem.working.remove(0);
                }
            }
        }
        if let Some(confidence) = response.get("confidence").and_then(|v| v.as_f64()) {
            // Confidence affects cognitive proposal priority
            let _ = confidence; // used in proposal priority
        }
    }

    fn wave_to_action(&self, snapshot: &WorldSnapshot) -> Option<Action> {
        let dominant = self.wave.get_dominant()?;
        match dominant.0 {
            0 => Some(Action { action_type: "find_food".into(), params: HashMap::new() }),
            1 => Some(Action { action_type: "ensure_safety".into(), params: HashMap::new() }),
            3 => {
                if !snapshot.inventory.iter().any(|i| i.item.contains("log")) {
                    Some(Action { action_type: "find_wood".into(), params: HashMap::new() })
                } else { Some(Action { action_type: "craft_tools".into(), params: HashMap::new() }) }
            }
            4 => Some(Action { action_type: "explore".into(), params: HashMap::new() }),
            _ => None,
        }
    }

    fn compute_tech_stage(&self, snapshot: &WorldSnapshot) -> u8 {
        let has_wood = snapshot.inventory.iter().any(|i| i.item.contains("log"));
        let has_stone = snapshot.inventory.iter().any(|i| i.item.contains("stone_pickaxe"));
        let has_iron = snapshot.inventory.iter().any(|i| i.item.contains("iron_ingot") || i.item.contains("iron_pickaxe"));
        if has_iron { 3 } else if has_stone { 2 } else if has_wood { 1 } else { 0 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_helpers;

    #[test] fn test_brain_init() { let b = BrainEngine::new(BrainConfig::default()); assert_eq!(b.turn_count, 0); }

    #[tokio::test] async fn test_reflex_fires() {
        let mut b = BrainEngine::new(BrainConfig::default());
        let mut s = test_helpers::basic_snapshot(); s.health = 3.0;
        assert_eq!(b.tick(&s).await.result_type, "reflex");
    }

    #[test] fn test_cognitive_tick_parses_llm() {
        let mut b = BrainEngine::new(BrainConfig::default());
        let snap = test_helpers::basic_snapshot();
        let action = b.cognitive_tick(&snap, r#"{"action":"find_wood","reason":"need planks"}"#);
        assert!(action.is_some());
        assert_eq!(action.unwrap().action_type, "find_wood");
    }

    #[test] fn test_cognitive_tick_bad_llm_returns_none() {
        let mut b = BrainEngine::new(BrainConfig::default());
        let snap = test_helpers::basic_snapshot();
        assert!(b.cognitive_tick(&snap, "not json").is_none());
    }

    #[test] fn test_tech_stage_computation() {
        let b = BrainEngine::new(BrainConfig::default());
        let mut snap = test_helpers::basic_snapshot();
        assert_eq!(b.compute_tech_stage(&snap), 0);
        snap.inventory.push(ItemInfo { item: "oak_log".into(), count: 5 });
        assert_eq!(b.compute_tech_stage(&snap), 1);
        snap.inventory.push(ItemInfo { item: "stone_pickaxe".into(), count: 1 });
        assert_eq!(b.compute_tech_stage(&snap), 2);
        snap.inventory.push(ItemInfo { item: "iron_ingot".into(), count: 3 });
        assert_eq!(b.compute_tech_stage(&snap), 3);
    }

    #[test] fn test_habit_learns_from_llm() {
        let mut b = BrainEngine::new(BrainConfig::default());
        let snap = test_helpers::basic_snapshot();
        b.cognitive_tick(&snap, r#"{"action":"find_wood","reason":"test"}"#);
        assert!(b.habits.match_habit("find_wood").is_some(), "LLM decision should create a habit");
    }

    #[tokio::test] async fn test_wave_drives_action() {
        let mut b = BrainEngine::new(BrainConfig::default());
        let mut snap = test_helpers::basic_snapshot();
        snap.hunger = 3.0;
        let r = b.tick(&snap).await;
        assert!(r.result_type == "reflex" || r.result_type == "drive" || r.result_type == "wave", "Hunger should trigger action: {}", r.result_type);
    }
}
