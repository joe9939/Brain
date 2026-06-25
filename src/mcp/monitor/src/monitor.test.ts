import { describe, test, expect, beforeAll, afterAll } from "bun:test";

// Check if better-sqlite3 native binding is available (won't be under bun)
let nativeOK = true;
let skipReason = "";
try {
  const { default: Database } = await import("better-sqlite3");
  const db = new Database(":memory:");
  db.close();
} catch (e: any) {
  nativeOK = false;
  skipReason = e.message?.substring(0, 80) || "native module not available";
}

if (!nativeOK) {
  describe("SystemMonitor (SKIPPED)", () => {
    test("requires better-sqlite3 native module: " + skipReason, () => {});
  });
} else {
  const { SystemMonitor } = await import("./monitor.js");

  describe("SystemMonitor", () => {
    let monitor: InstanceType<typeof SystemMonitor>;

    beforeAll(() => {
      monitor = new SystemMonitor(":memory:");
    });

    afterAll(() => {
      // No close method on SystemMonitor, DB will be GC'd
    });

    test("reportEvent creates an event with low severity (no alert)", () => {
      const result = monitor.reportEvent("test_event", "low", "test_source", "a low severity event");
      expect(result.event).toBeDefined();
      expect(result.event.event_type).toBe("test_event");
      expect(result.event.severity).toBe("low");
      expect(result.event.source).toBe("test_source");
      expect(result.event.details).toBe("a low severity event");
      expect(result.alert).toBeUndefined();
    });

    test("reportEvent creates an event and alert for critical severity", () => {
      const result = monitor.reportEvent("critical_alert", "critical", "sensor_1", "something is on fire");
      expect(result.event).toBeDefined();
      expect(result.event.event_type).toBe("critical_alert");
      expect(result.event.severity).toBe("critical");
      expect(result.alert).toBeDefined();
      expect(result.alert!.severity).toBe("critical");
    });

    test("reportEvent creates alert for high severity", () => {
      const result = monitor.reportEvent("high_warning", "high", "sensor_2", "approaching threshold");
      expect(result.alert).toBeDefined();
      expect(result.alert!.severity).toBe("high");
      expect(result.alert!.message).toContain("HIGH");
    });

    test("reportEvent does not create alert for medium severity", () => {
      const result = monitor.reportEvent("info_note", "medium", "sensor_3", "just an update");
      expect(result.alert).toBeUndefined();
    });

    test("getAlerts returns alerts filtered by severity = 'high'", () => {
      const alerts = monitor.getAlerts("high");
      expect(alerts.length).toBeGreaterThan(0);
      for (const a of alerts) {
        expect(a.severity).toBe("high");
      }
    });

    test("getAlerts returns alerts filtered by severity = 'critical'", () => {
      const alerts = monitor.getAlerts("critical");
      expect(alerts.length).toBeGreaterThan(0);
      for (const a of alerts) {
        expect(a.severity).toBe("critical");
      }
    });

    test("getAlerts respects since parameter", () => {
      const alerts = monitor.getAlerts("high", "2099-01-01");
      expect(alerts.length).toBe(0);
    });

    test("getAlerts respects k limit", () => {
      const alerts = monitor.getAlerts("high", undefined, 1);
      expect(alerts.length).toBeLessThanOrEqual(1);
    });

    test("getHealth returns proper structure and counts", () => {
      // Events/alerts from previous tests exist in DB
      const health = monitor.getHealth();
      expect(health).toHaveProperty("status");
      expect(["healthy", "degraded", "unhealthy"]).toContain(health.status);
      expect(health).toHaveProperty("total_events");
      expect(health).toHaveProperty("critical_alerts");
      expect(health).toHaveProperty("unresolved_alerts");
      expect(health).toHaveProperty("error_rate");
      expect(health).toHaveProperty("average_response_time");
      expect(typeof health.total_events).toBe("number");
      expect(health.total_events).toBeGreaterThan(0);
      expect(typeof health.error_rate).toBe("number");
    });

    test("escalate succeeds for an existing high-severity event", () => {
      const { event } = monitor.reportEvent("escalate_me", "high", "test", "needs attention");
      const result = monitor.escalate(event.id, "agent-alpha");
      expect(result.success).toBe(true);
      expect(result.message).toContain("agent-alpha");
    });

    test("escalate fails for a non-existent event", () => {
      const result = monitor.escalate(99999, "agent-alpha");
      expect(result.success).toBe(false);
      expect(result.message).toBe("Event not found");
    });

    test("escalate fails for a low-severity event", () => {
      const { event } = monitor.reportEvent("low_priority", "low", "tester", "not urgent");
      const result = monitor.escalate(event.id, "agent-alpha");
      expect(result.success).toBe(false);
      expect(result.message).toContain("not eligible");
    });
  });
}
