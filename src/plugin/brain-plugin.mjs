// brain-plugin.mjs — L1 Safety Reflex (minimal)
// All orchestration routing handled by OMO categories.
// This plugin only blocks dangerous operations at the tool level.

import { appendFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LOG = join(homedir(), ".config", "opencode", "brain.log");
function log(o) {
  try { appendFileSync(LOG, JSON.stringify({ ts: new Date().toISOString(), ...o }) + "\n"); } catch (e) {}
}

export const BrainPlugin = async (ctx) => {
  log({ event: "brain_plugin_loaded", version: "l1-only" });

  // L1: dangerous bash patterns (irreversible damage)
  const BASH_DANGER = [
    /rm\s+-rf\s+\//,
    /curl.*\|.*(ba)?sh/,
    />\s*\/dev\/sda/,
    /dd\s+if=/,
    /:\(\)\s*\{/,
    /mkfs\./,
    /fdisk/,
    />\s*\/dev\/sd/,
  ];

  // G3: sensitive file access (secrets, credentials)
  const SENSITIVE_FILES = [
    /\.env$/,
    /-secret/,
    /credential/,
    /\.pem$/,
    /id_rsa/,
    /\.htpasswd/,
    /config\.json$/,    // caution: broad, but catches misnamed secret configs
  ];

  // G3: prompt injection patterns
  const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(previous|above)\s+(instructions|messages)/i,
    /you\s+are\s+now/i,
    /system\s+prompt\s*:/i,
  ];

  return {
    "tool.execute.before": async (input, output) => {
      const tool = (input.tool || "").toLowerCase();
      const args = output.args || {};
      const cmd = args.command || "";
      const filePath = args.file_path || args.target || "";

      // L1: Dangerous bash
      if (tool === "bash" && cmd) {
        for (const r of BASH_DANGER) {
          if (r.test(cmd)) {
            log({ block: "L1", tool, cmd: cmd.slice(0, 80) });
            throw new Error("L1 BLOCK: dangerous command prevented");
          }
        }
      }

      // G3: Sensitive file write
      if (["write", "edit"].includes(tool) && filePath) {
        for (const r of SENSITIVE_FILES) {
          if (r.test(filePath)) {
            log({ block: "G3", tool, path: filePath });
            throw new Error("G3: cannot write to " + filePath);
          }
        }
      }

      // G3: Prompt injection (check written content)
      if (["write", "edit"].includes(tool) && args.content) {
        for (const r of INJECTION_PATTERNS) {
          if (r.test(String(args.content))) {
            log({ block: "G3_inject", tool });
            throw new Error("G3: prompt injection detected");
          }
        }
      }
    },
  };
};
