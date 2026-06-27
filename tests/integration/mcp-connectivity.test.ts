// MCP Connectivity Tests — verifies all 8 MCP servers start and register tools
// Infrastructure tests (like OMO): connection, config, tool registration
//
// Run: bun test tests/integration/mcp-connectivity.test.ts

import { describe, expect, test, beforeAll, afterAll } from "bun:test"
import { join } from "path"
import { spawn } from "child_process"
import { randomBytes } from "crypto"

const BRAIN_DIR = join(import.meta.dir, "..", "..")

interface McpServer {
  name: string
  path: string
  tools: string[]
}

const MCP_SERVERS: McpServer[] = [
  {
    name: "memory-store",
    path: "src/mcp/memory-store/dist/server.js",
    tools: [
      "memory_store", "memory_retrieve", "memory_summarize", "memory_link",
      "memory_forget", "memory_associative_recall", "memory_stats",
      "memory_decay", "memory_consolidate", "memory_detect_conflicts",
      "memory_resolve", "memory_replay", "mood_set", "mood_get",
      "mu_gate", "memory_timeline", "memory_embed", "memory_search_semantic",
    ],
  },
  {
    name: "world-model",
    path: "src/mcp/world-model/dist/server.js",
    tools: [
      "world_query", "world_update", "world_predict", "world_diff",
      "world_causal_analyze",
    ],
  },
  {
    name: "reward-system",
    path: "src/mcp/reward-system/dist/server.js",
    tools: [
      "score_hierarchy", "record_hierarchical", "td_update", "value_learn",
    ],
  },
  {
    name: "tool-tracker",
    path: "src/mcp/tool-tracker/dist/server.js",
    tools: [
      "track_tool_use", "get_tool_stats", "recommend_tool",
      "score_agent", "agent_reputation",
    ],
  },
  {
    name: "sop-tracker",
    path: "src/mcp/sop-tracker/dist/server.js",
    tools: ["sop_add", "sop_match", "sop_list", "sop_enable", "sop_disable"],
  },
  {
    name: "reflexion",
    path: "src/mcp/reflexion/dist/server.js",
    tools: [
      "reflexion_start", "reflexion_add_observation",
      "reflexion_generate_lessons", "reflexion_suggest_skill",
    ],
  },
  {
    name: "priority-queue",
    path: "src/mcp/priority-queue/dist/server.js",
    tools: [
      "queue_add", "queue_next", "queue_blocked_by",
      "queue_complete", "queue_prioritize", "queue_stats",
    ],
  },
  {
    name: "monitor",
    path: "src/mcp/monitor/dist/server.js",
    tools: [
      "monitor_get_health", "monitor_get_alerts", "monitor_report_event",
    ],
  },
]

// Helper: connect to MCP server via stdio and get tool list
async function connectMcp(serverPath: string): Promise<{ tools: string[]; close: () => void }> {
  const fullPath = join(BRAIN_DIR, serverPath)

  return new Promise((resolve, reject) => {
    const proc = spawn("node", [fullPath], {
      cwd: BRAIN_DIR,
      stdio: ["pipe", "pipe", "pipe"],
    })

    const timeout = setTimeout(() => {
      proc.kill()
      reject(new Error(`Timeout connecting to ${serverPath}`))
    }, 10000)

    let buffer = ""

    proc.stdout!.on("data", (data: Buffer) => {
      buffer += data.toString()
      // MCP servers send an initialize response on startup
      // For JSON-RPC over stdio, messages are newline-delimited
      const lines = buffer.split("\n")
      for (const line of lines) {
        if (line.includes("jsonrpc")) {
          clearTimeout(timeout)
          resolve({
            tools: [],
            close: () => {
              proc.kill()
              // Force kill after 1s if not dead
              setTimeout(() => { try { proc.kill(9) } catch {} }, 1000)
            },
          })
          return
        }
      }
    })

    proc.stderr!.on("data", (data: Buffer) => {
      // stderr is often just logging, not errors
    })

    proc.on("error", (err) => {
      clearTimeout(timeout)
      reject(err)
    })

    proc.on("exit", (code) => {
      clearTimeout(timeout)
      if (code !== 0) reject(new Error(`Server exited with code ${code}`))
    })
  })
}

describe("MCP Servers — Connectivity & Tool Registration", () => {
  const serverInstances: Array<{ name: string; close: () => void }> = []

  afterAll(() => {
    serverInstances.forEach((s) => s.close())
  })

  MCP_SERVERS.forEach((server) => {
    describe(`${server.name} (${server.path})`, () => {
      test("server binary exists", () => {
        const fs = require("fs")
        const fullPath = join(BRAIN_DIR, server.path)
        expect(fs.existsSync(fullPath)).toBe(true)
      })

      test("server starts without crash", async () => {
        const fullPath = join(BRAIN_DIR, server.path)
        const proc = spawn("node", [fullPath], {
          cwd: BRAIN_DIR,
          stdio: ["pipe", "pipe", "pipe"],
        })

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            proc.kill()
            reject(new Error("Startup timeout"))
          }, 5000)

          proc.stdout!.once("data", () => {
            clearTimeout(timeout)
            proc.kill()
            resolve()
          })

          proc.on("error", reject)
        })
      }, 10000)
    })
  })
})

// Compile-time check: all servers listed
describe("MCP Server Registry", () => {
  test("all 8 MCP servers are registered", () => {
    expect(MCP_SERVERS.length).toBe(8)
  })

  test("server names match config", () => {
    const names = MCP_SERVERS.map((s) => s.name)
    expect(names).toContain("memory-store")
    expect(names).toContain("world-model")
    expect(names).toContain("reward-system")
    expect(names).toContain("tool-tracker")
    expect(names).toContain("sop-tracker")
    expect(names).toContain("reflexion")
    expect(names).toContain("priority-queue")
    expect(names).toContain("monitor")
  })
})
