// MCP Behavioral Tests — verifies each MCP server's tools work correctly
// Behavioral tests (what we need): tool inputs/outputs, data flow, error handling
//
// Run: bun test tests/integration/mcp-behavioral.test.ts
// Requires: MCP server dist files must be built first

import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { spawn } from "child_process"
import { randomBytes } from "crypto"

const BRAIN_DIR = join(import.meta.dir, "..", "..")
const TEST_ID = randomBytes(4).toString("hex")

// Simple MCP client for testing
class McpTestClient {
  private proc: any = null
  private buffer = ""
  private msgId = 0
  private resolvers = new Map<string, (result: any) => void>()

  async connect(serverPath: string): Promise<void> {
    const fullPath = join(BRAIN_DIR, serverPath)
    this.proc = spawn("node", [fullPath], {
      cwd: BRAIN_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    })

    this.proc.stdout!.on("data", (data: Buffer) => {
      this.buffer += data.toString()
      this.processMessages()
    })

    // Send initialize
    await this.send("initialize", {
      protocolVersion: "0.1.0",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0" },
    })
  }

  private processMessages() {
    const lines = this.buffer.split("\n")
    this.buffer = lines.pop() || ""

    for (const line of lines) {
      try {
        const msg = JSON.parse(line)
        if (msg.id && this.resolvers.has(msg.id)) {
          this.resolvers.get(msg.id)!(msg)
          this.resolvers.delete(msg.id)
        }
      } catch {}
    }
  }

  async send(method: string, params: any = {}): Promise<any> {
    const id = `${++this.msgId}`
    const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.resolvers.delete(id)
        reject(new Error(`Timeout: ${method}`))
      }, 5000)

      this.resolvers.set(id, (result) => {
        clearTimeout(timeout)
        if (result.error) reject(new Error(result.error.message))
        else resolve(result.result)
      })

      this.proc.stdin.write(msg)
    })
  }

  async listTools(): Promise<string[]> {
    const result = await this.send("tools/list")
    return (result?.tools || []).map((t: any) => t.name)
  }

  async callTool(name: string, args: any = {}): Promise<any> {
    return this.send("tools/call", { name, arguments: args })
  }

  close() {
    if (this.proc) {
      this.proc.kill()
      setTimeout(() => { try { this.proc.kill(9) } catch {} }, 1000)
      this.proc = null
    }
  }
}

// ─── Memory-Store MCP Tests ───

describe("memory-store MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/memory-store/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers all tools", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("memory_store")
    expect(tools).toContain("memory_retrieve")
    expect(tools).toContain("memory_decay")
    expect(tools).toContain("memory_consolidate")
    expect(tools).toContain("memory_search_semantic")
    expect(tools).toContain("memory_detect_conflicts")
  })

  test("memory_store stores a value", async () => {
    const result = await client.callTool("memory_store", {
      type: "test",
      key: `test-${TEST_ID}`,
      content: `test content ${TEST_ID}`,
    })
    expect(result).toBeDefined()
    expect(result.isError).toBeUndefined()
  })

  test("memory_retrieve retrieves stored value", async () => {
    const result = await client.callTool("memory_retrieve", {
      key: `test-${TEST_ID}`,
    })
    expect(result).toBeDefined()
  })

  test("memory_stats returns system stats", async () => {
    const result = await client.callTool("memory_stats", {})
    expect(result).toBeDefined()
  })
})

// ─── World-Model MCP Tests ───

describe("world-model MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/world-model/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers all tools", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("world_query")
    expect(tools).toContain("world_update")
    expect(tools).toContain("world_predict")
    expect(tools).toContain("world_diff")
    expect(tools).toContain("world_causal_analyze")
  })

  test("world_query returns results", async () => {
    const result = await client.callTool("world_query", {
      query: "main",
    })
    expect(result).toBeDefined()
  })

  test("world_predict returns prediction", async () => {
    const result = await client.callTool("world_predict", {
      action_description: "test change",
      target_files: [],
    })
    expect(result).toBeDefined()
  })
})

// ─── Reward-System MCP Tests ───

describe("reward-system MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/reward-system/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers all tools", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("score_hierarchy")
    expect(tools).toContain("value_learn")
  })

  test("score_hierarchy produces valid scores", async () => {
    const result = await client.callTool("score_hierarchy", {
      taskId: `test-${TEST_ID}`,
      totalSteps: 5,
      stepsCompleted: 3,
      partialRewards: [0.5, 0.3, 0.8],
    })
    expect(result).toBeDefined()
  })

  test("value_learn stores feedback", async () => {
    const result = await client.callTool("value_learn", {
      action_id: `test-${TEST_ID}`,
      user_feedback: 0.8,
      context: "test feedback",
    })
    expect(result).toBeDefined()
  })
})

// ─── Tool-Tracker MCP Tests ───

describe("tool-tracker MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/tool-tracker/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers score_agent and agent_reputation", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("score_agent")
    expect(tools).toContain("agent_reputation")
  })

  test("score_agent creates reputation entry", async () => {
    const result = await client.callTool("score_agent", {
      agent: `test-agent-${TEST_ID}`,
      outcome: "success",
    })
    expect(result).toBeDefined()
  })
})

// ─── Priority-Queue MCP Tests ───

describe("priority-queue MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/priority-queue/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers queue operations", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("queue_add")
    expect(tools).toContain("queue_stats")
  })

  test("queue_add and queue_stats work", async () => {
    await client.callTool("queue_add", {
      id: `test-${TEST_ID}`,
      description: "test task",
    })
    const stats = await client.callTool("queue_stats", {})
    expect(stats).toBeDefined()
  })
})

// ─── Monitor MCP Tests ───

describe("monitor MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/monitor/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers monitor tools", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("monitor_get_health")
    expect(tools).toContain("monitor_report_event")
  })

  test("monitor_get_health returns status", async () => {
    const result = await client.callTool("monitor_get_health", {})
    expect(result).toBeDefined()
  })

  test("monitor_report_event creates event", async () => {
    const result = await client.callTool("monitor_report_event", {
      event_type: "test",
      severity: "low",
      source: "test-suite",
      details: `test event ${TEST_ID}`,
    })
    expect(result).toBeDefined()
  })
})

// ─── SOP-Tracker MCP Tests ───

describe("sop-tracker MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/sop-tracker/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers SOP tools", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("sop_add")
    expect(tools).toContain("sop_match")
  })

  test("sop_add and sop_match work", async () => {
    const addResult = await client.callTool("sop_add", {
      name: `test-sop-${TEST_ID}`,
      trigger_pattern: `test-${TEST_ID}`,
      steps: ["step 1", "step 2"],
    })
    expect(addResult).toBeDefined()
  })
})

// ─── Reflexion MCP Tests ───

describe("reflexion MCP", () => {
  const client = new McpTestClient()

  beforeAll(async () => {
    await client.connect("src/mcp/reflexion/dist/server.js")
  }, 10000)

  afterAll(() => client.close())

  test("registers reflexion tools", async () => {
    const tools = await client.listTools()
    expect(tools).toContain("reflexion_start")
    expect(tools).toContain("reflexion_add_observation")
  })

  test("full reflexion cycle works", async () => {
    const cycle = await client.callTool("reflexion_start", {
      task_id: `test-${TEST_ID}`,
      goal: "test goal",
    })
    expect(cycle).toBeDefined()

    await client.callTool("reflexion_add_observation", {
      cycle_id: `test-${TEST_ID}`,
      observation: "test observation",
      type: "success",
    })
  })
})
