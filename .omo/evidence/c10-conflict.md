# C10: Conflict Rules
**Status**: FAIL
**Timestamp**: 2026-07-02T16:36:04.354Z
**Duration**: 0ms

## Checks
- [ ] Conflict Resolution Rules section exists
- [ ] D-K rule header present
- [ ] D-K: attention_budget is outer cap
- [ ] D-K: formula uses min() with attention_budget.remaining
- [ ] D-K: reward modulation mentioned
- [ ] B-J rule header present
- [ ] B-J: CAUTION freezes trait drift
- [ ] B-J: pauses DMN loop
- [ ] B-J: safety_level=CAUTION in rule text
- [ ] H-I rule header present
- [ ] H-I: threshold formula present
- [ ] H-I: uses personality_base
- [ ] H-I: uses mood_offset
- [ ] H-I: clamped [0.0, 1.0] present

## Failures
- Conflict Resolution Rules section exists
- D-K rule header present
- D-K: attention_budget is outer cap
- D-K: formula uses min() with attention_budget.remaining
- D-K: reward modulation mentioned
- B-J rule header present
- B-J: CAUTION freezes trait drift
- B-J: pauses DMN loop
- B-J: safety_level=CAUTION in rule text
- H-I rule header present
- H-I: threshold formula present
- H-I: uses personality_base
- H-I: uses mood_offset
- H-I: clamped [0.0, 1.0] present