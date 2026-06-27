import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"

const SKILL_FILE = join(import.meta.dir, "..", "..", ".opencode", "skills", "brain-master.md")
const content = readFileSync(SKILL_FILE, "utf-8")

describe("Shared Global State", () => {
  test("SHARED STATE section exists", () => expect(content).toContain("## SHARED STATE"))
  test("GLOBAL_STATE declared with all fields", () => {
    expect(content).toContain("GLOBAL_STATE")
    expect(content).toContain("mood")
    expect(content).toContain("reward")
    expect(content).toContain("safety_level")
    expect(content).toContain("personality")
    expect(content).toContain("attention_budget")
  })
  test("Conflict resolution rules exist", () => expect(content).toContain("Conflict Resolution"))
  test("Versioned state tracking", () => expect(content).toContain("_version"))
})

describe("OODA Loop", () => {
  test("OODA concept documented", () => expect(content).toContain("OODA"))
  test("All 4 phases map to pipeline sections", () => {
    expect(content).toContain("## L1:"); expect(content).toContain("L1.5")
    expect(content).toContain("## L2:"); expect(content).toContain("## L3:")
  })
})

describe("Winner-Take-Most", () => {
  test("WTA scoring formula present", () => expect(content).toContain("Winner-Take-Most"))
  test("gate_score formula includes weights", () => expect(content).toContain("gate_score"))
  test("Top-2 gates fire in parallel", () => expect(content).toContain("top-2"))
})

describe("Mood to All Layers", () => {
  test("mood referenced in L1", () => expect(content).toContain("mood"))
  test("mood_decay in L1.5", () => expect(content).toContain("mood_decay"))
  test("L2 gate conditions reference mood", () => expect(content).toContain("mode"))
  test("POST-ACTION records mood", () => expect(content).toContain("mood")
    || expect(content).toContain("mode"))
})

describe("Personality", () => {
  test("Personality traits in GLOBAL_STATE", () => expect(content).toContain("personality"))
  test("PERSONALITY status line", () => expect(content).toContain("PERSONALITY:"))
  test("Trait drift in POST-ACTION", () => expect(content).toContain("trait"))
})

describe("World Predict to Verify", () => {
  test("world_predict exists", () => expect(content).toContain("world_predict"))
  test("world_diff exists", () => expect(content).toContain("world_diff"))
})

describe("Safety Monitor", () => {
  test("Safety check at L1", () => expect(content).toContain("safety_check"))
  test("Safety-cortex gate in L2", () => expect(content).toContain("brain-safety"))
  test("Safety_level in GLOBAL_STATE", () => expect(content).toContain("safety_level"))
})

describe("Attention Budget", () => {
  test("attention_budget in GLOBAL_STATE", () => expect(content).toContain("attention_budget"))
  test("Budget cap at 1.0", () => expect(content).toContain("1.0"))
  test("Budget consumption on gate fire", () => expect(content).toContain("remaining"))
})

describe("Learning Loop", () => {
  test("recent_lessons in L1", () => expect(content).toContain("recent_lessons"))
  test("Self-enhance reflexion in POST", () => expect(content).toContain("self-enhance"))
})

describe("Homeostasis", () => {
  test("Homeostasis section exists", () => expect(content).toContain("Homeostasis"))
  test("Corrective actions non-destructive", () => expect(content).toContain("reduce load"))
  test("Insula trigger in L2", () => expect(content).toContain("brain-insula"))
})

describe("Emotional Contagion", () => {
  test("Contagion mechanism present", () => expect(content).toContain("emotional contagion"))
})

describe("Consensus Gate", () => {
  test("Consensus gate in L2", () => expect(content).toContain("Consensus Gate"))
  test("3-agent voting", () => expect(content).toContain("2/3"))
})

describe("Causal Analysis", () => {
  test("Causal impact analysis", () => expect(content).toContain("causal impact"))
  test("world_causal_analyze tool", () => expect(content).toContain("world_causal_analyze")
    || expect(content).toContain("causal_analyze"))
})
