# Brain Agent Test Coverage Matrix

## Legend
- ✅ 静态测试覆盖 (tests/runner.js)
- 🔷 E2E 关键词覆盖 (brain-e2e-runner.js)
- 🔄 Agentest 行为测试 (agentest run)
- ❌ 未覆盖

## 1. L1 感知层 (5 agents)

| Agent | 静态 | E2E | 行为 | 测试内容 |
|-------|------|-----|------|---------|
| brain-thalamus | ✅ | ✅ | 🔄 | 门控、意图提取、紧迫度评分 |
| brain-amygdala | ✅ | ✅ | 🔄 | 情绪检测（URGENT/CAUTION 等） |
| brain-hippocampus | ✅ | ✅ | 🔄 | 记忆检索（关键词+向量搜索） |
| brain-world-cortex | ✅ | ✅ | 🔄 | 代码库结构和影响分析 |
| brain-safety | ✅ | ✅ | 🔄 | 安全扫描 |

## 2. L1.5 调制层

| 回路 | 静态 | E2E | 行为 | 测试内容 |
|------|------|-----|------|---------|
| mood_decay | ✅ | ✅ | 🔄 | 情绪衰减和传播 |
| reward_bias | ✅ | ✅ | 🔄 | 注意力偏置公式 |
| 情绪感染 (contagion) | ✅ | ✅ | ❌ | swarm 情绪投票 |
| 稳态 (homeostasis) | ✅ | ✅ | ❌ | 异常纠正动作 |

## 3. L2 门控层

| 门 | 静态 | E2E | 行为 | 测试内容 |
|----|------|-----|------|---------|
| 动态阈值 (gate_thresholds) | ✅ | ✅ | 🔄 | 从 GLOBAL_STATE 读取阈值 |
| WTA 评分 | ✅ | ✅ | ❌ | 权重公式 × agent_reliability |
| 共识门 (consensus) | ✅ | ✅ | ❌ | 3 agent 投票 |
| 注意力预算 | ✅ | ✅ | ❌ | budget 消耗和刷新 |

## 4. L3 执行层

| 组件 | 静态 | E2E | 行为 | 测试内容 |
|------|------|-----|------|---------|
| swarm-planner (递归 DAG) | ✅ | ❌ | 🔄 | 子 DAG 深度 ≤3 |
| 因果分析 (causal) | ✅ | ✅ | ❌ | BFS 依赖追踪 |
| world_predict | ✅ | ✅ | 🔄 | 变更预测 |
| swarm-coder/reviewer/tester | ✅ | ❌ | 🔄 | 流水线执行 |

## 5. POST 记录层

| 组件 | 静态 | E2E | 行为 | 测试内容 |
|------|------|-----|------|---------|
| gate-tuner | ✅ | ✅ | ❌ | 阈值动态调整 |
| self-enhance reflexion | ✅ | ✅ | ❌ | 任务后反思 |
| memory_decay | ✅ | ✅ | ❌ | 记忆衰减 |
| memory_consolidate | ✅ | ✅ | ❌ | 记忆合并 |
| memory_detect_conflicts | ✅ | ✅ | ❌ | 记忆冲突检测 |
| value_learn | ✅ | ✅ | ❌ | 用户反馈学习 |
| score_agent | ✅ | ✅ | ❌ | agent 信誉评分 |

## 6. MCP 服务器 (8个)

| MCP | 静态 | E2E | 行为 | 测试内容 |
|-----|------|-----|------|---------|
| memory-store (14 tools) | ✅ | ❌ | ❌ | 存储、检索、衰减、向量搜索、冲突解决 |
| world-model (5 tools) | ✅ | ❌ | ❌ | 查询、更新、预测、因果分析 |
| reward-system (4 tools) | ✅ | ❌ | ❌ | 评分、层次奖励、价值学习 |
| tool-tracker (5 tools) | ✅ | ❌ | ❌ | 使用追踪、agent 信誉 |
| sop-tracker (5 tools) | ✅ | ❌ | ❌ | SOP 匹配 |
| reflexion (4 tools) | ✅ | ❌ | ❌ | 自反思考 |
| priority-queue (6 tools) | ✅ | ❌ | ❌ | 任务排队 |
| monitor (3 tools) | ✅ | ❌ | ❌ | 健康监控 |

## 7. 跨层电路 (11条)

| 电路 | 静态 | E2E | 行为 | 测试内容 |
|------|------|-----|------|---------|
| OODA Loop | ✅ | ✅ | ❌ | 闭环 L1→L1.5→L2→L3→POST |
| Shared Global State | ✅ | ✅ | 🔄 | 跨组件状态共享 |
| 版本化状态 | ✅ | ✅ | ❌ | _version + changelog |
| WTA | ✅ | ✅ | ❌ | 评分排序取 top-2 |
| Mood→All | ✅ | ✅ | ❌ | 6 层传播路径 |
| 情绪感染 | ✅ | ✅ | ❌ | swarm→orchestrator |
| Personality→L3/Post | ✅ | ✅ | ❌ | OCEAN 特质漂移 |
| Reward→Attention | ✅ | ✅ | ❌ | 奖励偏置公式 |
| Attention Budget | ✅ | ✅ | ❌ | budget 分配 |
| Safety Continuous | ✅ | ✅ | ❌ | 6 个安全检查点 |
| World Predict→Verify | ✅ | ✅ | ❌ | 精度/召回追踪 |

## 缺口总结

| 层级 | 静态覆盖 | E2E 覆盖 | 行为覆盖 | 缺口 |
|------|---------|---------|---------|------|
| L1 感知 | 100% | 100% | 80% | 🔄 safety gate |
| L1.5 调制 | 100% | 100% | 0% | ❌ 情绪感染、稳态 |
| L2 门控 | 100% | 100% | 20% | ❌ WTA、共识、budget |
| L3 执行 | 100% | 80% | 0% | ❌ 因果、递归 DAG |
| POST 记录 | 100% | 80% | 0% | ❌ decay、consolidate 等 |
| MCP (8个) | 100% | 0% | 0% | ❌ 无运行时 MCP 测试 |
| 电路 (11条) | 100% | 100% | 0% | ❌ 无运行时电路验证 |

## 结论

- **静态覆盖**: 100% ✅ — 所有组件在 prompt 中存在
- **运行时行为**: ~15% ❌ — Agentest 需要在你 desktop 上跑才能验证真·行为
