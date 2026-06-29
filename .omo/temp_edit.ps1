$file = "C:\Users\86189\Desktop\brain-agent\.opencode\skills\brain-master.md"
$c = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# 1. Add insula row + Homeostasis + Budget after gate table
$c = $c.Replace(
  "| Any tool use ambiguity | brain-cerebellum | L1_CONTEXT + ambiguous tool options |`r`n`r`n### L2 prompt template",
  "| Any tool use ambiguity | brain-cerebellum | L1_CONTEXT + ambiguous tool options |
| monitor.alert (health < 0.5) | brain-insula | L1_CONTEXT + alert details |

### Homeostasis Response - Corrective action on system anomaly

When brain-insula fires:
1. Reduce load: GLOBAL_STATE.attention_budget.remaining = max(0.3, remaining - 0.2)
2. Raise safety: GLOBAL_STATE.safety_level = 'heightened'
3. Log: monitor_report_event({type:'homeostasis', action:'corrective'})

### Attention Budget Enforcement

Before firing L2 gates, check budget:
- remaining = GLOBAL_STATE.attention_budget.remaining
- Only fire gates where gate_weight / total_weight <= remaining
- After firing: GLOBAL_STATE.attention_budget.remaining -= allocated

### L2 prompt template"
)

# 2. Change L1 step 1 title to 5 agents
$c = $c.Replace(
  "### Step 1: Fire ALL 4 L1 agents in PARALLEL",
  "### Step 1: Fire ALL 5 L1 agents in PARALLEL (4 original + safety background monitor)"
)

# 3. Add 5th safety agent after world-cortex
$c = $c.Replace(
  "task(category=""brain-world-cortex"", run_in_background=true,
     prompt=""Query codebase. Use world_query + codegraph_explore. OUTPUT STRICT JSON: {relevant_files: [...], symbols_found: [{name,kind,file}], impact_analysis: {high_risk: [...], affected_modules: [...]}, file_summaries: {filepath: description}} NO wrapper text. Message: <message>"")
```",
  "task(category=""brain-world-cortex"", run_in_background=true,
     prompt=""Query codebase. Use world_query + codegraph_explore. OUTPUT STRICT JSON: {relevant_files: [...], symbols_found: [{name,kind,file}], impact_analysis: {high_risk: [...], affected_modules: [...]}, file_summaries: {filepath: description}} NO wrapper text. Message: <message>"")
task(category=""brain-safety"", run_in_background=true,
     prompt=""Background safety scan. OUTPUT STRICT JSON: {risk_level:'normal'|'heightened'|'strict', alerts:[], override_l2:false} NO wrapper text. Message: <message>"")
```"
)

# 4. Update task_ids
$c = $c.Replace(
  "Store task_ids: `bg_thalamus`, `bg_amygdala`, `bg_hippo`, `bg_world`.",
  "Store task_ids: `bg_thalamus`, `bg_amygdala`, `bg_hippo`, `bg_world`, `bg_safety_bg`."
)

[System.IO.File]::WriteAllText($file, $c, [System.Text.Encoding]::UTF8)
Write-Host "Done"
