# Brain v6: 全脑广播架构 (Global Workspace + Closed Loops)

> 目标：从树状信息流 → 全连接递归网络
> 核心：ComponentBus 作为唯一通信协议，所有组件只读/写总线
> 认知层(LLM)的输出也是写总线 = 人脑"意识广播"

---

## 一、问题诊断

### 当前架构：树状

```
tick():
  update_internal_state()
    ├── wave.tick()
    ├── hormone.tick(emotion, reward)
    ├── emotion.detect_from_environment()
    ├── emotion.update(hormone)
    ├── attention.update(surprise, wave)
    ├── modulator.on_surprise(surprise)
    └── memory.add_episodic(...)
  
  proposals收集
    ├── reflex.check(hormone, serotonin)
    ├── predictor.observe()
    ├── habit.match_habit()
    ├── wave_to_action()
    └── cognitive
        └── cog.inner.prompt()
  
  arbiter.select(proposals, urgency, serotonin)
  
  # 没有广播回路 ← 核心缺失
```

### 大脑真实架构：递归网络

```
每层都接收所有输入，输出广播给所有层。

例如杏仁核(emotion):
  输入: 丘脑(感觉) + 海马体(情景) + 内感(身体) + PFC(认知) + 脑干(调质)
  输出 → 基底核 + 下丘脑 + PFC + 脑干

没有"主控",没有"管线层级",只有平行递归。
```

---

## 二、ComponentBus 全广播设计

```rust
/// 每 tick 重建的全局快照
pub struct ComponentBus {
    // === 感觉输入 ===
    pub world: WorldDescriptor,
    
    // === P0 调质 (Doya 2002) ===
    pub gamma: f32,        // 折扣因子 (5-HT)
    pub beta: f32,         // 逆温度 (NE)
    pub alpha: f32,        // 学习率 (ACh)
    pub td_error: f32,     // TD 误差 (DA)
    pub serotonin_raw: f32,
    pub ne_raw: f32,
    pub ach_raw: f32,
    
    // === P1 海马体 (McClelland 1995) ===
    pub hippocampal_recall: Vec<String>,
    pub consolidation_pending: u32,
    pub recent_episodic: Vec<String>,
    
    // === P2 基底核 (Bogacz 2006) ===
    pub arbiter_selected: Option<String>,
    pub arbiter_rejected: Vec<String>,
    pub ddm_evidence: f32,
    
    // === P2.5 小脑 (Ito 2006) ===
    pub cerebellum_prediction: Option<String>,
    
    // === P3 DMN (Buckner 2008) ===
    pub dmn_active: bool,
    pub dmn_counterfactual: Option<String>,
    
    // === P4 波 (ACT-R) ===
    pub wave_state: [f32; 5],
    pub dominant_need: Option<(usize, f32)>,
    pub wave_propagation: String,
    
    // === P5 丘脑 (Sherman 2005) ===
    pub thalamic_gain: HashMap<String, f32>,
    
    // === P6 内感 (Seth 2013) ===
    pub predicted_health: f32,
    pub predicted_hunger: f32,
    pub interoceptive_alert: bool,
    
    // === Emotion (Barrett 2017) ===
    pub emo_mode: EmotionMode,
    pub emo_valence: f32,
    pub emo_arousal: f32,
    pub emo_intensity: f32,
    pub emo_constructed_label: String,
    pub emo_appraisal: AppraisalDimensions,
    
    // === Hormone (Sapolsky 2015) ===
    pub adrenaline: f32,
    pub cortisol: f32,
    pub dopamine: f32,
    pub serotonin: f32,
    pub allostatic_load: f32,
    
    // === Attention (Itti 2001) ===
    pub attention_focus: String,
    pub attention_intensity: f32,
    pub saliency_map: HashMap<String, f32>,
    
    // === Reflex (Sherrington 1906) ===
    pub reflex_fired: Option<String>,
    pub cognitive_suppress: bool,
    
    // === Predictive (Friston 2010) ===
    pub surprise: f32,
    pub prediction_error: f32,
    
    // === Habit (Daw 2005) ===
    pub control_mode: String,
    pub uncertainty: f32,
    
    // === Goal (Botvinick 2009) ===
    pub active_goals: Vec<String>,
    pub completed_goals: u32,
    
    // === Reward (Schultz 1997) ===
    pub reward_score: f32,
    pub reward_td: f32,
    pub reward_value: f32,
    
    // === 7 信号竞争 ===
    pub signals: SignalBus,
    
    // === Cognitive 层输出 (全局广播) ===
    pub cognitive_action: Option<String>,
    pub cognitive_confidence: f32,
    pub cognitive_emotion_label: String,
    pub cognitive_insight: String,
    pub cognitive_reason: String,
}
```

---

## 三、递归 tick 架构

```rust
// brain.rs 核心 tick 改为"多轮收敛"而非"单轮串行"

pub async fn tick(&mut self, snapshot: &WorldSnapshot) -> TickResult {
    let start = utils::now();
    self.turn_count += 1;
    
    // ── Phase 0: 构建总线 (从外部输入) ──
    self.bus.world = WorldDescriptor::from(snapshot);
    
    // ── Phase 1: 无意识并行 (3-5轮收敛) ──
    for iteration in 0..CONVERGENCE_ITERATIONS {
        // 每轮所有组件从总线读输入、写输出到总线
        // 多轮后总线状态收敛
        
        // P6 内感: 从总线读 body 状态 → 写预测
        self.interoception.tick(&mut self.bus);
        
        // P0 调质: 从总线读 success/failure → 写 γ/β/α
        self.modulator.tick(&mut self.bus);
        
        // Hormone: 从总线读 emotion → 写激素
        self.hormone.tick(&mut self.bus);
        
        // P4 波: 从总线读 needs → 写扩散
        self.wave.tick(&mut self.bus);
        
        // Predictive: 从总线读 world → 写 surprise
        self.predictor.tick(&mut self.bus);
        
        // Reflex: 从总线读 world+hormone → 写 reflex_fired
        self.reflexes.tick(&mut self.bus);
        
        // Emotion: 从总线读 hormone+interoception → 写 emo
        self.emotion.tick(&mut self.bus);
        
        // Attention: 从总线读 surprise+wave → 写 focus
        self.attention_engine.tick(&mut self.bus);
        
        // Habit: 从总线读 state → 写 control_mode
        self.habits.tick(&mut self.bus);
        
        // P5 丘脑: 从总线读 attention → 写 gain
        self.thalamus.tick(&mut self.bus);
        
        // P1 海马体: 从总线读 → 写 recall
        self.memory.tick(&mut self.bus);
        
        // P3 DMN: 从总线读 → 写 counterfactual
        self.dmn.tick(&mut self.bus);
        
        // P2 基底核: 从总线读所有 proposals → 写 selected
        self.arbiter.tick(&mut self.bus);
        
        // P2.5 小脑: 从总线读 action history → 写 prediction
        self.cerebellum.tick(&mut self.bus);
        
        // Goal: 从总线读 cognitive → 写 goal updates
        self.goals.tick(&mut self.bus);
        
        // Reward: 从总线读 outcome → 写 td_error
        self.reward.tick(&mut self.bus);
    }
    
    // ── Phase 2: 认知层 (每 10 tick) ──
    if self.turn_count % 10 == 0 && self.config.has_llm() {
        // 从总线构建 LLM prompt
        let prompt = self.build_llm_prompt_from_bus();
        
        // LLM 推理 (带工具)
        let response = self.run_llm_with_tools(&prompt).await;
        
        // ← 关键: LLM 输出写回总线
        self.bus.cognitive_action = Some(response.action);
        self.bus.cognitive_confidence = response.confidence;
        self.bus.cognitive_emotion_label = response.emotion;
        self.bus.cognitive_insight = response.insight;
        self.bus.cognitive_reason = response.reason;
        
        // ← 再跑一轮无意识收敛,让其他组件响应认知广播
        for iteration in 0..POST_COGNITIVE_ITERATIONS {
            self.emotion.tick(&mut self.bus);  // 情绪响应认知
            self.modulator.tick(&mut self.bus); // 调质响应认知
            self.memory.tick(&mut self.bus);    // 记忆编码认知决策
            self.wave.tick(&mut self.bus);      // 波传播认知影响
            self.attention_engine.tick(&mut self.bus); // 注意力响应认知
            self.interoception.tick(&mut self.bus);    // 内感响应认知
            self.dmn.tick(&mut self.bus);              // DMN 响应认知
        }
    }
    
    // ── Phase 3: 输出 ──
    // 从总线读最终基底核选择
    if let Some(selected) = &self.bus.arbiter_selected {
        // ...
    }
}
```

---

## 四、每个组件的接口统一

```rust
/// 所有组件的统一接口
pub trait BrainComponent {
    /// 从总线读输入，写输出到总线
    fn tick(&self, bus: &mut ComponentBus);
}
```

### 示例：Emotion 改为总线模式

```rust
// 当前:
impl EmotionEngine {
    pub fn update(&self, state: &mut EmotionState, _input: &str, hormone: &HormoneState) {
        state.valence = state.valence * 0.90 + (...) * 0.10;
        state.arousal = state.arousal * 0.90 + hormone.adrenaline * 0.10;
    }
}

// v6 总线模式:
impl EmotionEngine {
    pub fn tick(&self, bus: &mut ComponentBus) {
        // 读总线
        let cortisol = bus.cortisol;
        let dopamine = bus.dopamine;
        let adrenaline = bus.adrenaline;
        let cognitive_label = &bus.cognitive_emotion_label; // ← LLM 建的标签
        
        // 计算 (数学不变,但输入更多元)
        bus.emo_valence = bus.emo_valence * 0.90 
            + (-cortisol * 0.3 + (dopamine - 0.5) * 0.4) * 0.10;
        bus.emo_arousal = bus.emo_arousal * 0.90 + adrenaline * 0.10;
        
        // ← 认知标签覆盖数学模式 (Barrett 核心)
        if !cognitive_label.is_empty() {
            bus.emo_constructed_label = cognitive_label.clone();
            // 标签影响 mode
            if cognitive_label.contains("fear") || cognitive_label.contains("anxious") {
                bus.emo_mode = EmotionMode::Caution;
            }
        }
    }
}
```

### 示例：Hormone 改为总线模式

```rust
impl HormoneSystem {
    pub fn tick(&self, bus: &mut ComponentBus) {
        let cognitive_action = &bus.cognitive_action;
        
        // 标准衰减
        bus.adrenaline *= 0.90;
        bus.cortisol *= 0.95;
        
        // ← 认知层影响激素!
        if let Some(action) = cognitive_action {
            if action == "flee" || action == "attack" {
                bus.adrenaline = (bus.adrenaline + 0.3).min(1.0);
            }
        }
        
        // ← 认知压力评估影响皮质醇
        if bus.cognitive_insight.contains("danger") || bus.cognitive_insight.contains("threat") {
            bus.cortisol = (bus.cortisol + 0.05).min(1.0);
        }
    }
}
```

---

## 五、认知层(LLM)的工具也改读总线

```rust
// 当前: 每个工具从具体组件读数据
fn execute_tool(&self, tool_name, args) {
    match tool_name {
        "recall_memory" => self.memory.retrieve(...),
        "get_wave_status" => self.wave.state,
    }
}

// v6: 所有工具从总线读 (更简单、更统一)
fn execute_tool(&self, tool_name, args) -> String {
    match tool_name {
        "recall_memory" => self.bus.hippocampal_recall.join("\n"),
        "get_wave_status" => format!("{:?}", self.bus.wave_state),
        "get_emotion_state" => format!("mode={:?}, valence={}", self.bus.emo_mode, self.bus.emo_valence),
        // ...全部从 bus 读
    }
}
```

---

## 六、收敛机制说明

大脑不是"串行执行完所有组件就结束"——大脑是**递归的**。

多轮收敛模拟这个：

```
第1轮: 粗略估计所有状态
第2轮: 各组件看到彼此的粗略输出 → 精调
第3轮: 进一步收敛 → 稳定
认知层介入 → 广播 → 再收敛2轮 → 稳定
```

在 Rust 里这个很快——3轮纯数学运算 < 0.01ms。但信息完整性大幅提升。

---

## 七、实现步骤

| 步 | 内容 | 天数 |
|----|------|------|
| 1 | 定义完整 ComponentBus + WorldDescriptor | 1 |
| 2 | 重写所有组件为 `tick(&self, bus: &mut ComponentBus)` 统一接口 | 2 |
| 3 | 实现多轮收敛 tick 循环 | 1 |
| 4 | 认知层输出 → 广播 → 后收敛 | 1 |
| 5 | 测试 + 调参 | 1 |
| **总计** | | **6天** |

---

## 八、验证标准

```
测试                               目标
────────────────────────────────────────
cognitive 广播后,emotion 标签变化       ✅ 验证双向回路
cognitive 广播后,waves 调整             ✅ 验证需求影响
cognitive 广播后,memory 新增条目        ✅ 验证记忆编码
cognitive 广播后,hormone 响应           ✅ 验证激素调制
多轮收敛后,总线状态稳定                  ✅ 验证收敛
全测试通过                             ✅ 89→95
```
