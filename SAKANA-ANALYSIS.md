# Sakana AI Research Analysis — Integration Blueprint for Brain Agent v2

## 1. TRINITY (ICLR 2026) — 轻量协调器

### 核心思想
一个轻量协调器（0.6B SLM + 10K头 ≈ 总共<20K可训练参数）来编排多个LLM协作。
**不合并权重，不修改架构**——纯粹靠协调。

### 三角色
```
          ┌──────────────┐
          │  查询         │
          └──────┬───────┘
                 ▼
          ┌──────────────┐
          │  Coordinator  │ ← 0.6B SLM + 10K head
          │  (每轮决策)    │   用 sep-CMA-ES 训练
          └──────┬───────┘
                 │
       ┌─────────┼─────────┐
       ▼         ▼         ▼
   ┌──────┐ ┌──────┐ ┌──────┐
   │Thinker│ │Worker│ │Verify│ ← Worker LLMs
   │ 策略  │ │ 执行  │ │ 验证  │   (可多个不同模型)
   └──────┘ └──────┘ └──────┘
```

| 角色 | 人脑对应 | 我们的 Basal Ganglia 对应 |
|------|---------|------------------------|
| **Thinker** (策略) | 前额叶 — 规划/推理 | perceive + reward 信号 → 深度推理 |
| **Worker** (执行) | 运动皮层 — 动作 | action 信号 → swarm 执行 |
| **Verifier** (验证) | 前扣带 — 错误检测 | safety 信号 + 学习回路 |

### 关键成果
- 86.2% LiveCodeBench（超过 GPT-5 的 83.8%）
- 20K 参数协调器 = 不到一个 LLM 的万分之一
- sep-CMA-ES 进化策略比 RL/SFT 更好（高维+稀疏奖励场景）

### 对我们的启发
**✅ Basal Ganglia 作为协调器是对的**——我们甚至不需要一个 SLM，直接用信号竞争公式（纯代码）做协调，比 TRINITY 更轻量。但可以借鉴：
1. Thinker/Worker/Verifier 三角色路由——我们的信号竞争天然是角色路由
2. 进化策略优化信号权重

---

## 2. Conductor (ICLR 2026) — RL训练协调器

### 核心思想
一个 7B 模型用 RL 训练，自动学习如何编排 worker LLM。它输出：
1. **通信拓扑** — 谁和谁说话
2. **targeted instructions** — 给每个 worker 的精准指令

### Conductor 输出格式
```
Step 1: [Thinker → GPT-5] "分析问题的数学结构..."
Step 2: [Worker → Claude] "实现以下算法..."
Step 3: [Worker → Gemini] "检查边界条件..."
Step 4: [Verifier → GPT-5] "验证所有测试用例"
```

### 关键成果
- 7B 协调器 + 多 LLM 池 → SOTA
- **递归拓扑**: Conductor 可以选择自己作为 worker → 动态 test-time scaling
- RL 自动发现协作策略（纯端到端奖励最大化）

### 对我们的启发
**✅ Conductor ≈ 我们的基底节 + 信号竞争**，但 Conductor 用 RL 训练，我们用公式计算。值得借鉴：
1. **递归路由**：基底节可以选择自己——即当信号不明确时，可以"再想一轮"
2. **拓扑自适应**：不同任务走不同路径（简单问题直接回答，复杂问题走 swarm）
3. **RL 优化的潜力**：未来我们的信号权重可以用 CMA-ES 进化优化

---

## 3. Fugu (2026) — 生产级协调系统

### 核心思想
Fugu = 一个模型接口，内部编排多个 worker LLM。
用户看到一个模型（单一 API），内部自动路由到不同模型。

### 架构
```
用户: "solve this coding problem"
  ↓
Fugu Model (单一入口)
  ↓ 内部自动
  ├── 分析问题 → 决定需要哪些 worker
  ├── 分配角色 (Thinker/Worker/Verifier)
  ├── 执行多步协作
  └── 合成最终答案
  ↓
用户: 看到单一回复
```

### 版本
- **Fugu**: 平衡性能/延迟，日常使用
- **Fugu-Ultra**: 最大能力，最难问题（类似 think/非 think 模式）

### 评测结果
| Benchmark | Fugu | Fugu-Ultra | 对比 |
|-----------|------|-----------|------|
| SWE-Bench Pro | SOTA | SOTA | 超越所有已知模型 |
| Terminal Bench | SOTA | SOTA | agent 任务最强 |
| LiveCodeBench | SOTA | SOTA | 代码生成 |
| GPQA Diamond | — | SOTA | 科学推理 |
| Humanity's Last Exam | — | SOTA | 最难推理 |

### 对我们的启发
**✅ Fugu = 我们的 Brain Agent 目标形态**——单一入口，内部多agent。
关键区别：Fugu 用 trained orchestrator，我们用 7信号竞争 + 基底节。
**两者不矛盾**——信号竞争可以视为一种特定的、透明的、可调试的协调策略。

---

## 4. 与 Brain Agent v2 的完整映射

```
Sakana Fugu/TRINITY/Conductor          Brain Agent v2
─────────────────────────────────────────────────────────────
Fugu 模型 (单一入口)                     🧠 BrainEngine.process()
TRINITY Coordinator                    BasalGanglia (信号竞争)
Thinker 角色                            perceive / reward 信号
Worker 角色                             action 信号 → swarm
Verifier 角色                           safety 信号 + 学习
Conductor 通信拓扑                       MCP + session pool
RL 训练协调器                           未来: CMA-ES 进化信号权重
递归拓扑 (协调器选自己)                   未来: 可以递归调用 process()
Worker LLM 池                           独立 session (不同模型)
Fugu-Ultra (高延迟高质量)                未来: deep think 模式
```

---

## 5. 可以直接采用的实现方案

### 5.1 TRINITY 三角色路由
在我们的基底节增加角色维度，不只是"允许工具"，而是路由到不同处理模式：

```typescript
// 当前: gate 只决定允许的工具
gate = { allowAll: false, allowedTools: ['task'] }

// 借鉴 TRINITY: gate 决定角色
gate = {
  role: 'thinker' | 'worker' | 'verifier',
  allowedTools: [...],
  instruction: 'deep reasoning needed',
}
```

### 5.2 Conductor 通信拓扑
每个 L1 组件的输出可以路由到特定下游，不是全部进基底节：

```typescript
// 当前: 所有 L1 → 基底节
// 借鉴 Conductor: 动态拓扑
topology = [
  { from: 'thalamus', to: ['amygdala', 'hippocampus'] },
  { from: 'hippocampus', to: ['basal-ganglia', 'memory-store'] },
  { from: 'amygdala', to: ['basal-ganglia'] },
  // 不同输入走不同拓扑
]
```

### 5.3 Fugu 单一接口
对外只暴露 `process(input)`，内部全部隐藏：

```typescript
// 用户只需要:
const result = await brain.process("solve this coding problem");
// 内部: L1 → 信号竞争 → 门控 → swarm → 融合
// 用户只看到: { output: "答案", signals: [...], latency: "2.3s" }
```

### 5.4 进化优化信号参数
借鉴 TRINITY 的 sep-CMA-ES，我们的信号权重可以进化调优：

```typescript
// 当前: 固定公式
perceive = l1.size < 5 ? 1.0 - l1.size * 0.15 : 0

// 进化后: 参数可调
perceive = {
  formula: l1.size < maxL1 ? base - l1.size * decay : 0,
  params: { base: 1.0, maxL1: 5, decay: 0.15 }
  // 这些参数可以通过 CMA-ES 进化优化
}
```

---

## 实施建议

| 优先级 | 借鉴来源 | 改动 | 难度 |
|--------|---------|------|------|
| 🔴 | Fugu | 对外单一 `process()` 接口，隐藏内部 | 🟢 已有 |
| 🔴 | TRINITY | 基底节增加角色路由 (thinker/worker/verifier) | 🟡 |
| 🟡 | Conductor | 动态通信拓扑（不同输入不同路径） | 🟡 |
| 🟢 | TRINITY | 信号权重可配（未来可进化） | 🟢 |
| 🟢 | Fugu | 支持多模型 session（不同组件不同 LLM） | 🟡 |

要我先把 **TRINITY 三角色路由** 集成到基底节吗？这是最具性价比的改动——不改架构，但决策质量提升最明显。
