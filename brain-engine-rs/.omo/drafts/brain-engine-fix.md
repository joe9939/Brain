# brain-engine-fix — Draft / Resume

## Intent
CLEAR — 基于深度审计（已完成）修复 brain-engine-rs 的架构、神经科学忠实度、LLM 使用合理度、rig 工程、文档问题。

## Topology — Components

| ID | Component | Status | Evidence |
|----|-----------|--------|----------|
| C1 | RESEARCH.md / Paper citations | ?? 无实际引用，代码与论文脱节 | RESEARCH.md — 9篇论文无DOI/arXiv/作者 |
| C2 | Emotion→Memory tagging | ?? 定义但不调用 | emotion.rs:73 tag_memory_with_emotion() 从未被调用 |
| C3 | Goal→Reward hierarchical propagation | ?? 定义但不调用 | reward.rs:52 hierarchical_update() 从未被调用 |
| C4 | Habit LLM proposal | ?? 不应使用LLM | llm.rs:32 HABIT_PREAMBLE — 基底节不是语言模型 |
| C5 | Extra LLM agents | ?? memory_summarizer/emotion 默认None但代码存在 | llm.rs:54-55 |
| C6 | Spreading activation | ?? 关键词匹配冒充扩散激活 | memory.rs:54 |
| C7 | Attention mechanism | ?? 缺失 | 整个系统无注意力模块 |
| C8 | Cognitive→Emotion feedback | ?? 缺失 | PFC不能抑制杏仁核 |
| C9 | Working memory→Cognitive context | ?? 缺失 | memory.working未注入LLM context |
| C10 | Serial pipeline vs parallel | ?? 串行if-return链 | brain.rs:97-164 |
| C11 | Feedback loops | ?? 缺反馈回路 | 认知决策不反哺wave/emotion |
| C12 | rig-core 0.40 API 运行时验证 | ?? 编译通过但未测试 | 66测试全跳过agent初始化 |
| C13 | rig provider 扩展/retry/token budget | ?? 硬编码deepseek，无容错 | llm.rs:68-72 |
| C14 | rig 多agent→单agent+tools | ?? 过度设计 | llm.rs:48-56 |

## Decisions Adopted (not needing user interview)

| Decision | Adopted Default | Rationale |
|----------|----------------|-----------|
| RESEARCH.md处理 | 改为"Inspiration & Roadmap"，论文改为按实际实现标注状态 | 当前标题"前沿研究整合"具有误导性 |
| 已定义不调用方法 | 事件化注入：tag_memory_with_emotion 在 memory.add_episodic 调用，hierarchical_update 在 goal.complete 调用 | 函数存在只缺调用点 |
| Habit LLM 替代 | 纯规则：基于 frequency + success_rate 自动提建议 | 基底节元学习，不需LLM |
| 注意力机制实现 | 基于 surprise + prediction_error 的加权注意力分配 | surprise 数据已存在于 PredictiveLayer |
| 并行处理 | 当前保持串行tick架构，组件内部改为并行 | 重构tick管线为并行是架构级变更，以后再做 |
| rig 单agent+tools | 从多agent改为1个 cognitive agent + 4个 tool calls | 每个组件独立agent成本高、延迟高 |

## Status
awaiting-approval

## Pending action
write .omo/plans/brain-engine-fix.md

## Approach
分 4 波 (Waves) 实现，每波 3-4 个 todos，按依赖关系排列：
- Wave 1: P0 低 hanging fruit（论文、未调用方法、Habit LLM 去除）
- Wave 2: P0→P1 记忆系统增强（真实扩散激活、注意力机制、工作记忆注入）
- Wave 3: P1 回路修复（认知→情绪反馈、反馈回路）
- Wave 4: P2 rig 工程改进（provider扩展、单agent+tools、retry）
