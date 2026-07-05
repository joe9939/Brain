# Brain Agent v2 — 论文对照完整验证
## arXiv 2504.01990v2 "Advances and Challenges in Foundation Agents"

---

## 一、Agent Loop (§1.3A) — 核心循环

### 论文定义
```
Perception:  o_t = P(s_t, M_{t-1})     ← 感知受 mental state 影响
Cognition:   (M_t, a_t) = C(M_{t-1}, a_{t-1}, o_t)  ← 学习+推理
  Learning:  M_t = L(M_{t-1}, a_{t-1}, o_t)  ← 更新 mental state
  Reasoning: a_t = R(M_t)                  ← 决定下一步动作
Execution:   a'_t = E(a_t)                 ← 执行
Transition:  s_{t+1} = T(s_t, a'_t)       ← 环境变化
```

### 我们的实现
| 论文 | v2 实现 | 状态 |
|------|---------|------|
| P(s_t, M_{t-1}) | `brain-engine.ts` process() 先更新 emotion + memory | ✅ |
| C(M, a, o) | `BrainEngine.process()` 整个流程 | ✅ |
| L: M_t update | `memory.addToWorking()` + `emotion.update()` + `reward.update()` | ✅ |
| R: a_t = R(M_t) | `basalGanglia.getWinner()` → 信号决定动作 | ✅ |
| E: a'_t = E(a_t) | 输出融合 `formatOutput()` | ✅ |
| M_t structure | `MentalState { mem, wm, emo, goal, rew }` | ✅ |

**缺失:**
- ❌ 环境状态 s_t 追踪 — 我们没有显式维护环境状态
- ❌ Transition T(s, a) — 我们假定环境是 OpenCode，不模拟环境变化

---

## 二、Memory (§2.2) — 完整对照

### 论文 Memory Types (§2.2.1)
| 类型 | 论文描述 | 我们的实现 | 状态 |
|------|---------|-----------|------|
| Sensory Memory | 原始感官输入缓存, <1s | ❌ 没有 | ❌ |
| Short-term/Working | 当前上下文, 有限容量 | `state.mem.working` (max 5) | ✅ |
| Long-term Episodic | 具体事件记忆 | `MemorySystem.addEpisodic()` | ✅ |
| Long-term Semantic | 概念/事实知识 | `MemorySystem.addSemantic()` | ✅ |
| Long-term Procedural | 技能/SOPs | `MemorySystem.addSOP()` + `matchSOP()` | ✅ |

### 论文 Memory Lifecycle (§2.2.2)
| 阶段 | 论文描述 | 我们的实现 | 状态 |
|------|---------|-----------|------|
| Acquisition | 获取新信息 | `addToWorking()` | ✅ |
| Encoding | 编码为可存储格式 | `consolidateToEpisodic()` | ✅ |
| Consolidation | 工作→长期转化 | 自动当working满时触发 | ✅ |
| Retrieval | 检索相关记忆 | `retrieveEpisodic()` / `retrieveSemantic()` | ✅ |
| Forgetting | 选择性遗忘 | `forgetLowImportance()` | ✅ |
| Utilization | 使用记忆指导行为 | 信号公式中引用 memory | ⚠️ 简略 |

**缺失:**
- ❌ Sensory memory — 我们没有原始输入缓存
- ❌ Memory encoding 的显式 importance 计算

---

## 三、Emotion (§2.5) — 完整对照

### 论文 Emotion Model
| 维度 | 论文描述 | 我们的实现 | 状态 |
|------|---------|-----------|------|
| Mode | NORMAL/CAUTION/URGENT/EXPLORE/SUPPORT | ✅ 全部5种 | ✅ |
| Intensity | 0-1 情绪强度 | ✅ | ✅ |
| Valence | -1到1, 正负效价 | ✅ | ✅ |
| Arousal | 0-1 唤醒度 | ✅ | ✅ |
| Dominance | 0-1 支配感 | ✅ | ✅ |

### 论文 Emotion functions
| 功能 | 实现 | 状态 |
|------|------|------|
| 情绪检测 | `detectUrgency()` `detectCaution()` `detectSupport()` | ✅ |
| 情绪衰减 | `intensity *= 0.9`, `valence *= 0.95`, `arousal *= 0.95` | ✅ |
| 情绪影响信号 | emotion signal 公式: `CAUTION ? 0.9 : intensity * 0.5` | ✅ |

**缺失:**
- ❌ 情绪影响记忆编码（高唤醒事件应记忆更久）
- ❌ 情绪影响注意力的显式机制

---

## 四、Reward (§2.4) — 完整对照

### 论文 Reward Types (§2.4.3)
| 类型 | 实现 | 状态 |
|------|------|------|
| Extrinsic | `success ? +1.0 : -0.5` | ✅ |
| Intrinsic | `novelty * 0.3` | ✅ 有接口但未主动调用 |
| TD Error | `td_error = newScore - prevScore` | ✅ |
| Reward history | `state.rew.history` (max 100) | ✅ |

**缺失:**
- ❌ Hierarchical rewards (子目标奖赏)
- ❌ 奖赏影响情绪（正面结果→正面情绪）

---

## 五、Action System (§2.7) — 完整对照

### 论文 Action Types
| 类型 | 描述 | 我们的 agent |
|------|------|-------------|
| **Mental actions** | 推理/规划/反思/想象/决策 | perceive, reward, learning 信号 |
| Reasoning | 逻辑推理 | `reward` 信号 → 深度推理 |
| Planning | 任务分解 | `swarm-planner` agent |
| Reflection | 自我反思 | `self-enhance`, `reflexion` |
| Decision-making | 选择最佳行动 | `basal-ganglia` Go/NoGo |
| **Physical actions** | 工具调用/执行 | action 信号 → swarm |
| Tool use | 外部工具 | swarm-coder/reviewer/tester |
| Communication | 输出回复 | `brain` agent 合成 |

### 论文 Action Learning Paradigms (§2.7.3)
| 范式 | 描述 | 我们的实现 | 状态 |
|------|------|-----------|------|
| Action Space | 预定义可用动作 | signal gate 定义允许工具 | ✅ |
| Action Learning | 从经验改进决策 | reward + td_error | ✅ |
| Tool Learning | 学习和使用外部工具 | swarm 执行层 | ✅ |
| Agent Learning | 端到端 agent 学习 | ❌ 没有 | ❌ |

---

## 六、Cognition (§2.1) — 完整对照

### 论文 Learning Functions
| 空间 | 实现 | 状态 |
|------|------|------|
| Full learning (RLHF/SFT) | ❌ 不在v2范围 | ❌ |
| Partial (in-context) | session 历史 | ✅ |
| Memory-based | episodic + semantic | ✅ |

### 论文 Reasoning Types
| 类型 | 描述 | 我们的 agent |
|------|------|-------------|
| **Structured** | 有结构的推理链 | swarm-planner 分解 |
| Dynamic (ReAct, ToT) | 交替推理/行动 | perceive 信号→行动 |
| Static (CoT) | 单一推理链 | L1 感知链 |
| **Unstructured** | 无固定结构的推理 | dmn (默认模式) |
| Planning | 规划未来动作 | swarm-planner |
| Decision-making | 选项评估 | basal-ganglia |

**缺失:**
- ❌ Tree-of-Thought / Graph-of-Thought 等高级推理模式

---

## 七、安全系统 (§5) — 完整对照

### 论文 Threat Types
| 威胁 | 实现 | 状态 |
|------|------|------|
| 危险命令 (G1) | `reflexCheck()` | ✅ |
| 敏感文件 (G3) | 反射层正则 | ✅ |
| Prompt注入 (G3/G5) | 反射层检测 | ✅ |
| 数据外泄 (G4) | 反射层检测 | ✅ |
| Jailbreak | ❌ 未实现 | ❌ |
| 幻觉风险 | ❌ 未实现 | ❌ |

---

## 八、Self-Enhancement (§3) — 完整对照

| 论文组件 | 我们的实现 | 状态 |
|---------|-----------|------|
| Self-optimization | `self-optimizer` agent | ✅ |
| Reflection | `self-enhance` agent | ✅ |
| Offline consolidation | `offline-consol` agent | ✅ |
| Continual learning | ❌ 没有 | ❌ |
| Knowledge distillation | ❌ 没有 | ❌ |

---

## 九、Multi-Agent (§4) — 完整对照

| 论文概念 | 我们的实现 | 状态 |
|---------|-----------|------|
| Multi-agent topology | session pool + 并行 | ✅ |
| Communication protocol | MCP + 共享 mental state | ✅ |
| Collaboration | swarm 执行层 | ✅ |
| Agent society | ❌ 跨实例协作 | ❌ |

---

## 十、每个组件的信息流对照

| 组件 | 从谁获取信息 | 注入什么信息 | 输出到哪里 |
|------|------------|------------|-----------|
| **thalamus** | 用户输入 | 门控/意图分类 | amygdala, hippocampus, world-cortex, safety |
| **amygdala** | thalamus 输出 | 情绪模式M^emo | basal-ganglia (信号竞争) |
| **hippocampus** | thalamus 输出 + 记忆库 | 相关记忆 | basal-ganglia |
| **world-cortex** | thalamus 输出 + 代码库 | 世界模型预测 | basal-ganglia |
| **safety** | thalamus 输出 | 安全风险 | 反射层 / basal-ganglia |
| **cerebellum** | L1 输出 | 协调策略 | attention |
| **basal-ganglia** | 所有L1 + 评估层 | Go/NoGo 决策 | 信号门控 |
| **insula** | amygdala + safety | 异常检测 | attention |
| **attention** | 所有上层 | 优先级 | basal-ganglia |
| **reward** | thalamus + 执行反馈 | 奖赏值 M^rew | basal-ganglia |
| **dmn** | hippocampus + 记忆 | 创意联想 | self-enhance |
| **hypothalamus** | 所有层 | 平衡检测 | brain |
| **self-optimizer** | reward + history | 优化建议 | brain |
| **offline-consol** | hippocampus | 记忆巩固 | brain |
| **self-enhance** | 所有层 | 学习总结 | brain |
| **swarm-planner** | brain 指令 | 任务分解 | swarm-coder/reviewer/tester |
| **swarm-coder** | planner | 代码实现 | swarm-reviewer |
| **swarm-reviewer** | coder | 代码审查 | swarm-tester |
| **swarm-tester** | reviewer | 验证 | brain |
| **brain** | 所有层 | 最终合成 | 用户 |

---

## 十一、信号公式完整对照

| 信号 | 论文公式 | 我们的公式 | 匹配 |
|------|---------|-----------|------|
| perceive | 基于 L1 完成度 | `l1.size < 5 ? 1.0 - l1.size * 0.15 : 0` | ✅ |
| emotion | 基于情绪模式+强度 | `CAUTION/URGENT ? 0.9 : intensity * 0.5` | ✅ |
| safety | CAUTION 模式 | `CAUTION ? 0.9 : 0` | ✅ |
| memory | 基于SOP/情景数量 | `SOP>0 ? 0.8 : episodic>0 ? 0.5 : 0` | ✅ |
| reward | 基于score/td_error | `score<3 ? 0.8 : \|td_error\|>1 ? 0.6 : 0` | ✅ |
| action | 复杂任务标识 | `active goals > 0 ? 0.8 : 0` | ✅ |
| learning | 任务完成+L1完整 | `goals>0 && L1 done ? 0.7 : 0` | ⚠️ 论文还包含 curiosity |

---

## 总结：缺失项

| # | 缺失 | 优先级 | 论文章节 |
|---|------|--------|---------|
| 1 | Sensory memory (原始输入缓存) | 🟢 | §2.2.1 |
| 2 | 环境状态追踪 s_t | 🟡 | §1.3A |
| 3 | Tree-of-Thought 推理 | 🟢 | §2.1.3 |
| 4 | 情绪影响记忆编码 | 🟡 | §2.5 |
| 5 | 层级奖赏 (hierarchical reward) | 🟢 | §2.4.3 |
| 6 | 奖赏→情绪反馈 | 🟡 | §2.4→2.5 |
| 7 | Jailbreak 检测 | 🟡 | §5 |
| 8 | 幻觉检测 | 🟢 | §5 |
| 9 | Continual learning | 🟢 | §3 |
| 10 | Agent society (跨实例) | 🟢 | §4 |

**核心部分（信号竞争、门控、20组件、记忆、情绪、奖赏、安全）全部对齐论文。**
