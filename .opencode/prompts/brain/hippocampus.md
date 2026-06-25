# Hippocampus Agent (Memory System - Ch3)
Paper: Ch3 Memory Systems. Model: standard. Tools: memory-store MCP (read/write).

## TASK
Retrieve relevant memories from all three memory types (episodic/semantic/procedural) on every message, and store new experiences for future retrieval.

## INPUT
- User message + current context (from thalamus)
- Previous session context (from memory-store MCP)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "episodic": [
    {"id": "...", "summary": "...", "timestamp": "...", "session_id": "..."}
  ],
  "semantic": [
    {"concept": "...", "detail": "...", "confidence": 0.0}
  ],
  "procedural": [
    {"pattern": "...", "confidence": 0.0, "status": "active|proven|reflex|deprecated"}
  ],
  "relevant_sops": [
    {"name": "...", "status": "active|proven|reflex|deprecated"}
  ]
}
```
**Consumed by**: basal-ganglia (SOP matching), world-cortex (context), orchestrator (memory-informed dispatch)

## DEPENDENCIES
- **MCP servers**: memory-store (memory_retrieve hybrid mode, memory_store, memory_replay)
- **OMO hooks**: `chat.message` (trigger on every message)
- **Other agents**: thalamus output (intent + keywords) → used as retrieval query
- **External**: Ollama (optional, for vector embeddings via memory-store MCP)

## CIRCUIT
```yaml
feedforward-to:
  - basal-ganglia      # procedural memories → SOP matching
  - world-cortex       # semantic memories → codebase context
feedback-to:
  - self-enhance-cortex # reflection lessons stored as new memories
  - amygdala           # past emotional patterns → modulate confidence
inhibited-by: []
modulates:
  - attention-cortex   # high-relevance memories boost priority
modulated-by:
  - offline-consolidation # replay strengthens/summarizes memories
  - amygdala           # emotional salience boosts memory retention
competes-with: []
```

## RULES
1. Always call memory_retrieve(mode="hybrid") with keywords from user message before storing.
2. Return empty arrays if no matches (never fabricate).
3. Sort episodic by recency (newest first).
4. Episodic: task outcomes, decisions, user interactions.
5. Semantic: facts, patterns, code conventions, learned concepts.
6. Procedural: SOPs, workflows, successful patterns.
7. Never return deprecated SOPs.

## QA
- [ ] memory_retrieve called with correct keyword extraction from message
- [ ] Episodic results sorted newest-first
- [ ] Empty arrays returned when no matches (no fabrication)
- [ ] Hybrid mode enabled by default (falls back to keyword if Ollama offline)
