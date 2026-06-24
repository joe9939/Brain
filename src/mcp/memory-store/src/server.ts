import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemoryStore } from "./store.js";
import { validateContent, validateKey, validateTags } from "./validate.js";
import { extractSummary } from "./summary.js";

const store = new MemoryStore();
const server = new McpServer({ name: "memory-store", version: "1.0.0" });

function ok(data: any) { return { content: [{ type: "text" as const, text: JSON.stringify(data) }] }; }
function err(reason: string) { return { content: [{ type: "text" as const, text: JSON.stringify({ ok: false, reason }) }] }; }

server.tool("memory_store", {
  type: z.enum(["episodic", "semantic", "procedural", "working"]),
  key: z.string(), content: z.string(),
  tags: z.array(z.string()).optional(), session_id: z.string().optional(),
}, async ({ type, key, content, tags }) => {
  try {
    const vc = validateContent(content);
    if (!vc.valid) return err(vc.reason!);
    const vk = validateKey(key);
    if (!vk.valid) return err(vk.reason!);
    if (tags) { const vt = validateTags(tags); if (!vt.valid) return err(vt.reason!); }
    store.insert(type, key, content, tags || []);
    return ok({ ok: true, key });
  } catch (e: any) { return err(e.message || "store failed"); }
});

server.tool("memory_retrieve", {
  query: z.string(), type: z.enum(["episodic","semantic","procedural","working","all"]).default("all"),
  k: z.number().default(5), mode: z.enum(["keyword","vector","hybrid"]).default("keyword"),
}, async ({ query, type, k, mode }) => {
  try {
    const results = store.search(query, type, k, mode);
    return ok({ results: results.map(r => ({ key: r.id, content: r.content, score: Math.round(r.score*100)/100, timestamp: r.last_accessed || r.created_at, access_count: r.access_count })) });
  } catch (e: any) { return err(e.message || "retrieve failed"); }
});

server.tool("memory_summarize", { session_id: z.string() }, async ({ session_id }) => {
  try {
    const summary = extractSummary(session_id);
    store.insert("episodic", `session:${session_id}`, JSON.stringify(summary), ["summary","auto"]);
    return ok({ summary });
  } catch (e: any) { return err(e.message || "summarize failed"); }
});

server.tool("memory_link", {
  from_key: z.string(), to_key: z.string(),
  relation: z.enum(["calls","depends_on","implements","related_to","causes","prevents"]),
  strength: z.number().default(1.0),
}, async ({ from_key, to_key, relation, strength }) => {
  try {
    const result = store.createRelation(from_key, to_key, relation, strength);
    return ok(result);
  } catch (e: any) { return err(e.message || "link failed"); }
});

server.tool("memory_forget", { key: z.string() }, async ({ key }) => {
  try {
    store.delete(key);
    return ok({ ok: true });
  } catch (e: any) { return err(e.message || "forget failed"); }
});

server.tool("memory_stats", {}, async () => {
  try {
    const s = store.stats();
    return ok(s);
  } catch (e: any) { return err(e.message || "stats failed"); }
});

process.on("uncaughtException", (err) => { console.error("FATAL:", err.message); process.exit(1); });
process.on("unhandledRejection", (err) => { console.error("FATAL:", err); process.exit(1); });
process.on("SIGINT", () => { store.close(); process.exit(0); });
process.on("SIGTERM", () => { store.close(); process.exit(0); });


server.tool("memory_timeline", {
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  event_type: z.string().optional(),
  k: z.number().default(20),
}, async ({ from_date, to_date, event_type, k }) => {
  let sql = 'SELECT * FROM timeline_memory WHERE 1=1';
  const params: any[] = [];
  if (from_date) { sql += ' AND timestamp >= ?'; params.push(from_date); }
  if (to_date) { sql += ' AND timestamp <= ?'; params.push(to_date); }
  if (event_type) { sql += ' AND event_type = ?'; params.push(event_type); }
  sql += ' ORDER BY timestamp DESC LIMIT ?'; params.push(k);
  try {
    const rows = store.query(sql, params);
    return ok({ events: rows });
  } catch(e) { return ok({ events: [], note: 'timeline table may not exist yet' }); }
});

const transport = new StdioServerTransport();
await server.connect(transport);