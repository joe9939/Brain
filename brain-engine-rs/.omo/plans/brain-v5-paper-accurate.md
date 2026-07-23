# Brain v5: 论文精确 × LLM 增强 — 完整组件计划

> 目标：每个组件 = 论文核心方程 + LLM 协作 = 极限逼近人脑
> 原则：数学保证速度和确定性，LLM 补足上下文理解和适应性
> 所有 21 组件全部覆盖

---

## 目录

| # | 组件 | 论文 | 数学占比 | LLM占比 |
|---|------|------|---------|---------|
| 1 | **Brain** 全局工作台 | Baars 1997, Dehaene 2011 | 30% | 70% |
| 2 | **Predictive** 预测编码 | Friston 2010, Rao 1999 | 90% | 10% |
| 3 | **Emotion** 情绪 | Barrett 2017, Scherer 2009 | 40% | 60% |
| 4 | **Reward** 奖赏 | Schultz 1997, Sutton 2018 | 85% | 15% |
| 5 | **Hormone** 荷尔蒙 | Sapolsky 2015, Schulkin 2003 | 95% | 5% |
| 6 | **Reflex** 反射 | Sherrington 1906, Prochazka 2000 | 95% | 5% |
| 7 | **Habit** 习惯 | Graybiel 2008, Yin 2006 | 80% | 20% |
| 8 | **Goal** 目标 | Miller 2001, Fishbach 2007 | 60% | 40% |
| 9 | **Attention** 注意力 | Itti 2001, Corbetta 2002 | 75% | 25% |
| P0 | **Neuromodulator** 调质 | Doya 2002, Aston-Jones 2005 | 95% | 5% |
| P1 | **Hippocampus** 海马体 | McClelland 1995, Tonegawa 2015 | 80% | 20% |
| P2 | **Basal Ganglia** 基底核 | Bogacz 2006, Frank 2001 | 85% | 15% |
| P2.5 | **Cerebellum** 小脑 | Ito 2006, Doya 2000 | 90% | 10% |
| P3 | **DMN** 默认模式网 | Buckner 2008, Raichle 2001 | 30% | 70% |
| P4 | **Wave** 波传播 | Anderson 2004 (ACT-R) | 90% | 10% |
| P5 | **Thalamus** 丘脑 | Sherman 2005, Saalmann 2012 | 85% | 15% |
| P6 | **Interoception** 内感 | Seth 2013, Barrett 2017 | 60% | 40% |
| — | **types** 类型系统 | — | 100% | 0% |
| — | **utils** 工具 | — | 100% | 0% |
| — | **test_helpers** 测试 | — | 100% | 0% |
| — | **Modulator** (调质合并到P0) | — | — | — |

---

## 1. Brain — 全局工作台 (Global Workspace)

### 论文
- **Baars B.J. (1997)** "In the theatre of consciousness: Global workspace theory" — 意识 = 全局工作台，竞争内容胜出进入意识
- **Dehaene & Changeux (2011)** "Global neuronal workspace" — 有意识处理 = 全局可用性，无意识 = 局部模块自治

### 当前实现 ❌
```rust
// brain.rs: 串行管线，各组件独立运行
self.update_internal_state(snapshot);
let reflex = self.reflexes.check(...);
let surprise = self.predictor.observe(snapshot);
// ...
```

### 论文模型 + LLM 增强 ✅

```
人脑真实机制:
  无意识层: 所有模块并行计算 (reflex, predictive, emotion...)
  全局工作台: 竞争获胜者的内容广播到所有模块
  有意识层: cognitive (LLM) 是全局工作台的内容

架构:
  无意识并行 ──→ 信号竞争 ──→ 胜者进入全局工作台 ──→ cognitive LLM
      ↑                                                    │
      └──────────── 全局广播 (所有模块收到当前焦点) ───────────┘
```

```rust
pub struct GlobalWorkspace {
    /// 当前广播内容（cognitive 的输出 = 意识内容）
    pub broadcast: WorkspaceContent,
    /// 所有竞争者的最新输出
    pub competitors: Vec<Signal>,
    /// 当前工作台的"亮度" = 注意强度
    pub illumination: f32,
}

pub struct WorkspaceContent {
    pub focus: String,          // 当前意识焦点
    pub context: String,        // 全局上下文
    pub goal: String,           // 当前目标
    pub body_state: String,     // 身体状态
}
```

### LLM 角色
```
LLM 不是"做决策"——LLM 是"意识内容"。
cognitive 层的 prompt 就是全局工作台的内容广播。
所有其他组件的输出 → 进入工作台 → LLM 消费。
LLM 的输出 → 写回工作台 → 广播到所有组件。
```

---

## 2. Predictive — 预测编码

### 论文
- **Friston K. (2010)** "The free-energy principle" *Nature Reviews Neuroscience* — 大脑 = 自由能最小化器，预测误差驱动所有学习
- **Rao & Ballard (1999)** "Predictive coding in the visual cortex" — 层级预测编码: 每层预测下层、误差向上传播
- **Clark A. (2013)** "Whatever next? Predictive brains" — 预测大脑 = 主动推理

### 论文模型 ✅

```rust
/// 层级预测编码
pub struct HierarchicalPredictor {
    pub layers: Vec<PredictionLayer>,
    pub prediction_errors: Vec<f32>,
    pub precision: Vec<f32>,         // 每层的置信度（由 ACh 调制）
}

pub struct PredictionLayer {
    pub expected: f32,               // 顶层生成的预测
    pub actual: f32,                 // 下层传入的实际
    pub error: f32,                  // prediction error
    /// 精度加权预测误差 (precision-weighted prediction error)
    pub precision_weighted_error: f32,
}

impl HierarchicalPredictor {
    /// 前向: 上层生成预测 → 下层
    fn forward_predict(&mut self) {
        for i in (0..self.layers.len()-1).rev() {
            // 上层预测 = W_i * lower_expected + bias
            self.layers[i].expected = self.compute_prediction(i);
        }
    }

    /// 反向: 下层报告误差 → 上层更新
    fn backward_error(&mut self) {
        for i in 0..self.layers.len()-1 {
            // ε_i = (actual - expected) * precision_i
            self.layers[i].error = self.layers[i].actual - self.layers[i].expected;
            self.layers[i].precision_weighted_error = self.layers[i].error * self.precision[i];
        }
    }
}
```

### LLM 角色
```
LLM 不能替代预测编码（预测编码需要毫秒级更新）。
但 LLM 可以做"元预测": 
  "从过往 100 tick 的模式看，这个环境是周期性危险的"
  → 输出到全局工作台 → predictive layer 调整 baseline
```

---

## 3. Emotion — 情绪构建

### 论文
- **Barrett L.F. (2017)** "The theory of constructed emotion" *Trends in Cognitive Sciences* — 情绪不是硬连线回路，是**核心情感 + 概念 + 内感预测的构建**
- **Scherer K.R. (2009)** "The component process model" *Cognition & Emotion* — 情绪 = 多组件同步：认知评估+生理+表情+行动倾向+感受
- **Smith & Ellsworth (1985)** "Appraisal theory" — 情绪由 6 个评估维度决定：愉悦/确定性/努力/注意/可控性/目标一致性

### 当前实现 ❌
```rust
// 纯正则匹配文本
fn detectUrgency(text: &str) -> bool {
    patterns = [/urgent|紧急|立刻/i]
}
```

### 论文模型 + LLM ✅

```rust
/// Barrett 2017: 情绪构建 = 核心情感 + 概念 + 内感
pub struct ConstructedEmotion {
    /// 核心情感 (Core Affect): valence + arousal
    pub core_affect: (f32, f32),
    /// 概念 (concept): 当前情绪类别的概率向量
    pub concepts: Vec<(String, f32)>,
    /// 评估维度 (appraisal): 6 维
    pub appraisals: AppraisalDimensions,
}

pub struct AppraisalDimensions {
    pub pleasantness: f32,     // -1 到 1
    pub certainty: f32,        // 0-1
    pub effort: f32,           // 0-1
    pub attention: f32,        // 0-1
    pub control: f32,          // 0-1 (self/other)
    pub goal_consistency: f32, // -1 到 1
}
```

### emotion 的更新流
```
每 tick 数学层:
  interoception → core_affect.valence ↑/↓
  predictive.error → core_affect.arousal ↑
  hormone → 调质 core_affect
  reflexive action → appraisal.dimensions 更新

每 cognitive 调用时 LLM 层:
  cognitive prompt 中包含当前 appraisal + core_affect
  但更重要的是:
  LLM 输出时附带的 emotion_label: "frustrated_by_failure" 
  → 这作为"概念"(concept) 写入 ConstructedEmotion
  → Barrett 的核心: 情绪类别不是检测出来的, 是构建出来的

所以要 LLM 做"概念构建"而非"情绪检测":
  数学层: core_affect = interoception + hormone + surprise
  LLM 层: 在 prompt 末尾问 "你现在的情绪状态?_" → 构建出情绪类别
  两者结合: core_affect + concept = 完整 Barrett 情绪
```

### LLM 角色
```
数学层: 核心情感 (core affect) = 内感 + 激素 + surprise
LLM 层: 概念构建 (concept construction) — 把 core affect 翻译成情绪类别
  例: core_affect=(valence=-0.4, arousal=0.7) + LLM说"我感到焦虑因为附近有僵尸"
  = 构建出"焦虑"情绪
```

---

## 4. Reward — 奖赏系统

### 论文
- **Schultz W. et al. (1997)** "A neural substrate of prediction and reward" *Science* — 多巴胺神经元编码 **TD 误差** δ(t) = r(t) - V(s(t))
- **Sutton & Barto (2018)** *Reinforcement Learning: An Introduction* — TD(λ), eligibility traces
- **O'Doherty et al. (2004)** "Dissociable roles of ventral and dorsal striatum" — 腹侧=预测, 背侧=行动-值

### 当前实现
```rust
let ext_reward = if success { 1.0 + extrinsic } else { -0.5 + extrinsic };
let total_reward = ext_reward + int_reward;
state.score = (state.score + total_reward * 0.1).clamp(-10.0, 10.0);
state.td_error = state.score - old_score;
```

### 论文重写 ✅

```rust
impl RewardSystem {
    /// TD(0) 更新: δ(t) = r(t) + γ·V(s(t+1)) - V(s(t))
    fn td_update(&mut self, reward: f32, next_value: f32) {
        let gamma = self.modulator.gamma;  // 来自 5-HT
        let td_error = reward + gamma * next_value - self.value;
        self.value += self.alpha * td_error;  // α 来自 ACh
        self.td_error = td_error;
        self.dopamine_signal = td_error;  // DA = TD error (Doya 2002)
    }

    /// TD(λ) 资格迹: 解决延迟奖励分配
    fn td_lambda_update(&mut self, reward: f32, next_value: f32) {
        let delta = reward + self.gamma * next_value - self.value;
        self.eligibility_trace *= self.gamma * self.lambda_;
        self.eligibility_trace += 1.0;
        self.value += self.alpha * delta * self.eligibility_trace;
    }
}
```

### LLM 角色
```
数学层: TD error 计算（毫秒级，精确）
LLM 层: 抽象奖赏分配 
  "这次对话解决了用户的问题 → 这是高价值交互"
  → 输出抽象奖赏 r=0.8 → 注入数学层的 TD 计算
```

---

## 5. Hormone — 荷尔蒙系统

### 论文
- **Sapolsky R. (2015)** "Stress and the brain: individual variability and the inverted-U" *Nature Neuroscience*
- **Schulkin J. (2003)** "Hormones and the brain: allostasis, hormones, and behavior" — 稳态应变 (allostasis) 而非稳态 (homeostasis)
- **McEwen B. (2007)** "Physiology and neurobiology of stress and adaptation" — 慢性应激→皮质醇持续高→脑损伤

### 当前实现
```rust
pub struct HormoneState {
    pub adrenaline: f32, pub cortisol: f32, pub endorphin: f32,
    pub dopamine: f32, pub serotonin: f32, pub oxytocin: f32,
}
```
这个结构还行，但需要 allostatic 负荷模型：

### 论文增强 ✅

```rust
pub struct AllostaticHormoneSystem {
    // 当前水平
    pub adrenaline: f32, pub cortisol: f32, pub endorphin: f32,
    pub dopamine: f32, pub serotonin: f32, pub oxytocin: f32,
    // 稳态应变负荷 (allostatic load) — 慢性压力累积
    pub allostatic_load: f32,
    // 基线 — 可漂移 (正常: 0, 慢性应激: 上升)
    pub cortisol_baseline: f32,
    // 反调节: 长期高 → 受体下调 → 效应减弱
    pub receptor_sensitivity: f32,
}

impl AllostaticHormoneSystem {
    fn tick_allostasis(&mut self) {
        // 基线漂移: 长期高压 → cortisol baseline 上升
        let cortisol_avg = self.cortisol_history.mean();
        self.cortisol_baseline += (cortisol_avg - self.cortisol_baseline) * 0.001;

        // 全部负荷累积: 当过基线太多
        if self.cortisol > self.cortisol_baseline * 1.5 {
            self.allostatic_load += 0.01;
        } else {
            self.allostatic_load *= 0.995; // 缓慢恢复
        }

        // 受体敏感性下降 (慢性应激 → 迟钝)
        self.receptor_sensitivity = 1.0 / (1.0 + self.allostatic_load * 0.5);
    }
}
```

### LLM 角色
```
不需要。荷尔蒙是底层生理，数学层就能精确建模。
唯一 LLM 可用的点：识别"长期高压模式"
  例：过去 100 tick 皮质醇 > 0.6 占 80%
  → 认知层知道"我最近太紧张了"，可主动调整行为
```

---

## 6. Reflex — 反射弧

### 论文
- **Sherrington C.S. (1906)** *The integrative action of the nervous system* — 经典反射弧：感受器→传入神经→脊髓→传出神经→效应器
- **Prochazka et al. (2000)** "What do reflex and voluntary mean?" — 反射不纯是硬连线，受高级中枢调质
- **Brown T.G. (1911)** "The intrinsic factors in the act of progression" — 脊髓有中枢模式产生器 (CPG)

### 论文模型 ✅

```rust
pub struct ReflexArc {
    pub reflexes: Vec<Reflex>,
    /// 突触前抑制 (presynaptic inhibition) — 下行通路的调质
    pub presynaptic_inhibition: f32,
    /// 中枢模式产生器 (CPG) — 节律性运动
    pub cpg_active: bool,
    /// 同侧/对侧反射 — 交叉伸肌反射
    pub crossed_extension: bool,
}

/// 脊髓反射通路
pub enum ReflexPathway {
    /// 单突触 (Ia) — 膝跳反射
    Monosynaptic { latency_ms: f32 },
    /// 多突触屈曲反射 — 缩手
    PolysynapticFlexion,
    /// 交叉伸肌 — 一条腿屈 → 另一条伸
    CrossedExtension,
}
```

### 当前 vs 论文
```
当前:      3 条硬编码 + cognitive_suppress flag
论文需要:  脊髓层级、突触前抑制、CPG、交叉反射
```

### LLM 角色
```
几乎不需要。反射是脊髓级的，毫秒级。
唯一 LLM 可用: "学习新反射"
  例: 用户说"看到僵尸不要跑，打我"
  → LLM 在 cognitive 层学习这个新策略
  → 生成新的 reflex 条目写入 ReflexRegistry
  = 伏隔核→运动皮层的长期增强
```

---

## 7. Habit — 习惯系统

### 论文
- **Graybiel A. (2008)** "Habits, rituals, and the evaluative brain" *Annual Review of Neuroscience* — 习惯 = 行动序列在基底核的 chunking
- **Yin & Knowlton (2006)** "The role of the basal ganglia in habit formation" *Nature Reviews Neuroscience* — 背侧纹状体介导向性-习惯转化
- **Daw et al. (2005)** "Uncertainty-based competition between prefrontal and dorsolateral striatal systems" — 目标导向→习惯的竞争模型

### 论文模型 ✅

```rust
pub struct HabitSystem {
    /// 行动块 (chunk) 库
    pub chunks: Vec<ActionChunk>,
    /// 当前控制系统: 目标导向 vs 习惯
    pub control_mode: ControlMode,
    /// 不确定性 — 高→目标导向, 低→习惯
    pub uncertainty: f32,
}

pub enum ControlMode {
    /// PFC 控制: 慢、灵活、目标导向
    GoalDirected,
    /// 背侧纹状体控制: 快、固定、习惯
    Habitual,
}

impl HabitSystem {
    /// Daw 2005 竞争模型:
    /// 当不确定性低时 → 习惯系统接管
    /// 当 reward 意外变化时 → 目标导向系统重新夺回
    fn update_control_mode(&mut self, reward_surprise: f32) {
        if reward_surprise > 0.3 {
            self.control_mode = ControlMode::GoalDirected;
            self.uncertainty = 0.8;
        } else {
            self.uncertainty *= 0.99;
            if self.uncertainty < 0.1 {
                self.control_mode = ControlMode::Habitual;
            }
        }
    }

    /// Graybiel 2008: chunking — 将动作序列打包
    fn chunk_actions(&mut self, sequence: &[String]) -> ActionChunk {
        // 频繁一起出现的动作 → 打包为 chunk
        // chunk 触发后自动执行完整个序列
    }
}
```

### LLM 角色
```
数学层: chunking + 不确定性计算（快速）
LLM 层: 习惯形成的情节记忆
  "我上一次遇到这种情况是 50 tick前，当时的动作序列是: X→Y→Z"
  → 生成新 chunk 写入 habit system
  → chunk = 由 LLM 生成的习惯模板, 数学层负责执行
```

---

## 8. Goal — 目标系统

### 论文
- **Miller & Cohen (2001)** "An integrative theory of prefrontal cortex function" *Annual Review of Neuroscience* — PFC = 规则+目标的维护, 根据上下文选择行为
- **Fishbach & Ferguson (2007)** "The goal construct in social psychology" — 目标层级: 抽象→具体, 潜意识激活
- **Botvinick et al. (2009)** "Hierarchical models of behavior" *Cognitive Science* — 层级强化学习: 子目标分解

### 论文模型 + LLM ✅

```rust
pub struct GoalHierarchy {
    /// 当前最高层目标 (PFC 维持)
    pub active: GoalNode,
    /// 目标级联: 高层目标 → 子目标 → 行动
    pub cascade: Vec<GoalNode>,
}

pub struct GoalNode {
    pub id: String,
    pub description: String,
    pub level: GoalLevel,      // Abstract → Concrete
    pub status: GoalStatus,
    pub subgoals: Vec<GoalNode>,
    /// 目标可及性 (goal gradient effect)
    pub proximity: f32,
}

impl GoalHierarchy {
    /// Botvinick 2009: 层级分解
    fn decompose(&mut self, abstract_goal: &str) -> Vec<Vec<String>> {
        // 高层目标 → 递归分解为子目标
        // 直到子目标可直接映射到动作
    }
}
```

### LLM 角色
```
数学层不能做目标分解——这需要语言理解和规划。
LLM 层做: 目标分解 (Botvinick 2009 的层级RL)
  "找到钻石" → LLM 分解: 造镐→挖矿→找钻石矿道→挖掘
  子目标写入 GoalNode → 数学层追踪进度
  
数学层做: 梯度效应 (proximity)、完成检测
LLM 层做: 目标生成、分解、重新规划
```

---

## 9. Attention — 注意力

### 论文
- **Itti & Koch (2001)** "Computational modelling of visual attention" *Nature Reviews Neuroscience* — 显著性图 (saliency map)：自下而上注意
- **Corbetta & Shulman (2002)** "Control of goal-directed and stimulus-driven attention in the brain" *Nature Reviews Neuroscience* — 双系统：背侧(目标驱动) + 腹侧(刺激驱动)
- **Desimone & Duncan (1995)** "Neural mechanisms of selective visual attention" *Annual Review of Neuroscience* — 偏置竞争 (biased competition)

### 论文模型 + LLM ✅

```rust
pub struct AttentionSystem {
    /// 自下而上显著性图 (Itti & Koch)
    pub saliency_map: HashMap<String, f32>,
    /// 自上而下偏置 (Desimone & Duncan)
    pub top_down_bias: HashMap<String, f32>,
    /// 当前焦点
    pub focus: String,
    pub intensity: f32,
}

impl AttentionSystem {
    /// Itti & Koch 显著性: surprise + novelty + threat
    fn compute_saliency(&self, surprise: f32, threat: u32) -> HashMap<String, f32> {
        // 自下而上: 环境中的显著事件
    }

    /// Desimone & Duncan 偏置竞争
    fn biased_competition(&self, bottom_up: &HashMap<String, f32>) -> String {
        // 每个候选 = bottom_up * (1 + top_down_bias)
        // 竞争胜出者 = 注意力焦点
    }
}
```

### LLM 角色
```
数学层: 显著性计算 + 偏置竞争（毫秒级）
LLM 层: 自上而下偏置的语义生成
  "我在找钻石" → LLM 生成偏置: {"green_pixels": 0.8, "cavern": 0.6}
  → 写入 attention.top_down_bias
  → 数学层的偏置竞争使用这些偏置
  
结果: LLM 不控制注意本身，但提供"注意的语义方向"
```

---

## 完整实现顺序

```
Phase 1: 独立数学重写（不改 brain.rs）
  P0 调质: Doya 2002 TD 元学习           ← 2天
  P2 基底核: Bogacz 2006 真·漂移扩散      ← 2天
  P4 波: ACT-R 扩散激活                  ← 1天
  Hormone: Allostatic 负荷模型            ← 1天
  Reflex: 脊髓反射层级                    ← 1天

Phase 2: 记忆+预测（memory/predictive）
  P1 海马体: McClelland CLS 模式分离      ← 2天
  Predictive: Friston 层级预测编码        ← 2天
  Reward: TD(λ) 资格迹                    ← 1天
  Habit: Daw 2005 竞争模型 + chunking     ← 1天
  P2.5 小脑: Ito LTD 权值学习            ← 1天

Phase 3: 高级认知（emotion/goal/attention）
  Emotion: Barrett 构建理论               ← 2天
  Goal: Botvinick 层级分解                ← 1天
  Attention: Itti 显著性 + 偏置竞争       ← 1天
  P6 内感: Seth 预测编码                  ← 1天
  P3 DMN: Buckner 反事实                   ← 1天

Phase 4: 整合（brain + cognitive）
  P5 丘脑: Sherman 双模式门控             ← 1天
  Brain: Baars 全局工作台                  ← 2天
  Cognitive: LLM 工具+信号总线+全局广播   ← 2天

总计: ~23天
```

---

## 验证指标

| 组件 | 通过标准 | 定量目标 |
|------|---------|---------|
| Reward | TD error = δ(t) | δ(t) 随 reward 精确更新 |
| Predictive | 层级误差传播 | 上层误差 < 下层误差×0.5 |
| Habit | 目标导向→习惯切换 | 100 tick 后 uncertainty < 0.1 |
| Emotion | core_affect + concept | LLM 构建的 concept 匹配 core_affect |
| Attention | 偏置竞争 | 焦点通道 gain > 非焦点 ×2 |
| Goal | 层级分解 | LLM 分解→数学追踪→目标完成率 |
| All | cargo test | 当前 92 → 目标 150+ |
