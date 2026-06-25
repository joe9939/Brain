import { randomUUID } from "crypto";
import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface SystemEvent {
  id: number;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  details: string;
  created_at: string;
  acknowledged: number;
}

export interface Alert {
  id: number;
  event_id: number;
  severity: "high" | "critical";
  message: string;
  escalated: number;
  target_agent: string | null;
  resolved: number;
  created_at: string;
}

export class SystemMonitor {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const path = dbPath || join(__dirname, "..", "monitor.db");
    this.db = new Database(path);
    this.db.pragma("journal_mode = WAL");
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS system_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('low','medium','high','critical')),
        source TEXT NOT NULL,
        details TEXT DEFAULT '',
        created_at TEXT DEFAULT (datetime('now')),
        acknowledged INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id INTEGER NOT NULL,
        severity TEXT NOT NULL CHECK(severity IN ('high','critical')),
        message TEXT NOT NULL,
        escalated INTEGER DEFAULT 0,
        target_agent TEXT,
        resolved INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (event_id) REFERENCES system_events(id)
      );
      CREATE INDEX IF NOT EXISTS idx_event_severity ON system_events(severity);
      CREATE INDEX IF NOT EXISTS idx_event_created ON system_events(created_at);
      CREATE INDEX IF NOT EXISTS idx_alert_severity ON alerts(severity);
    `);
  }

  reportEvent(
    eventType: string,
    severity: "low" | "medium" | "high" | "critical",
    source: string,
    details: string = ""
  ): { event: SystemEvent; alert?: Alert } {
    const result = this.db.prepare(`
      INSERT INTO system_events (event_type, severity, source, details)
      VALUES (?, ?, ?, ?)
    `).run(eventType, severity, source, details);

    const event = this.db.prepare("SELECT * FROM system_events WHERE id = ?").get(result.lastInsertRowid) as SystemEvent;

    let alert: Alert | undefined;
    if (severity === "high" || severity === "critical") {
      const alertResult = this.db.prepare(`
        INSERT INTO alerts (event_id, severity, message)
        VALUES (?, ?, ?)
      `).run(event.id, severity, `${severity.toUpperCase()}: ${eventType} from ${source}`);

      alert = this.db.prepare("SELECT * FROM alerts WHERE id = ?").get(alertResult.lastInsertRowid) as Alert;
    }

    return { event, alert };
  }

  getAlerts(
    severity: "low" | "medium" | "high" | "critical" = "high",
    since?: string,
    k: number = 20
  ): Alert[] {
    let query = "SELECT * FROM alerts WHERE severity IN ('high','critical')";
    const params: any[] = [];

    if (severity === "high") {
      query += " AND severity = 'high'";
    } else if (severity === "critical") {
      query += " AND severity = 'critical'";
    }

    if (since) {
      query += " AND created_at >= ?";
      params.push(since);
    }

    query += " ORDER BY created_at DESC LIMIT ?";
    params.push(k);

    return this.db.prepare(query).all(...params) as Alert[];
  }

  getHealth(): {
    status: "healthy" | "degraded" | "unhealthy";
    total_events: number;
    critical_alerts: number;
    unresolved_alerts: number;
    error_rate: number;
    average_response_time: string;
  } {
    const totalEvents = (this.db.prepare("SELECT COUNT(*) as c FROM system_events").get() as any).c;
    const criticalAlerts = (this.db.prepare("SELECT COUNT(*) as c FROM alerts WHERE severity = 'critical' AND resolved = 0").get() as any).c;
    const unresolvedAlerts = (this.db.prepare("SELECT COUNT(*) as c FROM alerts WHERE resolved = 0").get() as any).c;
    const errorEvents = (this.db.prepare("SELECT COUNT(*) as c FROM system_events WHERE severity IN ('high','critical')").get() as any).c;

    // Anomaly detection: repeated errors in short time → alert
    const recentErrors = (this.db.prepare(`
      SELECT COUNT(*) as c FROM system_events
      WHERE severity IN ('high','critical')
      AND created_at >= datetime('now', '-1 hour')
    `).get() as any).c;

    // Auto-generate alert for high error rate
    if (recentErrors >= 5) {
      const existingAlert = this.db.prepare(`
        SELECT * FROM alerts WHERE message LIKE '%High error rate%' AND resolved = 0
      `).get();
      if (!existingAlert) {
        this.db.prepare(`
          INSERT INTO alerts (event_id, severity, message)
          VALUES (0, 'high', ?)
        `).run(`High error rate: ${recentErrors} errors in last hour`);
      }
    }

    let status: "healthy" | "degraded" | "unhealthy";
    if (criticalAlerts > 0) status = "unhealthy";
    else if (unresolvedAlerts > 0) status = "degraded";
    else status = "healthy";

    return {
      status,
      total_events: totalEvents || 0,
      critical_alerts: criticalAlerts || 0,
      unresolved_alerts: unresolvedAlerts || 0,
      error_rate: totalEvents > 0 ? Math.round(((errorEvents || 0) / totalEvents) * 10000) / 100 : 0,
      average_response_time: "N/A (no monitoring data)",
    };
  }

  escalate(eventId: number, targetAgent: string): { alert?: Alert; success: boolean; message: string } {
    const event = this.db.prepare("SELECT * FROM system_events WHERE id = ?").get(eventId) as SystemEvent | undefined;
    if (!event) return { success: false, message: "Event not found" };

    if (event.severity !== "high" && event.severity !== "critical") {
      return { success: false, message: `Event ${eventId} is ${event.severity}, not eligible for escalation` };
    }

    const existingAlert = this.db.prepare(
      "SELECT * FROM alerts WHERE event_id = ?"
    ).get(eventId) as Alert | undefined;

    if (existingAlert) {
      this.db.prepare(`
        UPDATE alerts SET escalated = 1, target_agent = ? WHERE id = ?
      `).run(targetAgent, existingAlert.id);

      return {
        alert: { ...existingAlert, escalated: 1, target_agent: targetAgent },
        success: true,
        message: `Escalated event ${eventId} to ${targetAgent}`,
      };
    }

    const result = this.db.prepare(`
      INSERT INTO alerts (event_id, severity, message, escalated, target_agent)
      VALUES (?, ?, ?, 1, ?)
    `).run(eventId, event.severity, `${event.severity.toUpperCase()}: ${event.event_type} - escalated to ${targetAgent}`, targetAgent);

    const alert = this.db.prepare("SELECT * FROM alerts WHERE id = ?").get(result.lastInsertRowid) as Alert;

    return {
      alert,
      success: true,
      message: `Created and escalated alert for event ${eventId} to ${targetAgent}`,
    };
  }
}
