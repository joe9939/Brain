# 灵感与路线图 (Inspiration & Roadmap)

本文档列出 brain-engine-rs 设计中参考的研究思路和未来路线图。标注状态反映当前代码实际实现程度。

## 参考思路

| 思路来源 | 核心洞见 | 当前实现状态 |
|----------|---------|-------------|
| **ZenBrain** | 多层级记忆管线、巩固循环 | 🔲 Planned — 仅有基础 episodic/semantic 记忆，无睡眠巩固 |
| **SYNAPSE** | 扩散激活 + 侧向抑制 + 三重混合检索 | 🟡 Partial — `spreading_activation()` 有基础关键词匹配，无波传播和侧向抑制 |
| **MAGMA** | 多图(语义/时间/因果/实体) + 策略遍历 | 🟡 Partial — `MemGraphs` 有 temporal/causal/entities 图，无策略遍历 |
| **CraniMem** | 目标门控 + 效用标记 + 计划性巩固 | 🟡 Partial — `should_store()` 有阈值门控，非效用标记 |
| **Cognitive Scaffold** | 流体上下文→结晶记忆 + RFT压缩 | 🔲 Planned |
| **GAM** | 事件触发状态切换 + 解耦编码/巩固 | 🔲 Planned |
| **MAP** | PFC模块化规划 + 错误监控 + 状态预测 | 🔲 Planned — 当前 GoalSystem 为基础 priority 排序 |
| **EMBER** | SNN+LLM混合架构 + STDP联想触发 | 🔲 Planned — 远期 |
| **BriLLM** | SiFu信号传播 + 静态语义节点 | 🔲 Planned — 远期 |

## 整合路线图

```
Phase 1 (当前) — 基础架构完成
  ✅ 20 脑区
  ✅ 67 测试
  ✅ 基础记忆系统
  ✅ 激素/情绪/奖赏

Phase 2 (现在) — 前沿整合
  🔲 MAGMA 多图记忆 (语义+时间+因果+实体)
  🔲 SYNAPSE 扩散激活检索
  🔲 CraniMem 门控写入
  🔲 ZenBrain 睡眠巩固循环
  🔲 MAP 模块化规划 (DLPFC)

Phase 3 (未来) — 高级
  🔲 EMBER SNN 联想触发
  🔲 BriLLM 全可解释架构
  🔲 多模态记忆
  🔲 跨实例社交记忆 (Agent Society)
```

## 立即开始: Phase 2 优先级

1. **多图记忆** — 用 dashmap 实现三图(时间/因果/实体) + MenteDB(语义)
2. **扩散激活** — 替代线性关键词搜索
3. **门控写入** — 基于效用的记忆过滤
4. **睡眠巩固** — 定期高效用回放 + 低效用剪枝
5. **模块化规划** — DLPFC 真实任务分解
