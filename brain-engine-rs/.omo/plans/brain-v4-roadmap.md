# brain-v4: 迈向生物拟真架构 — 论文驱动路线图

> 目标：在现有 Rust + rig-core 能力范围内，极限逼近人脑计算架构
> 参考 25+ 顶级论文，分 5 个里程碑迭代

---

## 神经科学理论框架

```
人类决策系统（简化）
                                        
  默认模式网 ───→ 情景自传体回忆
      │
  睡眠巩固 ←─── 海马体临时绑定
      │
  PFC 规划 ──→ 基底核门控 ──→ 运动输出
      │              │
  工作记忆 ←───   丘脑皮层环
      │
  感觉皮层 ←─── 内感预测 (Interoception)
      
  并行子模块:
  小脑: 运动序列优化
  杏仁核: 情绪快速评估
  脑干: 5-HT/NE/ACh 调质系统
```

**论文锚**: Buckner et al. (2008) *The brain's default network* | Sherman (2005) *Thalamocortical loops* | Doya (2002) *Metalearning and neuromodulation* | Ito (2006) *Cerebellar circuitry as a neuronal machine*

---

## P0: 神经调质系统扩展

**论文基础**:
- **Doya K. (2002)** "Metalearning and neuromodulation" *Neural Networks* — 5-HT=冲动控制, NE=警觉/学习率, ACh=记忆巩固率
- **Dayan P. (2012)** "Twenty-five lessons from computational neuromodulation" *Neuron*
- **Aston-Jones & Cohen (2005)** "An integrative theory of locus coeruleus-norepinephrine function" *Annual Review of Neuroscience* — NE 与注意力的 Yerkes-Dodson 曲线关系

### 新增: 3 种调质

```rust
pub struct NeuromodulatorSystem {        // 新建 modulator.rs
    pub serotonin: f32,                  // 冲动抑制 (0-1), 基线 0.5
    pub norepinephrine: f32,             // 警觉/学习率 (0-1), 基线 0.3
    pub acetylcholine: f32,              // 记忆编码率 (0-1), 基线 0.4
}
```

| 调质 | 源 | 影响 | 更新规则 |
|------|----|------|---------|
| 5-HT 血清素 | 中缝核 | 冲动抑制 = cognitive_tick 成功时 +0.1, 失败时 -0.05, 高 5-HT 增加 reflex 抑制阈值 | 慢衰减 τ=0.99 |
| NE 去甲肾上腺素 | 蓝斑 | Yerkes-Dodson: 最优警觉≈0.6, 过低=分心, 过高=焦虑退化 | surprise → NE 峰值, 指数衰减 |
| ACh 乙酰胆碱 | 基底前脑 | novelty → ACh 上升 → 记忆 importance 调制 | 新实体/环境时脉冲, τ=0.95 |

### 影响点
- `reflex.rs`: 5-HT 高时抑制额外的反射阈值上升
- `emotion.rs`: NE 调制 arousal 计算
- `memory.rs`: ACh 调制 `modulate_memory_importance()`
- `attention.rs`: NE 与当前 attention.intensity 做 Yerkes-Dodson 乘积

**测试**: 5 个 — 各调质基线/衰减/刺激响应

**文件**: 新建 `modulator.rs`, 改 `types.rs`/`brain.rs`/`memory.rs`/`reflex.rs`/`emotion.rs`

---

## P1: 海马体快速绑定 + 睡眠巩固

**论文基础**:
- **McClelland et al. (1995)** "Why there are complementary learning systems in the hippocampus and neocortex" *Psychological Review* — 经典 CLS 理论
- **Kumaran et al. (2016)** "Computations in the hippocampus" *Current Opinion in Neurobiology*
- **Tonegawa et al. (2015)** "Memory engram storage and retrieval" *Current Opinion in Neurobiology*
- **Nadel & Moscovitch (1997)** "Memory consolidation, retrograde amnesia and the hippocampal complex" *Current Opinion in Neurobiology*

### 架构: 双系统记忆

```
当前: MemorySystem (单一 graph)

P1:  HippocampalBuffer (快速绑定, 易失)
          │
          │ sleep_cycle (每 ~100 tick)
          ▼
     NeocorticalStore (慢索引, 持久 = 当前 MemGraphs)
```

```rust
pub struct HippocampalBuffer {            // 改 memory.rs
    pub recent: Vec<MemNode>,             // 未 consolidation 的记忆
    pub max_size: usize,                  // 默认 20
    pub pattern_separation: bool,         // 正交化防止干扰
}
impl MemorySystem {
    async fn sleep_consolidate(&mut self) {
        // 1. 从 hippocampal 筛选 importance > threshold
        // 2. 重放到 neocortical graph
        // 3. 对语义相似节点做模式合并
        // 4. 低 utility 剪枝
        // 5. 清空 hippocampal buffer
    }
}
```

### Sleep Consolidation 触发
- `BrainEngine.turn_count % 100 == 0`
- 或 `surprise < 0.01 && !urgent`（低负载时）
- 或手动 `consolidate()` 调用

**测试**: 3 个 — buffer 溢出→自动合并、巩固后重要性上升、无关记忆剪枝

**文件**: 改 `memory.rs`, 改 `brain.rs`(tick 中触发)

---

## P2: 基底核门控 (Basal Ganglia Gating)

**论文基础**:
- **Redgrave et al. (1999)** "The basal ganglia: a vertebrate solution to the selection problem?" *Neuroscience* — BG = 动作选择通用解决
- **Frank et al. (2001)** "Interactions between basal ganglia and prefrontal cortex" *Cognitive Science* — Go/NoGo 通路
- **O'Reilly & Frank (2006)** "Making working memory work: a computational model" *Psychological Review* — BG→PFC 工作记忆门控
- **Bogacz et al. (2006)** "The physics of optimal decision making" *Psychological Review* — BG 作为漂移扩散模型

### 架构: 串行→并行+仲裁

**当前**:
```
Reflex ─→ Predictive ─→ Habit ─→ Cognitive     ← 串行短路
```

**P2**:
```
Reflex ───┐
Predictive ┼──→ BasalGanglia ──→ 输出
Habit ────┘     │
Cognitive ──→   Go/NoGo + 置信度
```

```rust
pub struct BasalGangliaArbiter {           // 新建 basal.rs
    pub go_signal: f32,                    // 来自 cognitive 置信度
    pub urgency: f32,                      // 来自 emotion.intensity
    pub inhibition: f32,                   // 来自 5-HT
}

impl BasalGangliaArbiter {
    /// Accumulate evidence and select action (drift diffusion)
    pub fn select(&mut self, candidates: &[ProposedAction]) -> Option<ProposedAction> {
        // 1. 每个候选累加 evidecence = 置信度 * (1 + urgency)
        // 2. 达 threshold Go 则选择
        // 3. 抑制低于 inhibition 阈值的候选
        // 4. 返回选择结果
    }
}
```

### 关键设计: Go/NoGo 双通路
- **Go**: Cognitive 高置信度 → 快速通过
- **NoGo**: Reflex 高优先级 → 紧急覆盖 cog（health < 5 时直接跳转）
- 两个通路在基底核输出核团汇聚

**测试**: 3 个 — Go 选择、NoGo 抑制、紧急覆盖

**文件**: 新建 `basal.rs`, 改 `brain.rs`(tick 重构), 改 `types.rs`

---

## P2.5: 小脑运动序列学习

**论文基础**:
- **Ito M. (2006)** "Cerebellar circuitry as a neuronal machine" *Progress in Neurobiology* — 小脑作为时序预测器
- **Doya K. (2000)** "Complementary roles of basal ganglia and cerebellum" *Neural Networks* — BG=动作选择, 小脑=动作精调
- **Raymond & Medina (2018)** "Computational principles of cerebellar learning" *Annual Review of Neuroscience*

```rust
pub struct Cerebellum {                     // 新建 cerebellum.rs
    pub sequences: Vec<MotorSequence>,      // 运动序列库
    pub prediction_error: f32,              // 时序预测误差
}

pub struct MotorSequence {
    pub id: String,
    pub steps: Vec<String>,                 // [action, action, ...]
    pub success_rate: f32,
    pub latency_ms: f64,                    // 期望执行时间
}

impl Cerebellum {
    /// 学习新序列: 从 reflex + habit 组合提取
    pub fn learn(&mut self, sequence: MotorSequence) { ... }
    /// 预测下一步: 给定当前动作, 返回预期后续
    pub fn predict_next(&self, current_action: &str) -> Option<&str> { ... }
}
```

### 小脑与基底核协作
- **基底核**: "做什么"（动作选择）
- **小脑**: "怎么做"（时序优化）

**测试**: 2 个 — 序列学习、时序预测

**文件**: 新建 `cerebellum.rs`, 改 `basal.rs`(接入选通信号)

---

## P3: 默认模式网络 (Default Mode Network)

**论文基础**:
- **Raichle et al. (2001)** "A default mode of brain function" *PNAS* — DMN 的发现
- **Buckner et al. (2008)** "The brain's default network: anatomy, function, and relevance to disease" *Annals of the New York Academy of Sciences*
- **Smallwood & Schooler (2015)** "The science of mind wandering" *Annual Review of Psychology* — 心智游荡的认知价值

### 设计
- 当 `surprise < 0.05 && emotion.intensity < 0.3 && no hostiles` 时触发
- DMN tick 不产生动作 → 更新内部状态

```rust
pub struct DefaultModeNetwork {             // 新建 dmn.rs
    pub active: bool,
    pub autobiographical_recall: Vec<MemNode>,  // 自传体回忆
    pub counterfactual: String,              // 反事实思考
    pub identity_consolidation: f32,         // 自我叙事巩固度
}

impl DefaultModeNetwork {
    /// DMN tick — 不走认知管线
    pub fn tick(&mut self, memory: &MemorySystem, emotion: &EmotionState) {
        // 1. 检索高 valence/arousal 的记忆
        // 2. 构建反事实 (如果当时做了不同选择?)
        // 3. 提升 self-identity 连贯性
    }
}
```

### 产物
- 自传体回忆 → 下次 cognitive prompt 追加
- 反事实 → habit 调整权重
- DMN 活跃期间不响应外部刺激（认知节能）

**测试**: 2 个 — 触发条件、自传体检索

**文件**: 新建 `dmn.rs`, 改 `brain.rs`(tick 分流)

---

## P4: 完整波传播扩散激活

**论文基础**:
- **Anderson et al. (2004)** "An integrated theory of the mind" *Psychological Review* — ACT-R 扩散激活
- **Collins & Loftus (1975)** "A spreading-activation theory of semantic processing" *Psychological Review* — 经典语义网络
- **Maslow A.H. (1943)** "A theory of human motivation" — 需求层次（已实现）

### 设计
需求满足后的涟漪效应:
```
饥饿满足 (wave[0] 突降)
    → 安全需求上升 (wave[1] +0.15)
        → 社交需求上升 (wave[2] +0.05)
            → 探索需求上升 (wave[4] +0.1)
```

```rust
impl MaslowWave {
    pub fn propagate_satisfaction(&mut self, satisfied_level: usize) {
        let propagation_map: [(usize, f32); 4] = match satisfied_level {
            0 => [(1, 0.15), (4, 0.05)],  // 吃饱 → 安全↑ + 探索↑
            1 => [(2, 0.10), (4, 0.05)],  // 安全 → 社交↑
            3 => [(4, 0.15)],              // 成就 → 探索↑
            _ => [],
        };
        for (target, boost) in &propagation_map {
            self.state[*target] = (self.state[*target] + boost).min(1.0);
        }
    }
}
```

**测试**: 2 个 — 单向传播、链式传播

**文件**: 改 `wave.rs`, 改 `brain.rs`(action 后调用)

---

## P5: 丘脑皮层环 (Thalamocortical Loop)

**论文基础**:
- **Sherman S.M. (2005)** "Thalamocortical loops" *Nature Reviews Neuroscience* — 丘脑作为皮层信息中继+门控
- **Hwang et al. (2017)** "The human thalamus is a causal hub for cognitive control" *Nature Communications*
- **Saalmann et al. (2012)** "The pulvinar regulates information transmission between cortical areas" *Science*

### 设计
丘脑作为 attention 的物理实现 — 调节哪些信息到达 cognitive:

```rust
pub struct ThalamicGate {                   // 新建 thalamus.rs
    pub relay_gain: HashMap<String, f32>,  // 各通道增益
    pub gating_mode: GateMode,             // Suppress | Passthrough | Amplify
}
```

- Cognitive 通过 attention 控制丘脑增益
- 高 attention 通道的信噪比上升
- 低 attention 通道信息被抑制

**测试**: 2 个 — 门控选择、增益调制

**文件**: 新建 `thalamus.rs`, 改 `attention.rs`(接合), 改 `brain.rs`

---

## P6: 内感预测 (Interoception)

**论文基础**:
- **Seth A.K. (2013)** "Interoceptive inference, emotion, and the embodied self" *Trends in Cognitive Sciences* — 内感预测编码
- **Barrett L.F. (2017)** "The theory of constructed emotion" *Trends in Cognitive Sciences* — 内感+情绪构建
- **Petzschner et al. (2017)** "Computational models of interoception and body regulation" *Nature Reviews Neuroscience*

```rust
pub struct InteroceptiveSystem {            // 新建 interoception.rs
    pub predicted_health: f32,              // 预测未来 health
    pub predicted_hunger: f32,             // 预测未来 hunger
    pub prediction_horizon: usize,         // 前瞻步数 (默认 10)
    pub error: f32,                        // 预测误差
}
```

- 每 tick 预测未来 10 tick 的 health/hunger(基于当前衰减率)
- 预测偏差 → 预防性 reflex (未雨绸缪)
- 与 predictive.rs 集成

**测试**: 2 个 — 预测准确性、偏差驱动行为

**文件**: 新建 `interoception.rs`, 改 `brain.rs`(tick 集成)

---

## 执行依赖图

```
P0 神经调质 ──────────────────────────────────────────────┐
                                                          │
P1 海马体+睡眠 ───────────────┐                           │
                              │                           │
P4 波传播 ────────────────────┤                           │
                              │                           │
P2 基底核门控 ←── P0 的 5-HT │            ┌──────────────┘
                              │            │
P2.5 小脑 ←──── P2          │            │
                              │            │
P3 DMN ←───── P1             │            │
                              ▼            ▼
P5 丘脑皮层环 ←── P2 + P0               brain.rs tick()
                                  重构为 并行+仲裁+调质
                                             │
P6 内感预测 ←── P0 + P5                   输出动作
```

### 建议执行顺序

```
Phase A: 调质 + 波传播 (4 天)
  P0 神经调质系统 ── 独立模块，改动最小
  P4 波传播 ── 改 wave.rs，独立

Phase B: 记忆 (3 天)
  P1 海马体+睡眠 ── 改 memory.rs，依赖少

Phase C: 决策架构重构 (5-6 天)
  P2 基底核门控 ── 核心架构变更，最高价值
  P2.5 小脑 ── 依赖 P2，独立模块

Phase D: 高级认知 (4 天)
  P3 DMN ── 依赖 P1，独立
  P5 丘脑皮层环 ── 依赖 P2
  P6 内感预测 ── 依赖 P0+P5
```

---

## 汇总表

| Phase | 模块 | 论文数 | 新增文件 | 改动文件 | 测试 | Rust 可行性 |
|-------|------|--------|---------|---------|------|-----------|
| A | P0 调质系统 | 3 | `modulator.rs` | 5 | 5 | ✅ 纯数学运算 |
| A | P4 波传播 | 3 | — | `wave.rs`, `brain.rs` | 2 | ✅ 数组操作 |
| B | P1 海马体+巩固 | 4 | — | `memory.rs`, `brain.rs` | 3 | ✅ 图结构操作 |
| C | P2 基底核门控 | 4 | `basal.rs` | `brain.rs`, `types.rs` | 3 | ✅ 漂移扩散模型 |
| C | P2.5 小脑 | 3 | `cerebellum.rs` | `basal.rs` | 2 | ✅ 序列匹配 |
| D | P3 DMN | 3 | `dmn.rs` | `brain.rs` | 2 | ✅ 阈值+检索 |
| D | P5 丘脑皮层环 | 3 | `thalamus.rs` | `attention.rs`, `brain.rs` | 2 | ✅ 增益调制 |
| D | P6 内感预测 | 3 | `interoception.rs` | `brain.rs` | 2 | ✅ 指数预测 |
| **总计** | **8 模块** | **26 篇** | **6 新文件** | **~12 文件** | **21 测试** | **全部可行** |

---

## 验证策略

每 Phase 交付时:
- `cargo test` 全部通过
- 新增测试 ≥ Phase todos 数
- 零编译 warning（调质字段未读除外）
- 不改任何现有 public API 签名

---

## 论文参考完整列表

| # | 作者 | 年份 | 标题 | 应用模块 |
|---|------|------|------|---------|
| 1 | Doya K. | 2002 | Metalearning and neuromodulation | P0 |
| 2 | Dayan P. | 2012 | Twenty-five lessons from computational neuromodulation | P0 |
| 3 | Aston-Jones & Cohen | 2005 | Integrative theory of LC-NE function | P0 |
| 4 | McClelland et al. | 1995 | Complementary learning systems | P1 |
| 5 | Kumaran et al. | 2016 | Computations in the hippocampus | P1 |
| 6 | Tonegawa et al. | 2015 | Memory engram storage and retrieval | P1 |
| 7 | Nadel & Moscovitch | 1997 | Memory consolidation, retrograde amnesia | P1 |
| 8 | Redgrave et al. | 1999 | Basal ganglia: a solution to selection problem | P2 |
| 9 | Frank et al. | 2001 | Interactions between BG and PFC | P2 |
| 10 | O'Reilly & Frank | 2006 | Making working memory work | P2 |
| 11 | Bogacz et al. | 2006 | Physics of optimal decision making | P2 |
| 12 | Ito M. | 2006 | Cerebellar circuitry as a neuronal machine | P2.5 |
| 13 | Doya K. | 2000 | Complementary roles of BG and cerebellum | P2.5 |
| 14 | Raymond & Medina | 2018 | Computational principles of cerebellar learning | P2.5 |
| 15 | Raichle et al. | 2001 | A default mode of brain function | P3 |
| 16 | Buckner et al. | 2008 | The brain's default network | P3 |
| 17 | Smallwood & Schooler | 2015 | The science of mind wandering | P3 |
| 18 | Collins & Loftus | 1975 | Spreading-activation theory | P4 |
| 19 | Anderson et al. | 2004 | An integrated theory of mind (ACT-R) | P4 |
| 20 | Sherman S.M. | 2005 | Thalamocortical loops | P5 |
| 21 | Hwang et al. | 2017 | Human thalamus is a hub for cognitive control | P5 |
| 22 | Saalmann et al. | 2012 | Pulvinar regulates info transmission | P5 |
| 23 | Seth A.K. | 2013 | Interoceptive inference, emotion, embodied self | P6 |
| 24 | Barrett L.F. | 2017 | The theory of constructed emotion | P6 |
| 25 | Petzschner et al. | 2017 | Computational models of interoception | P6 |
| 26 | Maslow A.H. | 1943 | A theory of human motivation | P4 (基线) |
