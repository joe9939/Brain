// brain-plugin.mjs — Foundation Agents Loop (arXiv 2504.01990)
// Integrated with brain-hooks.mjs for signal competition + M_t tracking

import { appendFileSync, mkdirSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { onMessage, onToolBefore, onToolAfter, onEvent, getStrongestSignal, getSignalContext, getMentalState } from "./brain-hooks.mjs";

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

// ─── G1: Dangerous bash ───
const BASH_DANGER = [
  /rm\s+-rf\s+\//i, />\s*\/dev\/sda/i, /dd\s+if=/i, /:\(\)\s*\{/i,
  /mkfs\./i, /fdisk/i, />\s*\/dev\/sd/i,
];

// ─── G2: Suspicious patterns ───
const SUSPICIOUS = [
  { pattern: /curl.*\|.*(ba)?sh/, label: "pipe_curl_shell" },
  { pattern: /base64\s+-d/, label: "base64_decode" },
  { pattern: /chmod\s+777/, label: "chmod_777" },
  { pattern: /eval\s+/, label: "eval" },
  { pattern: /wget.*\|/, label: "pipe_wget" },
];

// ─── G3: Sensitive files ───
const SENSITIVE_FILES = [
  /\.env$/, /-secret/, /credential/, /\.pem$/, /id_rsa/,
  /\.htpasswd/, /secrets\./, /\.token/, /auth\.json/,
];

// ─── G3: Prompt injection ───
const INJECTION = [
  /ignore\s+(all\s+)?(previous|above)\s+(instructions|directions)/i,
  /you\s+are\s+(now\s+)?(an?|the)\s+/i,
  /system\s+prompt\s*:/i,
  /override\s+(your\s+)?(instructions|configuration)/i,
  /forget\s+(all\s+)?(previous|prior)\s+/i,
];

// ─── G4: Network egress ───
const EGRESS_PATTERNS = [
  /curl\s+(-\w+\s+)*https?:\/\//,
  /wget\s+https?:\/\//,
  /fetch\s*\(?\s*["']https?:\/\//,
];

// ─── G5: Full context injection ───
const INJECTION_FULL = [
  { pattern: /\[new\s+session\]|\[reset\]/i, label: "session_reset" },
  { pattern: /the\s+(true\s+)?goal\s+is/i, label: "goal_override" },
];

// ─── G6: Compliance ───
const COMPLIANCE = [
  { pattern: /git\s+push\s+--force/, label: "force_push" },
  { pattern: /git\s+checkout\s+--\s+/, label: "git_discard" },
  { pattern: /rm\s+-rf\s+/, label: "mass_delete" },
];

function getSessionId(input) {
  return input?.sessionID || input?.conversationId || input?.session_id || 'default';
}

export const BrainPlugin = async (ctx) => {
  audit({ event: "brain_plugin_loaded", gates: "G1-G7" });

  // Track which sessions are in brain mode (detected via system prompt)
  const brainSessions = new Set();

  return {
    // ── S0: experimental.chat.system.transform — detect brain mode AND inject signal ──
    "experimental.chat.system.transform": async (input, output) => {
      try {
        const sid = input.sessionID || 'default';
        const system = output.system || [];
        const isBrain = system.some(s => typeof s === 'string' && s.includes('# BRAIN ORCHESTRATOR'));
        if (!isBrain) return;

        brainSessions.add(sid);

        // Inject L1 signal into system prompt — LLM sees it before any tool decision
        system.unshift('<brain_l1 protect="true">Brain mode ACTIVE. On EVERY message, BEFORE any response, execute 5 L1 agents in parallel: task(category="brain-thalamus",run_in_background=true) task(category="brain-amygdala",run_in_background=true) task(category="brain-hippocampus",run_in_background=true) task(category="brain-world-cortex",run_in_background=true) task(category="brain-safety",run_in_background=true). Collect via background_output(). Only task()/skill()/todowrite() allowed.</brain_l1>');
        audit({ gate: "S0_L1", session: sid });
      } catch (e) {
        audit({ gate: "S0_err", error: e.message });
      }
    },

    // ── T0: experimental.chat.messages.transform — fallback for brain-mode sessions ──
    "experimental.chat.messages.transform": async (input, output) => {
      try {
        const msgs = output.messages || [];
        if (msgs.length === 0) return;

        const sessionID = input.sessionID || msgs.find(m => m.info?.sessionID)?.info?.sessionID || 'default';
        if (!brainSessions.has(sessionID)) return;

        // Find last user message, inject brain status prefix
        let lastUserIdx = -1;
        for (let i = msgs.length - 1; i >= 0; i--) {
          if (msgs[i]?.info?.role === 'user') { lastUserIdx = i; break; }
        }
        if (lastUserIdx === -1) return;

        const lastUser = msgs[lastUserIdx];
        const hasL1 = msgs.some(m => m.parts?.some(p => p.text?.includes('</brain_l1')));
        if (hasL1) return;

        const targetPart = lastUser.parts?.find(p => p.type === 'text' && !p.synthetic);
        if (targetPart) {
          targetPart.text = '<brain_l1>Brain mode ACTIVE. Follow system prompt L1 protocol.</brain_l1>' + targetPart.text;
        }
        audit({ gate: "T0_L1", session: sessionID });
      } catch (e) {
        audit({ gate: "T0_err", error: e.message });
      }
    },

    // ── permission.ask — log only ──
    "permission.ask": async (input, output) => {
      try { audit({ gate: "P_log", tool: input.type, session: input.sessionID }); }
      catch (e) { audit({ gate: "P_err", error: e.message }); }
    },

    // ── T1: tool.execute.before — Safety gates + signal injection ──
    "tool.execute.before": async (input, output) => {
      const tool = (input.tool || "").toLowerCase();
      const args = output.args || {};
      const cmd = String(args.command || "");
      const filePath = String(args.file_path || args.target || "");
      const content = String(args.content || "");
      const verdicts = [];
      const sid = getSessionId(input);

      // G7: Audit
      audit({ gate: "G7", tool, tool_args: JSON.stringify(args).slice(0, 200), timestamp: Date.now() });

      // T1: Brain-hooks signal
      try { onToolBefore(sid, tool, args); } catch (e) {
        if (e.message?.startsWith('G1')) throw e;
        audit({ gate: "T1_error", error: e.message });
      }

      // T1: Signal injection into output.messages (next LLM turn)
      try {
        const sig = getStrongestSignal(sid);
        if (sig.length > 0) {
          output.messages = output.messages || [];
          for (const m of sig) output.messages.push(m);
          audit({ gate: "T1_signal", signal: sig[0].content?.slice(0, 80) });
        }
      } catch (e) {
        audit({ gate: "T1_sig_err", error: e.message });
      }

      // ─── G1: Dangerous bash ───
      if (tool === "bash" && cmd) {
        for (const r of BASH_DANGER) {
          if (r.test(cmd)) { audit({ gate: "G1", action: "block", tool, cmd: cmd.slice(0, 100) }); throw new Error("G1 BLOCK: dangerous command prevented"); }
        }
      }

      // ─── G2: Suspicious patterns (WARN) ───
      if (tool === "bash" && cmd) {
        for (const s of SUSPICIOUS) {
          if (s.pattern.test(cmd)) { warnLog({ gate: "G2", action: "warn", label: s.label, tool, cmd: cmd.slice(0, 100) }); verdicts.push(`G2-WARN: ${s.label}`); }
        }
      }

      // ─── G3: Sensitive file writes ───
      if (["write", "edit"].includes(tool) && filePath) {
        for (const r of SENSITIVE_FILES) {
          if (r.test(filePath)) { audit({ gate: "G3", action: "block", tool, path: filePath }); throw new Error(`G3 BLOCK: cannot access sensitive file: ${filePath}`); }
        }
      }

      // ─── G3: Prompt injection ───
      if (["write", "edit"].includes(tool) && content) {
        const isSkillFile = filePath && (filePath.includes(".opencode\\skills") || filePath?.includes(".opencode/skills"));
        if (!isSkillFile) {
          for (const r of INJECTION) {
            if (r.test(content)) { audit({ gate: "G3_inject", action: "block", tool, content_snippet: content.slice(0, 100) }); throw new Error("G3 BLOCK: prompt injection detected"); }
          }
        }
      }

      // ─── G4: Network egress (WARN) ───
      if (tool === "bash" && cmd) {
        for (const r of EGRESS_PATTERNS) {
          if (r.test(cmd)) { warnLog({ gate: "G4", action: "warn", tool, cmd: cmd.slice(0, 100) }); verdicts.push("G4-WARN: network egress"); }
        }
      }

      // ─── G5: Full-context injection ───
      if (["write", "edit"].includes(tool) && content) {
        for (const f of INJECTION_FULL) {
          if (f.pattern.test(content)) { audit({ gate: "G5", action: "block", label: f.label, tool, content_full: content.slice(0, 500) }); throw new Error(`G5 BLOCK: prompt injection (${f.label})`); }
        }
      }

      // ─── G6: Compliance ───
      if (tool === "bash" && cmd) {
        for (const c of COMPLIANCE) {
          if (c.pattern.test(cmd)) { warnLog({ gate: "G6", action: "warn", label: c.label, tool, cmd: cmd.slice(0, 100) }); verdicts.push(`G6-WARN: ${c.label}`); }
        }
      }

      // Append G2/G4/G6 warnings
      if (verdicts.length > 0) {
        output.messages = output.messages || [];
        output.messages.push({ role: "system", content: `[SAFETY GATES] ${verdicts.join(" | ")}` });
      }
    },

    // ── T2: tool.execute.after — M_t update ──
    "tool.execute.after": async (input, output, result) => {
      const tool = (input.tool || "").toLowerCase();
      const sid = getSessionId(input);
      audit({ gate: "G7_after", tool, success: !result?.isError, duration_ms: result?.timing?.duration_ms });
      try { onToolAfter(sid, tool, output.args || {}, output.messages?.slice(-1)[0]?.content || ''); } catch (e) {
        audit({ gate: "T2_error", error: e.message });
      }
    },

    // ── T4: event — Session lifecycle ──
    "session.event": async (input) => {
      const sid = getSessionId(input);
      const type = input?.type || input?.event || '';
      try { onEvent(type, { sessionID: sid }); } catch (e) { audit({ gate: "T4_error", error: e.message }); }
    },
  };
};
