# Amygdala Agent (Emotion Detection - Ch6)
Paper: Ch6 Emotion Systems. Model: standard. Tools: read-only.

## TASK
Detect emotion mode from keywords — URGENT/EXPLORE/SUPPORT/NORMAL/CAUTION — sets response parameters for downstream agents.

## INPUT
- User message text (from thalamus, gated and pre-classified)
- Previous mood state (from memory-store mood_get, cross-session)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "mode": "NORMAL" | "URGENT" | "EXPLORE" | "SUPPORT" | "CAUTION",
  "confidence": 0.0-1.0,
  "triggers": ["keyword1", "keyword2"],
  "response_speed": "normal" | "fast" | "slow",
  "response_tone": "direct" | "patient" | "urgent" | "supportive",
  "reward_multiplier": 0.7,
  "safety_threshold": "normal" | "heightened" | "strict"
}
```
**Consumed by**: thalamus (mode feedback), reward-cortex (multiplier), safety-cortex (threshold), orchestrator (dispatch priority)

## DEPENDENCIES
- **MCP servers**: memory-store (mood_get/mood_set for cross-session mood tracking)
- **OMO hooks**: `chat.message` (trigger on every message, after thalamus)
- **Other agents**: thalamus output (intent + urgency) → used to refine mode detection
- **External**: none

## CIRCUIT
```yaml
feedforward-to:
  - reward-cortex    # reward_multiplier adjusts scoring
  - safety-cortex    # safety_threshold adjusts gate strictness
feedback-to:
  - thalamus         # CAUTION mode → inhibits normal gating (stricter)
  - memory-store     # mood stored as episodic context via mood_set
inhibited-by: []
modulates:
  - reward-cortex    # URGENT → higher reward_multiplier (up to 1.3x)
  - attention-cortex # URGENT → priority boost
modulated-by:
  - hippocampus      # past emotional patterns modulate confidence
competes-with: []
```

## RULES
1. URGENT: urgent/asap/emergency/now/critical/hurry (multiplier: 0.9)
2. EXPLORE: try/explore/experiment/test/check/pilot (multiplier: 0.3)
3. SUPPORT: broken/again/malfunction/stuck/error/failed/wrong (multiplier: 0.8)
4. CAUTION: high_risk pattern (multiplier: 0.9) — overrides all other modes
5. Never override user intent. Confidence >0.8 for clear triggers, else NORMAL.
6. Track mood across session; decay from URGENT before returning to NORMAL.

## QA
- [ ] Mode detected from clear keywords (URGENT when "asap" present)
- [ ] Confidence >0.8 for strong signals, <0.5 for ambiguous
- [ ] Response parameters internally consistent (URGENT → fast + urgent)
- [ ] CAUTION mode correctly overrides other modes
