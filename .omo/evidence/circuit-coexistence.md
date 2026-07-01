# Integration: Circuit Coexistence
**Status**: FAIL
**Timestamp**: 2026-06-30T16:49:09.185Z
**Duration**: 4ms

## Circuits found (grep)
- [ ] Shared Global State
- [x] Learning Feedback Loop
- [x] World Model Predict→Verify
- [x] Reward→Attention Modulation
- [ ] Winner-Take-Most
- [x] Homeostasis
- [ ] OODA Loop
- [ ] Mood→All Layers
- [ ] Personality→L3/Post
- [x] Safety Monitor
- [ ] Attention Budget

## Checks
- [x] No duplicate ## section headings
- [ ] Circuit term: Shared Global State
- [x] Circuit term: Learning Feedback Loop
- [x] Circuit term: World Model Predict→Verify
- [x] Circuit term: Reward→Attention Modulation
- [ ] Circuit term: Winner-Take-Most
- [x] Circuit term: Homeostasis
- [ ] Circuit term: OODA Loop
- [ ] Circuit term: Mood→All Layers
- [ ] Circuit term: Personality→L3/Post
- [x] Circuit term: Safety Monitor
- [ ] Circuit term: Attention Budget
- [ ] L1 agents store to memory_store
- [ ] L2 agents read from memory_retrieve
- [ ] MENTAL_STATE fields: 2/6
- [ ]   Missing MENTAL_STATE fields: world_model, safety_level, personality, attention_budget
- [ ] Status lines: 1/8 found
- [ ]   Missing status lines: [L1:, [L1.5:, [L2:, [L3:, [GLOBAL:, [LEARN:, [PERSONALITY:
- [x] Circuit reference rows: 10/12
- [ ]   Missing circuit ref: personality, mood-store
- [x] L2 gate triggers: 5/6
- [x] Inhibit/enable: amygdala -> thalamus (no contradiction)
- [x] Inhibit/enable: safety -> swarm-coder (no contradiction)
- [x] Inhibit/enable: basal -> swarm-coder (no contradiction)
- [x] MENTAL_STATE has read (get)
- [x] MENTAL_STATE has write (set)
- [ ] Correct temporal order: L1 →L1.5 →L2
- [x] File size <= 850 lines (296)
- [x] Balanced code fences (24 backtick triples)

## Failures
- Circuit term: Shared Global State
- Circuit term: Winner-Take-Most
- Circuit term: OODA Loop
- Circuit term: Mood→All Layers
- Circuit term: Personality→L3/Post
- Circuit term: Attention Budget
- L1 agents store to memory_store
- L2 agents read from memory_retrieve
- MENTAL_STATE fields: 2/6
-   Missing MENTAL_STATE fields: world_model, safety_level, personality, attention_budget
- Status lines: 1/8 found
-   Missing status lines: [L1:, [L1.5:, [L2:, [L3:, [GLOBAL:, [LEARN:, [PERSONALITY:
-   Missing circuit ref: personality, mood-store
- Correct temporal order: L1 →L1.5 →L2

## Summary
- Total checks: 29
- Passed: 15
- Failed: 14
- File lines: 296