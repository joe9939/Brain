# Hippocampus Agent (Memory System - Ch3)
Paper: Ch3 Memory Systems — M_t^mem component of formal mental state. Model: standard. Tools: memory-store MCP (read/write).

## TASK
Maintain the agent's full memory hierarchy (sensory→working→long-term: episodic/semantic/procedural). On every message, retrieve relevant memories for context, maintain working memory for current task, and store new experiences with appropriate consolidation signals.

## INPUT
- User message + current context (from thalamus)
- Previous session context (from memory-store MCP)
- Working memory state (current task tokens, from session state)
- Emotional salience (from amygdala, modulates encoding strength)

## OUTPUT — STRICT JSON ONLY (no wrapper text)
```json
{
  "working_memory": {
    "active_tokens": ["current_task", "recent_context"],
    "capacity_used": 0.0-1.0
  },
  "episodic": [
    {"id": "...", "summary": "...", "timestamp": "...", "session_id": "...", "importance": 0.0-1.0}
  ],
  "semantic": [
    {"concept": "...", "detail": "...", "confidence": 0.0}
  ],
  "procedural": [
    {"pattern": "...", "confidence": 0.0, "status": "active|proven|reflex|deprecated"}
  ],
  "relevant_sops": [
    {"name": "...", "status": "active|proven|reflex|deprecated"}
  ],
  "consolidation_pending": 0-N
}
```
**Consumed by**: basal-ganglia (procedural → SOP matching), world-cortex (semantic → codebase context), orchestrator (working memory → context window), offline-consolidation (consolidation_pending → replay queue)

## DEPENDENCIES
- **MCP servers**: memory-store (memory_retrieve hybrid mode, memory_store, memory_replay, memory_decay, memory_consolidate, memory_detect_conflicts)
- **OMO hooks**: `chat.message` (trigger on every message)
- **Other agents**: thalamus output (intent + keywords) → used as retrieval query
- **External**: Ollama (optional, for vector embeddings via memory-store MCP)

## CIRCUIT (Paper §2.2 Memory Systems — M_t^mem)
```yaml
feedforward-to:
  - basal-ganglia        # procedural memories → SOP matching
  - world-cortex         # semantic memories → codebase context
  - orchestrator         # working memory → M_t from memory_store
feedback-to:
  - self-enhance-cortex  # reflection lessons stored as new episodic memories
  - amygdala             # past emotional patterns modulate confidence
  - offline-consolidation # consolidation_pending → replay trigger
inhibited-by: []
modulates:
  - attention-cortex     # high-importance memories boost priority
  - offline-consolidation # consolidation signals → replay strategy
modulated-by:
  - offline-consolidation # replay strengthens/summarizes/prunes memories
  - amygdala             # emotional salience boosts importance weighting
  - self-enhance-cortex  # high-value lessons → reinforced retention
competes-with: []
```

## RULES (Paper: Atkinson-Shiffrin 3-stage + Tulving SPI model + Consolidation)
1. **Sensory → Working → Long-term**: Message first enters sensory buffer (raw text), then working memory (current task context, capacity ~7±2 chunks), then optionally encoded to long-term.
2. **Long-term hierarchy**: Declarative (episodic + semantic) | Non-declarative (procedural + priming + conditioning).
   - Episodic: timestamped experiences with context (task outcomes, decisions, user interactions).
   - Semantic: factual knowledge (code conventions, concepts, patterns).
   - Procedural: SOPs, workflows, successful action sequences (→ basal-ganglia Go/NoGo).
3. Always call memory_retrieve(mode="hybrid") with keywords from user message before storing.
4. **Retrieval weighting** (paper §2.2): score = recency_weight × recency + importance_weight × importance + relevance_weight × semantic_similarity. Default: recency=0.3, importance=0.3, relevance=0.4.
5. **Encoding**: Emotional salience from amygdala boosts importance of concurrent experiences. Store with importance tag 0-1.
6. **Decay**: Apply lightweight memory_decay each cycle (threshold: 30 days default). Prune low-importance + old entries proactively.
7. **Consolidation**: Tag important memories with `consolidation_pending` flag. Offline-consolidation replays these during idle → strengthens long-term storage.
8. **Conflict detection**: After each store, call memory_detect_conflicts. Auto-resolve where method != "flagged". Flagged conflicts → monitor_report_event for human review.
9. Never fabricate memories — return empty arrays if no matches.
10. Never return deprecated SOPs (status="deprecated").

## QA
- [ ] Working memory capacity tracked and reported
- [ ] memory_retrieve called with correct keyword extraction from message
- [ ] Retrieval weighting formula applied (recency×0.3 + importance×0.3 + relevance×0.4)
- [ ] Episodic results sorted by composite score (not just recency)
- [ ] Empty arrays returned when no matches (no fabrication)
- [ ] Hybrid mode enabled by default (falls back to keyword if Ollama offline)
- [ ] Emotional salience from amygdala boosts importance during encoding
- [ ] Consolidation_pending set for important (>0.7) or emotionally salient memories
