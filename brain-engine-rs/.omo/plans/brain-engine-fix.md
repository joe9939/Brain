# brain-engine-fix - Work Plan

## TL;DR (For humans)
修复 brain-engine-rs 的 14 个架构/工程/文档问题，分 4 波执行。
**不改任何 public API 签名**，不新增外部依赖，所有现有 66 个测试继续通过。
总改动 ~16 文件，~+450 行 / -200 行，新增 ~25 个测试。
预期工期：每波 1-2 个 task() 调用。

## Scope

### IN
- RESEARCH.md 更正为真实状态
- 已定义未接线的方法打通（emotion→memory 标签, goal→reward 层级传播）
- Habit LLM 死代码清理 + 改为纯规则
- 冗余 LLM agent 字段清理
- 扩散激活升级（关键词+权重传播，非完整波传播）
- 注意力机制（surprise 驱动的注意力分配）
- 工作记忆注入 cognitive LLM context
- 认知→情绪反馈回路
- 基础反馈回路（认知决策反哺 wave）
- rig 重构为单 agent + 4 个 Rust tools
- rig provider 扩展（支持 deepseek / openai / ollama）
- rig retry + 超时 + token 预算

### OUT
- 串行→并行管线重构（架构级变更，以后）
- 完整波传播扩散激活（以后）
- 睡眠巩固循环（RESEARCH.md 已有但不在本轮）
- 小脑 / 默认模式网络 / 其他脑区（新架构决定）
- 任何 mineflayer-rust 或 azalea 代码

## Verification strategy
- 每波执行后：所有 66+ 现有测试通过
- 新增测试 ≥ 对应波 todos 数
- lsp_diagnostics 零错误
- cargo test 全部通过

## Execution strategy
4 波按依赖排序执行：
- W1（基础修复）→ W2（记忆增强）→ W3（回路修复）→ W4（rig 改进）
- 每波独立可测试，W1 无前置依赖
- W2 依赖 W1（memory 模块修改基于干净基线）
- W3 依赖 W2（feedback 使用注意力机制）
- W4 独立（只改 llm.rs）

## Todos

### W1: 基础修复（5 个 todos）

#### W1.1 RESEARCH.md 更正
- 文件：RESEARCH.md
- 做法：标题从"前沿人脑架构研究整合"改为"灵感与路线图 (Inspiration & Roadmap)"；每篇论文添加实际状态列（Implemented / Partial / Planned）；移除无引用声明
- 测试：无（纯文档）
- 验收：README 更新，无代码改动

#### W1.2 Emotion→Memory 标签接线
- [x] 文件：brain.rs（update_internal_state）、emotion.rs
- 做法：在 brain.rs 的 memory.add_episodic 调用时同时调用 emotion.tag_memory_with_emotion() 给记忆添加情绪标签
- 测试：1 个测试验证 episodic memory 存有 valence/arousal
- 验收：memory 查询返回的 MemNode 含非零 valence/arousal

#### W1.3 Goal→Reward 层级传播接线
- [x] 文件：brain.rs（tick）、reward.rs
- 做法：在 cognitive_tick 或 wave_to_action 产生 action 后，在 goal.complete 时调用 reward.hierarchical_update()
- 测试：1 个测试验证子目标完成贡献父目标分数
- 验收：hierarchical_update 在 goal complete 路径上被实际调用

#### W1.4 Habit LLM 死代码清理 + 纯规则化
- [x] 文件：llm.rs、brain.rs、habit.rs
- 做法：
  - 移除 llm.rs 中 HABIT_PREAMBLE 和 BrainAgents.habit 字段
  - habit.rs 添加自动提议逻辑：当新 state_desc 匹配不到 habit 时，自动从 wave.get_dominant() 创建 habit（频率=1, success_rate=0.5）
  - brain.rs 移除 agents.habit 相关代码
- 测试：3 个测试 — 自动提议、频率追踪、成功率过滤
- 验收：HabitLayer 不依赖 LLM，自动从状态创建习惯

#### W1.5 冗余 LLM agent 字段清理
- [x] 文件：llm.rs、brain.rs
- 做法：移除 BrainAgents 中 memory_summarizer 和 emotion 字段（均为 None 且从不初始化）
- 测试：无影响（现有编译和测试继续通过）
- 验收：BrainAgents struct 只剩 cognitive agent

### W2: 记忆增强（3 个 todos）

#### W2.1 扩散激活升级
- [x] 文件：memory.rs
- 做法：将 spreading_activation 从关键词匹配升级为：
  - 精确匹配 seed = 1.0，部分匹配 seed = 0.5
  - 通过 temporal/causal/entities 图传播激活到相邻节点（衰减因子 0.5）
  - 侧向抑制：同 entity 标签下只取最高分节点
  - 返回 top-K（K=5）
- 测试：3 个测试 — 传播、侧向抑制、空查询回退
- 验收：spreading_activation 返回结果包含关联传播的记忆

#### W2.2 注意力机制
- [x] 文件：新建 attention.rs + types.rs
- 做法：
  - AttentionState: { focus: String, intensity: f32, source: String }
  - 从 PredictiveLayer.surprise 计算注意力强度（高 surprise = 注意环境变化）
  - 从 wave.get_dominant() 分配注意力焦点
  - brain.rs tick 中更新注意力状态
- 测试：2 个测试 — surprise 驱动注意力、需求驱动焦点
- 验收：attention 状态在 MentalState 中存在并被更新

#### W2.3 工作记忆注入 cognitive context
- [x] 文件：llm.rs、brain.rs
- 做法：
  - LlmContext 添加 working_memory: Vec<String> 字段
  - LlmContext::build() 中从 state.mem.working 读取最近 5 条
  - to_dynamic_prompt() 追加工作记忆到 prompt
  - brain.rs update_internal_state 在每 tick 添加当前 action 到 working memory（上限 20 条，溢出移除最老）
- 测试：2 个测试 — prompt 包含工作记忆、LRU 溢出
- 验收：LLM prompt 包含 "Recent context: ..." 段

### W3: 回路修复（4 个 todos）

#### W3.1 认知→情绪反馈
- [x] 文件：brain.rs、emotion.rs
- 做法：
  - 在 cognitive_tick 成功解析 LLM action 后，调用 emotion.cognitive_regulate() 降低 urgency/caution
  - emotion.rs 新增 cognitive_regulate(&mut state, success: bool) 方法：
    - success=true → intensity *= 0.8, mode 趋向 Normal
    - success=false → 不干预（允许情绪自然衰减）
  - 这模拟 PFC 对杏仁核的认知重评
- 测试：2 个测试 — 成功调节、失败不干预
- 验收：cognitive tick 成功后情绪 intensity 降低

#### W3.2 认知→Wave 反馈
- [x] 文件：brain.rs、wave.rs
- 做法：
  - cognitive_tick 成功解析 action 后 → wave.reset_frustration(dominant_level)
  - cognitive_tick 失败/超时 → wave.mark_frustrated(dominant_level)
  - wave.rs 添加 reset_all_frustration() 方法
- 测试：2 个测试 — 成功重置、失败累积
- 验收：认知决策的反饋正确影响 frustration 计数

#### W3.3 波→Hormone→Emotion 闭环
- [x] 文件：brain.rs
- 做法：在 update_internal_state 中，当 wave 某个 level 持续高峰（>0.8）超过 10 tick 时，向 hormone 注入 cortisol（应激累积）
- 测试：1 个测试 — 长期饥饿导致 cortisol 上升
- 验收：长时间未满足的需求导致 chronic stress

#### W3.4 认知层可抑制反射（PFC→脊髓反射抑制）
- [x] 文件：brain.rs、reflex.rs
- 做法：
  - ReflexRegistry 添加 `cognitive_suppress: bool` 标志
  - cognitive_tick 可以设置 `reflexes.cognitive_suppress = true` 暂时抑制低优先级反射
  - reflex.check() 在 cognitive_suppress=true 时跳过 priority < 80 的反射（保留 flee_health 和 fire 等高危反射）
  - 每 tick 自动重置 suppress 标志
- 测试：2 个测试 — 认知层抑制 eat_urgent、高危反射仍然触发
- 验收：cognitive tick 后可暂时抑制非关键反射

### W4: rig 工程改进（3 个 todos）

#### W4.1 rig 单 agent + tools 模式
- [x] 文件：llm.rs、brain.rs
- 做法：
  - 移除 BrainAgents struct
  - 改为单个 CognitiveAgent { client: deepseek::Client, model: String }
  - cognitive 决策通过 prompt 发送完整 context，不再分多个 agent
  - 4 个 Rust function 工具（在 rust tool 中注册，由 LLM 调用）：
    - recall_memory(query: &str) → 调用 memory.retrieve
    - check_inventory(item: &str) → 检查快照
    - get_wave_status() → 当前需求状态
    - get_recent_actions(n: u32) → 最近动作历史
- 测试：2 个测试 — context 构建、工具定义存在
- 验收：BrainAgents 替换为 CognitiveAgent，编译通过，测试通过

#### W4.2 provider 扩展
- [x] 文件：llm.rs、brain.rs
- 做法：
  - BrainConfig 添加 llm_provider: enum { DeepSeek, OpenAI, Ollama }
  - ensure_agents() 根据 provider 创建对应 client
  - 默认保留 DeepSeek
- 测试：1 个测试 — 配置切换
- 验收：支持 3 种 provider 配置

#### W4.3 retry + timeout + token budget
- [x] 文件：llm.rs、brain.rs
- 做法：
  - cognitive tick 添加：max_retries=2, timeout=30s, token_budget=2048
  - retry 只在网络错误时重试，非逻辑错误
  - token_budget 超出截断 world_snapshot（优先保留 health/hunger/position）
- 测试：2 个测试 — retry 逻辑、budget 截断
- 验收：rig 调用有容错能力

## Final verification wave
在全部 4 波完成后并行执行：

| ID | Reviewer | Scope |
|----|----------|-------|
| F1 | momus | 计划合规审计：所有 todos 完成，无遗漏 |
| F2 | oracle | 代码质量审计：神经科学合理度、LLM 使用合理度 |
| F3 | human | 手动 QA：cargo test 全部通过，66+25=91 个测试 |
| F4 | oracle | 范围忠实度：只改了 scope 内的文件 |

## Commit strategy
每波结束时一个 commit，prefix ix(brain-engine-rs):：
- W1: ix(brain-engine-rs): 基础修复—文档/接线/死代码清理
- W2: ix(brain-engine-rs): 记忆增强—扩散激活/注意力/工作记忆
- W3: ix(brain-engine-rs): 回路修复—认知→情绪/反馈闭环
- W4: ix(brain-engine-rs): rig 工程改进—单agent/provider/retry

## Success criteria
- [ ] cargo test 全部通过（66+25 = 91 个测试）
- [ ] lsp_diagnostics 零错误
- [ ] RESEARCH.md 反映实际实现状态
- [ ] 所有已定义方法已接线
- [ ] 无 LLM 死代码
- [ ] 扩散激活返回关联传播结果
- [ ] 注意力状态在 mental state 中可查
- [ ] LLM prompt 包含工作记忆和情绪上下文
- [ ] 认知决策反哺情绪和需求
- [ ] 认知层可抑制非关键反射
- [ ] rig 支持 3 个 provider 且有 retry
