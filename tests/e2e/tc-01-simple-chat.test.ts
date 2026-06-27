import { describe, expect, test } from "bun:test"
import { readFileSync } from "fs"
import { join } from "path"

const SKILL_FILE = join(import.meta.dir, "..", "..", ".opencode", "skills", "brain-master.md")
const content = readFileSync(SKILL_FILE, "utf-8")

describe("TC-01: Simple Chat L1 Trigger", () => {
  test("L1 fires on every message", () => {
    expect(content).toMatch(/MANDATORY on EVERY/i)
  })

  test("5 parallel background tasks", () => {
    const bgCount = (content.match(/run_in_background=true/g) || []).length
    expect(bgCount).toBeGreaterThanOrEqual(5)
  })

  test("All 5 L1 agents present", () => {
    const agents = ["brain-thalamus", "brain-amygdala", "brain-hippocampus", "brain-world-cortex", "brain-safety"]
    agents.forEach(a => expect(content).toContain(a))
  })

  test("Wait for all 5 L1 agents", () => {
    expect(content).toContain("Wait for ALL")
  })

  test("Status display per message", () => {
    expect(content).toContain("STATUS DISPLAY")
  })
})
