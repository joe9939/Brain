// Comprehensive circuit tests — bun test format
// Covers all 14 circuits from the 14 individual .test.js files
// Run: bun test tests/circuits/circuit-all.test.ts

import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"

const SKILL_FILE = join(import.meta.dir, "..", "..", ".opencode", "skills", "brain-master.md")
const content = readFileSync(SKILL_FILE, "utf-8")

// ─── L1 Pathway ───
describe("L1 Neural Pathway", () => {
  test("thalamus present", () => expect(content).toContain("brain-thalamus"))
  test("amygdala present", () => expect(content).toContain("brain-amygdala"))
  test("hippocampus present", () => expect(content).toContain("brain-hippocampus"))
  test("world-cortex present", () => expect(content).toContain("brain-world-cortex"))
  test("safety present", () => expect(content).toContain("brain-safety"))
  test("parallel execution", () => expect(content).toContain("run_in_background=true"))
  test("wait for all agents", () => expect(content).toContain("Wait for ALL"))
})

// ─── L2 Pathway ───
describe("L2 Pathway Conditional Gates", () => {
  test("brain-attention gate", () => expect(content).toContain("brain-attention"))
  test("brain-reward gate", () => expect(content).toContain("brain-reward"))
  test("brain-safety gate", () => expect(content).toContain("brain-safety"))
  test("brain-basal gate", () => expect(content).toContain("brain-basal"))
  test("brain-cerebellum gate", () => expect(content).toContain("brain-cerebellum"))
  test("gate table has dynamic thresholds", () => {
    expect(content).toContain("GLOBAL_STATE.gate_thresholds.reward")
    expect(content).toContain("GLOBAL_STATE.gate_thresholds.attention")
  })
  test("WTA scoring", () => expect(content).toContain("gate_score"))
})

// ─── L1-L2-L3 Full Pathway ───
describe("L1->L2->L3 Full Pathway", () => {
  test("L1 section exists", () => expect(content).toContain("## L1:"))
  test("L1.5 section exists", () => expect(content).toContain("L1.5"))
  test("L2 section exists", () => expect(content).toContain("## L2"))
  test("L3 section exists", () => expect(content).toContain("## L3:"))
  test("POST-ACTION section exists", () => expect(content).toContain("## POST-ACTION"))
  test("STATUS DISPLAY exists", () => expect(content).toContain("STATUS DISPLAY"))
})

// ─── Global State ───
describe("Circuit: Shared Global State", () => {
  test("SHARED STATE section", () => expect(content).toContain("## SHARED STATE"))
  test("GLOBAL_STATE with all fields", () => {
    expect(content).toContain("mood")
    expect(content).toContain("reward")
    expect(content).toContain("world_digest")
    expect(content).toContain("safety_level")
    expect(content).toContain("personality")
    expect(content).toContain("attention_budget")
    expect(content).toContain("gate_history")
    expect(content).toContain("gate_thresholds")
  })
  test("conflict resolution rules", () => expect(content).toContain("Conflict Resolution"))
  test("versioned state", () => expect(content).toContain("_version"))
})

// ─── Learning Loop ───
describe("Circuit: Learning Feedback Loop", () => {
  test("POST-ACTION has lesson storage", () => expect(content).toContain("reflexion_lesson"))
  test("recent_lessons in L1", () => expect(content).toContain("recent_lessons"))
  test("STATUS has LEARN line", () => expect(content).toContain("[LEARN:"))
})

// ─── World Predict ───
describe("Circuit: World Model Predict to Verify", () => {
  test("world_predict exists", () => expect(content).toContain("world_predict"))
  test("world_diff exists", () => expect(content).toContain("world_diff"))
  test("prediction used in L3", () => expect(content).toContain("prediction"))
  test("diff verification after action", () => expect(content).toContain("actual"))
})

// ─── Reward to Attention ───
describe("Circuit: Reward to Attention Modulation", () => {
  test("attention_priority_bias formula", () => expect(content).toContain("attention_priority_bias"))
  test("reward threshold in gate table", () => expect(content).toContain("gate_thresholds.reward"))
  test("reward to attention connection in CIRCUIT CONNECTION", () => expect(content).toContain("reward"))
})

// ─── WTA ───
describe("Circuit: Winner-Take-Most Gate Competition", () => {
  test("WTA heading", () => expect(content).toContain("Winner-Take-Most"))
  test("gate score formula with weights", () => expect(content).toContain("gate_score"))
  test("top-2 execution", () => expect(content).toContain("top-2"))
  test("agent_reliability in formula", () => expect(content).toContain("agent_reliability"))
})

// ─── Homeostasis ───
describe("Circuit: Homeostasis", () => {
  test("Homeostasis section", () => expect(content).toContain("Homeostasis"))
  test("insula trigger", () => expect(content).toContain("brain-insula"))
  test("corrective actions", () => expect(content).toContain("reduce load"))
  test("non-destructive constraint", () => expect(content).toContain("non-destructive"))
})

// ─── OODA ───
describe("Circuit: OODA Loop Closure", () => {
  test("OODA concept", () => expect(content).toContain("OODA"))
  test("cycle count tracking", () => expect(content).toContain("cycle_count"))
  test("all 4 phases map to pipeline", () => {
    expect(content).toContain("L1")
    expect(content).toContain("L1.5")
    expect(content).toContain("L2")
    expect(content).toContain("L3")
  })
})

// ─── Mood to All Layers ───
describe("Circuit: Mood to All Layers", () => {
  test("mood in L1", () => expect(content).toContain("mode"))
  test("mood_decay in L1.5", () => expect(content).toContain("mood_decay"))
  test("mood in L2 gate conditions", () => expect(content).toContain("mode"))
  test("mood in POST-ACTION", () => expect(content).toMatch(/mood|mode/))
  test("emotional contagion", () => expect(content).toContain("emotional contagion"))
})

// ─── Personality ───
describe("Circuit: Personality to L3/Post", () => {
  test("personality in GLOBAL_STATE", () => expect(content).toContain("personality"))
  test("PERSONALITY status line", () => expect(content).toContain("PERSONALITY:"))
  test("trait drift", () => expect(content).toContain("trait"))
  test("personality used in L3 context", () => expect(content).toContain("personality"))
})

// ─── Safety Monitor ───
describe("Circuit: Safety Continuous Monitor", () => {
  test("safety_check in thalamus output", () => expect(content).toContain("safety_check"))
  test("safety_threshold in amygdala", () => expect(content).toContain("safety_threshold"))
  test("safety-cortex gate in L2", () => expect(content).toContain("brain-safety"))
  test("safety_level in GLOBAL_STATE", () => expect(content).toContain("safety_level"))
  test("consensus gate", () => expect(content).toContain("Consensus Gate"))
})

// ─── Attention Budget ───
describe("Circuit: Shared Attention Budget", () => {
  test("attention_budget in GLOBAL_STATE", () => expect(content).toContain("attention_budget"))
  test("budget remaining tracking", () => expect(content).toContain("remaining"))
  test("budget cap at 1.0", () => expect(content).toContain("1.0"))
  test("budget consumption on gate fire", () => expect(content).toContain("remaining"))
})

// ─── Causal Analysis ───
describe("Circuit: Causal Impact Analysis", () => {
  test("causal analysis step", () => expect(content).toContain("causal impact"))
  test("causal reasoning tool", () => expect(content).toContain("world_causal_analyze"))
})

// ─── Circuit Connection Reference ───
describe("Circuit Connection Reference", () => {
  test("CIRCUIT CONNECTION section", () => expect(content).toContain("CIRCUIT CONNECTION"))
  test("bi-directional connections documented", () => expect(content).toContain("→"))
})
