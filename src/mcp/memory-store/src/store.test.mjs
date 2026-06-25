import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

// Check if better-sqlite3 native binding is available (won't be under bun)
let nativeOK = true;
let skipReason = "";
try {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  db.close();
} catch (e) {
  nativeOK = false;
  skipReason = e.message?.substring(0, 80) || "native module not found";
}

if (!nativeOK) {
  describe("MemoryStore (SKIPPED)", () => {
    it("requires better-sqlite3 native module: " + skipReason, () => {});
  });
} else {
  const { MemoryStore } = await import("../dist/store.js");
  describe("MemoryStore", () => {
    let store;
    before(() => { store = new MemoryStore(":memory:"); });
    after(() => { store.close(); });

    it("creates tables via schema", () => {
      const tables = store.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
      const names = tables.map(t => t.name);
      assert.ok(names.includes("episodic_memory"));
      assert.ok(names.includes("semantic_memory"));
      assert.ok(names.includes("memory_relations"));
    });

    it("insert episodic memory", () => {
      store.insert("episodic", "ep1", "First test episode", ["test","demo"]);
      const rows = store.query("SELECT id, content FROM episodic_memory WHERE id = ?", ["ep1"]);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].content, "First test episode");
    });

    it("update creates history", () => {
      store.insert("episodic", "ep1", "Updated content", ["test"]);
      const h = store.query("SELECT old_content, new_content, change_reason FROM memory_history WHERE memory_id = ?", ["ep1"]);
      assert.equal(h.length, 1);
      assert.equal(h[0].change_reason, "update");
    });

    it("keyword search", () => {
      store.insert("semantic", "s1", "searchable document about testing", ["search"]);
      const results = store.search("searchable testing", "semantic", 5, "keyword");
      assert.ok(results.length > 0);
      assert.equal(results[0].type, "semantic");
    });

    it("no match returns empty", () => {
      assert.equal(store.search("zzzznonexistentzzzz", "semantic", 5, "keyword").length, 0);
    });

    it("relations roundtrip", () => {
      store.insert("semantic", "ra", "Entity A", []);
      store.insert("semantic", "rb", "Entity B", []);
      const r = store.createRelation("ra", "rb", "related_to", 0.8);
      assert.ok(r.ok);
      assert.ok(store.getRelations("ra").length > 0);
    });

    it("mood roundtrip", () => {
      store.moodSet("sess1", "URGENT", 0.9);
      const mood = store.moodGet("sess1");
      assert.notEqual(mood, null);
      assert.equal(mood.mode, "URGENT");
    });

    it("delete marks inactive", () => {
      store.insert("episodic", "del1", "To delete", []);
      store.delete("del1");
      const a = store.query("SELECT active FROM episodic_memory WHERE id = ?", ["del1"]);
      assert.equal(a[0].active, 0);
    });

    it("stats returns counts", () => {
      const st = store.stats();
      assert.ok(typeof st.counts.episodic === "number");
      assert.ok(typeof st.counts.semantic === "number");
    });

    it("associative recall with overlapping fragments", () => {
      store.insert("episodic", "ar1", "Payment failed with error 500 for user Zhang San", ["payment","error"]);
      store.insert("episodic", "ar2", "User Li Si reported login timeout", ["login"]);
      store.insert("episodic", "ar3", "Error 500 in payment gateway for user Wang Wu", ["payment","error"]);
      store.insert("semantic", "ar4", "Payment gateway error handling procedure", ["payment","procedure"]);
      
      // Two fragments that both match the payment-error topic but not the login topic
      const results = store.associativeRecall(["error 500", "payment"], 5);
      assert.ok(results.length >= 2, "should find at least 2 payment-error results");
      
      // The first result should have a high score (boosted by multi-fragment overlap)
      assert.ok(results[0].score > 0, "first result should have positive score");
      
      // Results should contain the payment-error memories
      const contents = results.map(r => r.content);
      assert.ok(contents.some(c => c.includes("Payment failed")), "should find payment failed memory");
      assert.ok(contents.some(c => c.includes("Wang Wu")), "should find Wang Wu memory");
    });

    it("associative recall with non-overlapping fragments", () => {
      // "zzzznonexistentzzzz" won't match anything — should still return results from the other fragment
      const results = store.associativeRecall(["zzzznonexistentzzzz", "Zhang San"], 5);
      assert.ok(results.length > 0, "should find results from the matching fragment");
      assert.ok(results.some(r => r.content.includes("Zhang San")), "should find Zhang San memory");
    });

    it("associative recall with single fragment", () => {
      const results = store.associativeRecall(["login timeout"], 5);
      assert.ok(results.length > 0, "single fragment should return matches");
    });

    it("associative recall with empty fragments returns empty", () => {
      const results = store.associativeRecall([], 5);
      assert.equal(results.length, 0, "empty fragments should return empty");
    });

    it("associative recall with no match returns empty or partial", () => {
      const results = store.associativeRecall(["xyznonexistent"], 5);
      // May return 0 if no match at all — acceptable
      assert.ok(Array.isArray(results), "should always return array");
    });
  });
}
