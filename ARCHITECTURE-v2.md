# 🧠 Brain Agent v2 Architecture

## 设计原则

1. **不依赖任何平台** — 可跑在任何 LLM harness 上 (OpenCode / CLI / Web)
2. **每个脑区独立 session** — 真正并行，互不阻塞
3. **三层次** — 反射层(0 LLM) / 习惯层(0 LLM) / 认知层(LLM)
4. **接入层适配器模式** — OpenCode / Bun CLI / WebSocket 可切换
5. **所有中间过程对用户透明** — 只看到最终输出

---

## 整体架构

```
                    ┌─────────────────────────┐
                    │       INPUT              │
                    │  (来自任意接入层)         │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼──────────────┐
                    │   ① THALAMUS (路由)      │
                    │   纯粹代码逻辑, 0 LLM     │
                    │   - 输入分类: 问题/命令/   │
                    │     危险/闲聊             │
                    │   - 决定路由哪些组件       │
                    │   - 紧急程度判断           │
                    └──────────┬──────────────┘
                               │
              ┌────────────────┼──────────────────┐
              │                │                  │
              ▼                ▼                  ▼
   ┌──────────────────┐ ┌─────────────┐ ┌──────────────┐
   │ ② REFLEX ARC     │ │ ③ HABIT    │ │ ④ COGNITIVE  │
   │ 反射层(0 LLM)    │ │ 习惯层      │ │ 认知层(LLM)   │
   │                  │ │ (0 LLM)     │ │              │
   │ G1: 危险命令拦截  │ │ 已知命令缓存 │ │ L1 感知并行   │
   │ G3: 敏感文件拦截  │ │ SOP 匹配    │ │ 5个独立session│
   │ G5: 注入检测     │ │ 模板快速响应 │ │ 各跑不同prompt│
   │ 瞬时(<1ms)       │ │ 毫秒级      │ │              │
   └──────────────────┘ └─────────────┘ └──────┬───────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  ⑤ BASAL GANGLIA    │
                                    │  基底节(0 LLM)       │
                                    │  收集各层/组件输出    │
                                    │  计算7信号强度        │
                                    │  Go/NoGo 决策         │
                                    │  路由到执行层         │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  ⑥ EXECUTION LAYER  │
                                    │  执行层(LLM)         │
                                    │  swarm-planner       │
                                    │  swarm-coder         │
                                    │  swarm-reviewer      │
                                    │  swarm-tester        │
                                    │  各自独立session并行  │
                                    └──────────┬──────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │  ⑦ OUTPUT FUSION    │
                                    │  合并结果, 最终回复   │
                                    │  可选润色session     │
                                    └──────────┬──────────┘
                                               │
                    ┌───────────────────────────┘
                    ▼
              最终输出给用户
```

---

## 详细组件设计

### ① Thalamus — 输入路由

```
功能: 感觉门控, 决定输入走哪条路径
实现: 纯代码, 不用 LLM

输入分类:
  - DANGEROUS: rm -rf /, dd, mkfs → 直接进反射层
  - COMMAND: git push, npm install → 进习惯层匹配缓存
  - QUERY: "今天天气怎样" → 进认知层 L1
  - CREATIVE: "帮我设计一个新功能" → 进认知层 L1 + action
  - CHAT: "你好" → 进认知层 L1, 轻量

输出: { type, urgency, inputText, routeTo: string[] }
```

### ② Reflex Arc — 反射层

```
实现: 纯代码, 不用 LLM
响应时间: <1ms

G1: 危险命令
  /rm\s+-rf\s+\//, /dd\s+if=/, /mkfs\./ → BLOCK

G3: 敏感文件  
  /.env$/, /credential/, /.pem$/ → BLOCK

G5: 注入检测
  /ignore\s+above\s+instructions/ → BLOCK

G2/G4/G6: 警告（不拦截）
  /curl.*\|.*bash/, /git\s+push\s+--force/ → WARN

G7: 审计日志
  记录所有操作 → brain-audit.log
```

### ③ Habit Layer — 习惯层

```
实现: SQLite/Trie 匹配, 不用 LLM
响应时间: 10-100ms

缓存已知模式:
  - "git add . && git commit -m 'xxx'" → 直接执行
  - "npm install xxx" → 直接执行
  - 已知 SOP (Standard Operating Procedures) → 匹配直接执行

SOP 存储:
  - sop-tracker MCP
  - 关键词索引 + 最近使用频率

输出: { matched: boolean, template: string, confidence: number }
```

### ④ Cognitive Layer — 认知层 (核心)

```
实现: 每个组件独立 LLM session, 全部并行
LLM: 可切换 (DeepSeek / Claude / GPT)
Session 管理: 自建 session 池

L1 感知组件 (全部并行, 各用独立session):
┌──────────────────────────────────────────────────┐
│ thalamus     │ session: br-thalamus              │
│   prompt: "分析用户输入: 门控过滤, 紧急度, 意图"   │
├──────────────────────────────────────────────────┤
│ amygdala     │ session: br-amygdala              │
│   prompt: "检测情绪模式: NORMAL/URGENT/CAUTION"   │
├──────────────────────────────────────────────────┤
│ hippocampus  │ session: br-hippocampus           │
│   prompt: "检索相关记忆: SOPs, 历史经验"          │
├──────────────────────────────────────────────────┤
│ world-cortex │ session: br-world-cortex          │
│   prompt: "分析代码库上下文: 影响范围, 依赖关系"   │
├──────────────────────────────────────────────────┤
│ safety       │ session: br-safety                │
│   prompt: "安全扫描: 检测潜在风险"                │
└──────────────────────────────────────────────────┘
```

### ⑤ Basal Ganglia — 基底节决策

```
实现: 纯代码逻辑, 不用 LLM
收集所有组件输出 → 计算7信号强度 → 决定Go/NoGo

信号计算公式:
  perceive  = (1.0 - L1.size * 0.15) × 5  (L1未完成时)
  emotion   = intensity × 4               (URGENT/CAUTION时×0.9)
  safety    = CAUTION ? 0.9×4 : 0
  memory    = SOP_count>0 ? 0.8×3 : episodic>0 ? 0.5×3 : 0
  reward    = score<3 ? 0.8×3 : |td_error|>1 ? 0.6×3 : 0
  action    = swarm ? 0.8×2 : 0
  learning  = goals>0 && L1完整 ? 0.7×1 : 0

门控规则:
  perceive win → 只允许 task() 完成 L1
  safety win   → 只允许读操作
  emotion win  → CAUTION时只读, 否则自由
  action win   → 允许全部工具
  learning win → 只允许 task()
  其他          → 自由
```

### ⑥ Execution Layer — 执行层

```
swarm 组件 (各自独立 session, 并行):

swarm-planner  │ session: br-planner
  prompt: "将任务分解为可并行执行的子任务"

swarm-coder    │ session: br-coder
  prompt: "根据计划实现代码"

swarm-reviewer │ session: br-reviewer  
  prompt: "审查实现: 正确性, 安全, 性能"

swarm-tester   │ session: br-tester
  prompt: "编写并运行测试, 验证通过"

执行模式:
  - SERIAL: plan → code → review → test (默认)
  - PARALLEL: coder/reviewer 可并行 (相同优先级)
```

### ⑦ Output Fusion — 输出合并

```
实现: 纯代码逻辑 + 可选润色 session

合并规则:
  1. 收集所有层输出
  2. 按优先级排序: safety > emotion > perceive > action > learning
  3. 生成最终回复
  4. 可选: 用 brain session 做一次润色

用户可见: 只有最终输出
不可见: 所有中间结果
```

---

## Session 池管理

```typescript
interface BrainSession {
  id: string;            // "br-thalamus", "br-coder", ...
  component: string;     // 组件名
  llm: LLMClient;        // LLM 客户端 (可配置模型)
  history: Message[];    // 独立上下文
  state: any;            // M_t 状态
  createdAt: number;
}

class SessionPool {
  private sessions: Map<string, BrainSession>;
  
  get(componentId: string): BrainSession;
  
  // 并行运行多个组件
  async runAll(components: Component[], input: string): Promise<Map<string, ComponentOutput>>;
  
  // 每个组件有自己的:
  // - session (独立上下文窗口)
  // - prompt (角色定义)
  // - model (可不同模型)
  // - temperature (可不同)
}
```

---

## 通路 (Pathways) 完整映射

| 通路 | 触发条件 | 经过组件 | 耗时 | LLM? |
|------|---------|---------|------|------|
| **L1感知** | 新输入 | thalamus→5 L1并行→基底节 | 2-5s | ✅ |
| **反射** | 危险命令/敏感文件 | 直接拦截 | <1ms | ❌ |
| **习惯** | SOP/缓存匹配 | 直接执行 | 10ms | ❌ |
| **情绪** | URGENT/CAUTION | amygdala→影响优先级 | 2-3s | ✅ |
| **记忆** | SOP/情景匹配 | hippocampus→基底节 | 2-3s | ✅ |
| **奖赏** | 低分/大td_error | reward→深度推理 | 3-5s | ✅ |
| **安全** | CAUTION模式 | safety→只读模式 | 2-3s | ✅ |
| **行动** | 复杂任务 | planner→coder→reviewer→tester | 10-60s | ✅ |
| **学习** | 任务完成+L1完 | reflexion→memory-store | 3-5s | ✅ |

---

## 旁路 (Bypasses)

| 旁路 | 绕过的层 | 原因 |
|------|---------|------|
| **G1-G7** | 认知层 | 危险操作不需要LLM判断 |
| **SOP缓存** | 认知层 | 已知流程直接复用 |
| **命令模板** | 认知层 | git/npm 等常见命令直接执行 |
| **输出过滤** | 执行层 | 后台通知不显示给用户 |

---

## MCP 服务器 (独立进程)

| MCP | 协议 | 数据存储 |
|-----|------|---------|
| **memory-store** | stdio MCP | SQLite |
| **world-model** | stdio MCP | SQLite |
| **reward-system** | stdio MCP | SQLite |
| **tool-tracker** | stdio MCP | SQLite |
| **sop-tracker** | stdio MCP | SQLite |
| **reflexion** | stdio MCP | SQLite |
| **priority-queue** | stdio MCP | SQLite |
| **monitor** | stdio MCP | SQLite |

所有 MCP 通过 stdio 通信，独立进程，不阻塞主引擎。

---

## 对照 FA 论文 (arXiv 2504.01990)

| 论文章节 | 论文组件 | v2 实现 |
|---------|---------|--------|
| §1.3A | 信号竞争(7 signals) | 基底节7信号+Go/NoGo |
| §2.1 | 感知(Perception) | L1 5并行 + thalamus 路由 |
| §2.2 | 记忆(Memory) | hippocampus + memory-store MCP |
| §2.3 | 世界模型(World Model) | world-cortex + world-model MCP |
| §2.4 | 行动(Action) | swarm层 (planner/coder/reviewer/tester) |
| §2.5 | 奖赏(Reward) | reward-cortex + reward-system MCP |
| §2.6 | 情绪(Emotion) | amygdala + M_emo 状态机 |
| §3 | 自我增强(Self-Enhancement) | reflexion + learning 信号 |
| §3.3.4 | 基底节动作选择 | Basal Ganglia Go/NoGo |
| §4 | 多智能体(Multi-Agent) | 多session并行 |
| §5 | 安全(Safety) | G1-G7 + reflex 层 |
| - | 习惯/技能 | Habit Layer + SOP 缓存 |
| - | 反射弧 | Reflex Arc (0 LLM) |

---

## 项目结构 (Bun + TypeScript)

```
brain-engine/
├── src/
│   ├── index.ts                 # 入口
│   ├── core/
│   │   ├── thalamus.ts          # 输入路由
│   │   ├── basal-ganglia.ts     # 信号竞争 + Go/NoGo
│   │   ├── session-pool.ts     # Session 池管理
│   │   └── output-fusion.ts    # 输出合并
│   ├── layers/
│   │   ├── reflex.ts            # 反射层 (G1-G7)
│   │   ├── habit.ts             # 习惯层 (SOP/缓存)
│   │   └── cognitive.ts         # 认知层 (L1 + 决策)
│   ├── components/
│   │   ├── l1/                  # L1 感知组件
│   │   │   ├── thalamus.ts
│   │   │   ├── amygdala.ts
│   │   │   ├── hippocampus.ts
│   │   │   ├── world-cortex.ts
│   │   │   └── safety.ts
│   │   ├── evaluation/          # 评估组件
│   │   │   ├── cerebellum.ts
│   │   │   ├── basal-ganglia.ts
│   │   │   ├── insula.ts
│   │   │   ├── attention.ts
│   │   │   └── reward.ts
│   │   ├── regulation/          # 调节组件
│   │   │   ├── dmn.ts
│   │   │   ├── hypothalamus.ts
│   │   │   ├── self-optimizer.ts
│   │   │   ├── offline-consol.ts
│   │   │   └── self-enhance.ts
│   │   └── swarm/               # 执行组件
│   │       ├── planner.ts
│   │       ├── coder.ts
│   │       ├── reviewer.ts
│   │       └── tester.ts
│   ├── mcp/                     # MCP 客户端
│   │   ├── client.ts
│   │   └── servers.ts
│   ├── adapters/                # 接入层
│   │   ├── opencode.ts          # OpenCode 插件
│   │   ├── cli.ts               # Bun CLI
│   │   └── websocket.ts         # WebSocket 服务
│   ├── memory/                  # 记忆系统
│   │   ├── working.ts           # 工作记忆
│   │   ├── episodic.ts          # 情景记忆
│   │   └── procedural.ts        # 程序记忆
│   └── types/                   # 类型定义
│       ├── signals.ts
│       ├── components.ts
│       └── index.ts
├── visualizer/                  # 3D 可视化
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

---

## 从0开始的实施步骤

| 阶段 | 内容 | 时间估计 |
|------|------|---------|
| **P1** | Session 池 + 基底节决策 + L1 并行 | 2-3天 |
| **P2** | 反射层 G1-G7 + 习惯层 SOP | 1天 |
| **P3** | 接入层 (OpenCode/CLI) | 1天 |
| **P4** | 全部20组件 + MCP | 3-4天 |
| **P5** | npm 发布 + README + CI | 1天 |
| **P6** | Visualizer 适配 | 1天 |

**总计: ~10天**

先做 P1？这样你就能看到核心引擎跑起来 — 5 个 L1 并行 + 基底节决策 + 门控。
