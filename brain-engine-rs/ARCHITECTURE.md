# Brain v3 — 完整架构对比

## 整体架构

```
brain-engine v2 (TypeScript)          brain-v3 (Rust)
═══════════════════════════           ═══════════════════════
29 核心文件 / 6000+ 行               9 模块 / 4000+ 行
npm install brain-engine             cargo add brain-v3
Node.js 18+                          编译型单二进制
550+ 测试                            41 测试 (持续增加)
需额外 run Minecraft 子进程          直接集成 bot-rs
```

## 架构对比

```
brain-engine v2 (TS)
══════════════════════════════════════════════════════════════
                      输入
                       │
              ┌────────▼────────┐
              │    WorldInterface │  ← 需要外部实现 perceive/act
              │  (perceive/act)  │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ① Reflex Layer    │  0 LLM, <1ms
              │  ReflexRegistry     │
              │  SurvivalReflex     │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ② Predictive      │  0 LLM, <1ms
              │  PhysicsPredictor  │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ③ Habit Layer      │  0 LLM, ~10ms
              │  HabitLayer         │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ④ Cognitive        │  LLM, 2-5s
              │  20 脑区 + SessionPool │
              │  7 信号竞争 + 基底节  │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    Output Router    │
              └──────────────────┘


brain-v3 (Rust) 
══════════════════════════════════════════════════════════════
                      输入
                       │
              ┌────────▼────────┐
              │    WorldSnapshot    │  ← 直接 azalea Client
              │  (直接调用, 无接口)  │     不需要 WorldInterface
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  0. 内部状态更新     │
              │  ┌──────────────┐   │
              │  │ Wave ODE     │ ← Maslow 需求衰减/上升
              │  │ Hormone tick │ ← 6 激素自动衰减
              │  │ Emotion env  │ ← 从环境检测情绪
              │  │ Memory       │ ← 记录位置/遗忘/巩固
              │  └──────────────┘   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ① Reflex Layer    │  0 LLM, <1ms
              │  - health < 5? flee │
              │  - fire/lava? flee │
              │  - hunger < 3? eat │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ② Predictive      │  0 LLM, <1ms
              │  (placeholder)     │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ③ Habit           │  0 LLM, ~10ms
              │  (placeholder)     │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ④ Wave-Driven     │  0 LLM ← ★ 新增
              │  Dominant need → act│
              │  L1: find_food      │
              │  L2: ensure_safety  │
              │  L4: craft_tools    │
              │  L5: explore        │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  ⑤ Cognitive       │  LLM (rig, ~2-5s)
              │  - 每 50 tick 触发  │
              │  - 幻觉检测        │ ← PAPER GAP FIX
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │    Action          │
              └──────────────────┘
```

## 核心差异

| 维度 | brain-engine v2 (TS) | brain-v3 (Rust) |
|------|---------------------|-----------------|
| **语言** | TypeScript | Rust (edition 2024) |
| **运行** | Node.js 子进程 | 编译进 bot-rs 同一进程 |
| **世界接口** | WorldInterface (perceive/act) | 直接调 azalea Client |
| **LLM** | 自建 LLM 客户端 | rig-core (20+ providers) |
| **向量记忆** | JSON 文件 | MenteDB (专业记忆引擎) |
| **持久化** | 自定义 JSON | sqlx (SQLite/PostgreSQL) |
| **遗忘曲线** | ❌ 无 | ✅ Ebbinghaus 公式 |
| **扩散激活** | ❌ 无 | ✅ 关联记忆提升 |
| **情绪标签** | ❌ 无 | ✅ valence + arousal |
| **激素调制** | 基本版 | 完整 3 路径调制 |
| **感觉缓存** | ❌ 无 | ✅ <1s 感觉缓冲 |
| **层级奖赏** | ❌ 无 | ✅ subgoal → parent |
| **幻觉检测** | ❌ 无 | ✅ 基于世界事实检查 |
| **20 脑区** | 完整 (29 文件) | 基础版 (可扩展) |
| **测试** | 550+ | 41 (持续增加) |

## 架构优势对比

```
brain-engine v2 的问题              brain-v3 的解决
────────────────────────────────  ────────────────────────
必须跑 Node.js 子进程              Rust 直接编译进主程序
WorldInterface 增加复杂度          直接调 azalea，无中间层
JSON 文件持久化不可靠              MenteDB / sqlx 专业存储
无遗忘曲线 → 记忆膨胀              Ebbinghaus 自动遗忘
无情绪记忆标签                     情绪 → 记忆编码影响
无层级奖赏                         子目标 → 父目标奖励传播
无幻觉检测                         LLM 输出置信度验证
单线程事件循环                      线程池并行
```

## 集成到 bot-rs

```rust
// 作为 Brain 即插即拔
use brain_v3::BrainEngine;
use brain_v3::BrainConfig;

let brain = BrainEngine::new(BrainConfig {
    api_key: std::env::var("DEEPSEEK_API_KEY").unwrap_or_default(),
    ..Default::default()
});

// 每 tick 调用
loop {
    let snapshot = capture_world(client);
    let result = brain.tick(&snapshot).await;
    match result.action {
        Some(action) => execute(client, action),
        None => {} // 无事可做
    }
}
```
