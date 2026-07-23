//! LLM Integration Layer — cognitive agent session registry
//! The brain's cognitive component gets its own rig Agent with dedicated preamble.

use rig_core::agent::Agent;
use rig_core::providers::deepseek;
use rig_core::client::CompletionClient;
use serde::{Deserialize, Serialize};

// ── LLM Provider ──

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub enum LlmProvider {
    DeepSeek,
    OpenAI,
    Ollama,
}

impl Default for LlmProvider {
    fn default() -> Self { Self::DeepSeek }
}

impl LlmProvider {
    pub fn default_base_url(&self) -> &str {
        match self {
            Self::DeepSeek => "https://api.deepseek.com/v1",
            Self::OpenAI => "https://api.openai.com/v1",
            Self::Ollama => "http://localhost:11434/v1",
        }
    }

    pub fn default_model(&self) -> &str {
        match self {
            Self::DeepSeek => "deepseek-chat",
            Self::OpenAI => "gpt-4o-mini",
            Self::Ollama => "llama3.2",
        }
    }
}

// ── System Preamble ──

/// Cognitive layer — decides next action from world + brain state.
/// Can call tools to query internal brain modules for more information.
pub const COGNITIVE_PREAMBLE: &str = r#"You are an autonomous Minecraft bot's cognitive layer (PFC).

Available actions: find_food, find_wood, explore, flee, craft_tools, eat, attack, mine_ore, build_shelter, sleep, goto_player, follow, collect, place_block, smelt_ore, enchant, trade, fish

You have access to internal brain modules via tool calls.
To call a tool, output: {"tool":"tool_name","args":{...}}
The tool result will be provided in the next message.
When ready to decide, output: {"action":"...","reason":"...","emotion":"...","insight":"..."}

=== EMOTION CONSTRUCTION ===
After deciding, label your current emotional state (emotion field):
- This is Barrett's constructed emotion: core_affect + conceptual_label
- Examples: "frustrated_from_failure", "anxious_about_health", "curious_about_exploration", "satisfied_with_progress", "fearful_of_threats"
- The label will be written to the emotion system and affects future processing

=== INSIGHT ===
The insight field writes to working memory (lasting ~20 ticks).
Use it to record important observations for future reference.

Available tools:
1. recall_memory(query): Search episodic memory for relevant past events
2. check_inventory(item): Check if you have a specific item
3. get_wave_status(): Get current need/motivation state (5 needs)
4. get_goal_progress(): Check active goal progress
5. get_signal_summary(): Get current signal competition state
6. get_emotion_state(): Get current emotion: valence, arousal, mode, constructed_label
7. get_hormone_status(): Get adrenaline, cortisol, dopamine levels
8. get_attention_focus(): Get current attention focus and intensity

Rules:
- Prioritize survival (health < 5, hunger < 3) above all else.
- If healthy and fed, progress through tech tree.
- Use tools to gather information before deciding.
- Always include emotion and insight in your final output.
- Keep reasoning concise."#;

// ── Cognitive Agent ──

/// Holds the single cognitive agent with dedicated preamble.
pub struct CognitiveAgent {
    pub inner: Agent<deepseek::CompletionModel>,
}

impl CognitiveAgent {
    /// Build the cognitive agent from deepseek credentials.
    pub async fn build(
        api_key: &str,
        model: &str,
        base_url: &str,
    ) -> Result<Self, String> {
        let client = deepseek::Client::builder()
            .api_key(api_key)
            .base_url(base_url)
            .build()
            .map_err(|e| format!("DeepSeek client: {}", e))?;

        let agent = client.agent(model)
            .preamble(COGNITIVE_PREAMBLE)
            .max_tokens(256)
            .build();

        Ok(Self { inner: agent })
    }
}

// ── LLM Context ──

pub struct LlmContext {
    world_context: String,
    emotional_context: String,
    mental_context: String,
    wave_context: String,
    working_memory: Vec<String>,
    dynamic_prompt: String,
}

impl LlmContext {
    pub fn build(
        snapshot: &crate::types::WorldSnapshot,
        state: &super::types::MentalState,
        dominant: Option<(usize, f32)>,
    ) -> Self {
        // Build world context
        let world_context = format!(
            "Position: ({:.1}, {:.1}, {:.1})\nHealth: {:.1}/20\nHunger: {:.1}/20\nOxygen: {:.1}/20\nEntities nearby: {}\nInventory: {} items",
            snapshot.position.x, snapshot.position.y, snapshot.position.z,
            snapshot.health, snapshot.hunger, snapshot.oxygen,
            snapshot.entities.len(), snapshot.inventory.len(),
        );

        // Emotional context
        let emotional_context = format!(
            "Valence: {:.2}, Arousal: {:.2}, Dominance: {:.2}",
            state.emo.valence, state.emo.arousal, state.emo.dominance,
        );

        // Mental state context
        let mental_context = format!(
            "Last action: {:?}\nHormones - Adrenaline: {:.2}, Cortisol: {:.2}, Dopamine: {:.2}",
            state.last_action, state.hormone.adrenaline, state.hormone.cortisol, state.hormone.dopamine,
        );

        // Wave/need context
        let wave_context = match dominant {
            Some((idx, intensity)) => format!(
                "Dominant need: wave_{} (intensity: {:.2})",
                idx, intensity,
            ),
            None => "No dominant need".into(),
        };

        // W2.3: Working memory (last 5 entries)
        let working_memory: Vec<String> = state.mem.working.iter().rev().take(5).cloned().collect();
        let working_context = if working_memory.is_empty() {
            "No recent actions.".to_string()
        } else {
            format!("Recent context:\n- {}", working_memory.join("\n- "))
        };

        // W2.2: Attention context
        let attention_context = format!(
            "Attention focus: {} (intensity: {:.2})",
            state.attention.focus, state.attention.intensity,
        );

        // Signal Bus context
        let winner = state.signals.winner();
        let signals_context = format!(
            "=== Signal Competition ===\nWinner: {} ({:.2})\n{}",
            winner.map(|w| w.key.as_str()).unwrap_or("none"),
            winner.map(|w| w.strength).unwrap_or(0.0),
            state.signals.all_signals().iter()
                .map(|s| format!("  {}: raw={:.2} str={:.2}", s.key, s.raw, s.strength))
                .collect::<Vec<_>>().join("\n"),
        );

        let dynamic_prompt = format!(
            "=== World ===\n{}\n\n=== Emotions ===\n{}\n\n=== Mental State ===\n{}\n\n=== Needs ===\n{}\n\n=== Attention ===\n{}\n\n=== Working Memory ===\n{}\n\n{}\n\nRespond with ONE action as JSON.",
            world_context, emotional_context, mental_context, wave_context,
            attention_context, working_context, signals_context,
        );

        Self {
            world_context,
            emotional_context,
            mental_context,
            wave_context,
            working_memory,
            dynamic_prompt,
        }
    }

    pub fn to_dynamic_prompt(&self) -> String {
        self.dynamic_prompt.clone()
    }

    pub fn to_prompt(&self) -> String {
        self.to_dynamic_prompt()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test] fn test_provider_defaults() {
        assert_eq!(LlmProvider::DeepSeek.default_base_url(), "https://api.deepseek.com/v1");
        assert_eq!(LlmProvider::OpenAI.default_base_url(), "https://api.openai.com/v1");
        assert_eq!(LlmProvider::Ollama.default_base_url(), "http://localhost:11434/v1");
        assert_eq!(LlmProvider::default(), LlmProvider::DeepSeek);
        assert_eq!(LlmProvider::OpenAI.default_model(), "gpt-4o-mini");
        assert_eq!(LlmProvider::Ollama.default_model(), "llama3.2");
    }

    #[test] fn test_brain_config_custom_provider() {
        use crate::brain::BrainConfig;
        let cfg = BrainConfig {
            llm_api_key: Some("test".into()),
            llm_base_url: "https://custom.api.com/v1".into(),
            llm_model: "custom-model".into(),
            llm_provider: LlmProvider::OpenAI,
        };
        assert_eq!(cfg.llm_provider, LlmProvider::OpenAI);
        assert_eq!(cfg.llm_base_url, "https://custom.api.com/v1");
    }
}

/// Parse a JSON LLM response into an action + reason.
pub fn parse_llm_action(response: &str) -> Option<(String, String)> {
    let response = response.trim();
    // Try JSON extraction
    if let Some(json_start) = response.find('{') {
        if let Some(json_end) = response.rfind('}') {
            let json_str = &response[json_start..=json_end];
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(json_str) {
                let action = parsed.get("action")?.as_str()?.to_string();
                let reason = parsed.get("reason")
                    .and_then(|v| v.as_str())
                    .unwrap_or("llm")
                    .to_string();
                return Some((action, reason));
            }
        }
    }
    // Fallback: use the whole response as action
    None
}
