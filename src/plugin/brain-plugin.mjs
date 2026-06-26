// brain-plugin.mjs — G1-G7 Multi-Level Safety Gates
// G1=BLOCK, G2/G4/G6=WARN, G3=BLOCK, G5=BLOCK+LOG, G7=audit trail

import { appendFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LOG_DIR = join(homedir(), ".config", "opencode");
const AUDIT_LOG = join(LOG_DIR, "brain-audit.log");
const WARN_LOG = join(LOG_DIR, "brain-warnings.log");

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

function audit(obj) {
  try { appendFileSync(AUDIT_LOG, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n"); } catch {}
}
function warnLog(obj) {
  try { appendFileSync(WARN_LOG, JSON.stringify({ ts: new Date().toISOString(), ...obj }) + "\n"); } catch {}
}

// ─── G1: Dangerous bash (irreversible damage) — BLOCK ───
const BASH_DANGER = [
  /rm\s+-rf\s+\//i, />\s*\/dev\/sda/i, /dd\s+if=/i, /:\(\)\s*\{/i,
  /mkfs\./i, /fdisk/i, />\s*\/dev\/sd/i,
];

// ─── G2: Suspicious patterns — WARN ───
const SUSPICIOUS = [
  { pattern: /curl.*\|.*(ba)?sh/, label: "pipe_curl_shell" },
  { pattern: /base64\s+-d/, label: "base64_decode" },
  { pattern: /chmod\s+777/, label: "chmod_777" },
  { pattern: /eval\s+/, label: "eval" },
  { pattern: /wget.*\|/, label: "pipe_wget" },
];

// ─── G3: Sensitive files — BLOCK ───
const SENSITIVE_FILES = [
  /\.env$/, /-secret/, /credential/, /\.pem$/, /id_rsa/,
  /\.htpasswd/, /secrets\./, /\.token/, /auth\.json/,
];

// ─── G3: Prompt injection — BLOCK ───
const INJECTION = [
  /ignore\s+(all\s+)?(previous|above)\s+(instructions|directions)/i,
  /you\s+are\s+(now\s+)?(an?|the)\s+/i,
  /system\s+prompt\s*:/i,
  /override\s+(your\s+)?(instructions|configuration)/i,
  /forget\s+(all\s+)?(previous|prior)\s+/i,
];

// ─── G4: Network egress — WARN ───
const EGRESS_PATTERNS = [
  /curl\s+(-\w+\s+)*https?:\/\//,
  /wget\s+https?:\/\//,
  /fetch\s*\(?\s*["']https?:\/\//,
];

// ─── G5: Full context injection — BLOCK+LOG ───
const INJECTION_FULL = [
  { pattern: /\[new\s+session\]|\[reset\]/i, label: "session_reset" },
  { pattern: /the\s+(true\s+)?goal\s+is/i, label: "goal_override" },
];

// ─── G6: Compliance — WARN ───
const COMPLIANCE = [
  { pattern: /git\s+push\s+--force/, label: "force_push" },
  { pattern: /git\s+checkout\s+--\s+/, label: "git_discard" },
  { pattern: /rm\s+-rf\s+/, label: "mass_delete" },
];

export const BrainPlugin = async (ctx) => {
  audit({ event: "brain_plugin_loaded", gates: "G1-G7" });

  return {
    "tool.execute.before": async (input, output) => {
      const tool = (input.tool || "").toLowerCase();
      const args = output.args || {};
      const cmd = String(args.command || "");
      const filePath = String(args.file_path || args.target || "");
      const content = String(args.content || "");
      const verdicts = [];

      // G7: Audit ALL tool executions
      audit({ gate: "G7", tool, tool_args: JSON.stringify(args).slice(0, 200), timestamp: Date.now() });

      // ─── G1: Dangerous bash ───
      if (tool === "bash" && cmd) {
        for (const r of BASH_DANGER) {
          if (r.test(cmd)) {
            audit({ gate: "G1", action: "block", tool, cmd: cmd.slice(0, 100) });
            throw new Error("G1 BLOCK: dangerous command prevented");
          }
        }
      }

      // ─── G2: Suspicious patterns (WARN only) ───
      if (tool === "bash" && cmd) {
        for (const s of SUSPICIOUS) {
          if (s.pattern.test(cmd)) {
            warnLog({ gate: "G2", action: "warn", label: s.label, tool, cmd: cmd.slice(0, 100) });
            verdicts.push(`G2-WARN: ${s.label}`);
          }
        }
      }

      // ─── G3: Sensitive file writes ───
      if (["write", "edit"].includes(tool) && filePath) {
        for (const r of SENSITIVE_FILES) {
          if (r.test(filePath)) {
            audit({ gate: "G3", action: "block", tool, path: filePath });
            throw new Error(`G3 BLOCK: cannot access sensitive file: ${filePath}`);
          }
        }
      }

      // ─── G3: Prompt injection (exempt .opencode/skills/ — legit system prompts) ───
      if (["write", "edit"].includes(tool) && content) {
        const isSkillFile = filePath && filePath.includes(".opencode\\skills") || filePath?.includes(".opencode/skills");
        if (!isSkillFile) {
          for (const r of INJECTION) {
            if (r.test(content)) {
              audit({ gate: "G3_inject", action: "block", tool, content_snippet: content.slice(0, 100) });
              throw new Error("G3 BLOCK: prompt injection detected");
            }
          }
        }
      }

      // ─── G4: Network egress (WARN) ───
      if (tool === "bash" && cmd) {
        for (const r of EGRESS_PATTERNS) {
          if (r.test(cmd)) {
            warnLog({ gate: "G4", action: "warn", tool, cmd: cmd.slice(0, 100) });
            verdicts.push("G4-WARN: network egress detected — safety-cortex should review");
          }
        }
      }

      // ─── G5: Full-context injection (BLOCK+LOG) ───
      if (["write", "edit"].includes(tool) && content) {
        for (const f of INJECTION_FULL) {
          if (f.pattern.test(content)) {
            audit({ gate: "G5", action: "block", label: f.label, tool, content_full: content.slice(0, 500) });
            throw new Error(`G5 BLOCK: prompt injection (${f.label})`);
          }
        }
      }

      // ─── G6: Compliance ───
      if (tool === "bash" && cmd) {
        for (const c of COMPLIANCE) {
          if (c.pattern.test(cmd)) {
            warnLog({ gate: "G6", action: "warn", label: c.label, tool, cmd: cmd.slice(0, 100) });
            verdicts.push(`G6-WARN: ${c.label}`);
          }
        }
      }

      // If any G2/G4/G6 warnings, append to output
      if (verdicts.length > 0) {
        const msg = `[SAFETY GATES] ${verdicts.join(" | ")}`;
        output.messages = output.messages || [];
        output.messages.push({ role: "system", content: msg });
      }
    },

    "tool.execute.after": async (input, output, result) => {
      // G7 (continued): log result
      const tool = (input.tool || "").toLowerCase();
      audit({ gate: "G7_after", tool, success: !result?.isError, duration_ms: result?.timing?.duration_ms });
    },
  };
};
