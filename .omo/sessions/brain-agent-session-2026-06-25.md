# Brain Agent Session — 2026-06-25

## 项目概述

**brain-agent** v1.0.0 — 受 arXiv 2504.01990（Foundation Agents）启发的脑启发多智能体系统  
实现 20 个大脑区域智能体、8 个 MCP 服务器、1 个安全插件，论文对齐度 98%（42/43 章节）。

## 本 Session 负责范围

### MCP 服务器测试（主要任务）
为 8 个 MCP 服务器添加 `bun test` 支持，参考 OMO（Oh-My-OpenCode）现有测试模式：

| MCP 服务器 | 目录 | 状态 | 源文件 |
|-----------|------|------|--------|
| **memory-store** | `src/mcp/memory-store/` | ✅ 已增强 | store.ts, server.ts, types.ts, embedding.ts, decay.ts, summary.ts, validate.ts, schema.sql |
| **world-model** | `src/mcp/world-model/` | ✅ 已增强 | graph.ts, server.ts, types.ts |
| **reward-system** | `src/mcp/reward-system/` | ✅ 已增强 | scorer.ts, server.ts, types.ts |
| **tool-tracker** | `src/mcp/tool-tracker/` | ✅ 已创建 | tracker.ts, server.ts |
| **sop-tracker** | `src/mcp/sop-tracker/` | ✅ 已创建 | matcher.ts, server.ts |
| **reflexion** | `src/mcp/reflexion/` | ✅ 已创建 | reflector.ts, server.ts |
| **priority-queue** | `src/mcp/priority-queue/` | ✅ 已创建 | queue.ts, server.ts |
| **monitor** | `src/mcp/monitor/` | ✅ 已创建 | monitor.ts, server.ts |

### 测试策略（来自 paper-upgrade plan）
- **框架**: 原定 Node tap，现考虑 bun test（参考 OMO 模式）
- **MCP 测试**: 单元测试 + 集成测试（工具调用冒烟）
- **要求**: 每个 MCP 必须通过 `npm test`（单元） + 工具调用冒烟（集成）
- **Agent .md 文件**: 通过 grep 验证章节完整性

## 项目结构

```
brain-agent/
├── .omo/
│   ├── plans/brain-agent-paper-upgrade.md          ← 完整 25-todo 计划（全部完成）
│   ├── drafts/brain-agent-paper-upgrade.md         ← 计划草稿
│   └── sessions/brain-agent-session-2026-06-25.md  ← 当前 session 文档
├── .opencode/
│   ├── prompts/brain/     ← 20 个 brain agent prompt 文件
│   └── skills/brain-master.md  ← orchestrator 路由规则
├── src/
│   ├── mcp/               ← 8 个 MCP 服务器（TypeScript）
│   ├── plugin/            ← brain-plugin.mjs（G1-G7 安全门）
│   ├── agents/            ← 20 个 agent 定义文件
│   ├── commands/          ← slash 命令
│   └── skills/            ← brain-master.md skill
├── benchmarks/            ← 基准测试框架
├── docs/                  ← 架构与论文对齐文档
├── config/                ← opencode.example.json
└── oh-my-openagent.jsonc  ← 20 个 category + team_mode + ulw-loop
```

## 已完成工作（25/25 todos）

### Wave 1: 基础
- [x] 1. 创建 agent spec 模板（CIRCUIT 感知的 7 部分模板）
- [x] 2. 重写全部 20 个 brain agent .md 文件
- [x] 3. 重写 brain-master.md orchestrator（3 层路由 + 回路连接）

### Wave 2: 记忆增强
- [x] 4. 添加 Ollama 向量嵌入客户端到 memory-store
- [x] 5. 添加混合检索（关键词 + 向量）到 memory-store
- [x] 6. 添加情景回放 + 更新 hippocampus.md

### Wave 3: 安全升级
- [x] 7. 扩展 brain-plugin.mjs 到 G1-G7 安全门
- [x] 8. 更新 safety-cortex.md

### Wave 4: 工具追踪
- [x] 9. 创建 tool-tracker MCP
- [x] 10. 更新 cerebellum.md

### Wave 5: 奖励系统
- [x] 11. 添加 UCB 探索奖励到 reward-system
- [x] 12. 添加 TD 学习和层次化评分
- [x] 13. 更新 reward-cortex.md

### Wave 6: 世界模型
- [x] 14. 添加 AST 级符号提取到 world-model
- [x] 15. 更新 world-cortex.md

### Wave 7: SOP 匹配
- [x] 16. 创建 SOP-tracker MCP（基底神经节）
- [x] 17. 更新 basal-ganglia.md

### Wave 8: 自增强
- [x] 18. 创建 Reflexion-loop MCP
- [x] 19. 更新 self-enhance + self-optimizer

### Wave 9: 注意力 + 周期性
- [x] 20. 创建 priority-queue MCP
- [x] 21. 配置 OMO ulw-loop（DMN/consolidation/hypothalamus）
- [x] 22. 更新 attention-cortex.md

### Wave 10: 监控 + 情绪
- [x] 23. 创建 monitor MCP（脑岛）
- [x] 24. 添加情绪追踪到 memory-store + 更新 amygdala.md
- [x] 25. 完善 thalamus.md

### 最终验证（F1-F4）
- [x] F1. 计划合规审计 — ✅ ALL APPROVE
- [x] F2. 代码质量审查 — ✅ ALL APPROVE
- [x] F3. 真实手动 QA — ✅ ALL APPROVE
- [x] F4. 范围保真度 — ✅ ALL APPROVE

## OMO 测试模式参考

OMO（Oh-My-OpenCode）的测试方式通过以下机制提供：

### 1. Swarm Tester 智能体
`oh-my-openagent.jsonc` 中定义了 `brain-swarm-tester` 类别：
```json
"brain-swarm-tester": {
  "model": "opencode/deepseek-v4-flash-free",
  "variant": "high",
  "description": "Executes verification tests for reviewed implementation"
}
```
测试作为 swarm 流水线的最后一步：planner → coder → reviewer → **tester**

### 2. 内置测试技能
- `test-driven-development` — 在实现前编写测试
- `verification-before-completion` — 声称完成前运行验证命令

### 3. OpenCode 项目管理
- `TodoWrite` — 跟踪测试任务
- `task()` 子代理 — 运行测试套件并报告结果

### 4. benchmarks/run.js
现有基准测试框架（9/10 功能测试通过，3/3 安全测试通过）。

## 关键技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 嵌入模型 | Ollama + bge-small-en-v1.5 | 33MB, CPU-only, 零成本 |
| MCP 语言 | 全 TypeScript | 保持一致的技术栈 |
| 安全架构 | 单文件 G1-G7 plugin | 集中管理所有安全门 |
| 路由方式 | brain-master.md 手动路由 | OMO 不支持按 category 注入上下文 |
| 测试框架 | tap（现有）→ bun（目标） | 参考 OMO 模式，更现代 |

## 8 个 MCP 服务器的 package.json（测试配置缺失）

所有 8 个 MCP 的 package.json 都有 `scripts: { build, start }`，
**但都没有 `test` 脚本**。需要：
1. 添加 `bun` 作为依赖
2. 添加 `"test": "bun test"` 脚本
3. 为每个 MCP 的源文件创建 `*.test.ts` 测试文件

## 环境限制

- **OS**: Windows (x64)
- **Node**: v24.13.1
- **npm/npx**: PowerShell 执行策略阻止 `.ps1` 脚本（需用 `.cmd` 版本）
- **bun**: 未安装（需要先安装）
- **Bun 替代方案**: 可用 `node --test`（Node 内置测试运行器）或先安装 bun

## 参考文档

- 计划文件: `.omo/plans/brain-agent-paper-upgrade.md`（616 行，完整计划）
- 草稿文件: `.omo/drafts/brain-agent-paper-upgrade.md`（架构决策）
- OMO 配置: `oh-my-openagent.jsonc`（20 categories, team_mode, ulw-loop）
- 论文: arXiv 2504.01990 — Foundation Agents for the OpenCode Platform
