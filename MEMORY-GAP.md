# 记忆系统对照

## 三篇记忆论文

| 论文 | 内容 | v1 实现 | v2 实现 |
|------|------|---------|---------|
| arXiv 2504.01990 S2.2 | 记忆分类学 + 生命周期 | 完整 | 基本 |
| MemCtrl (arXiv 2601.20831) | micro-gate: RETAIN/UPDATE/DISCARD | micro-gate.ts | 缺失 |
| FadeMem (神经科学) | 自适应衰减(频次/时间/相关性) | decay/*.ts | 缺失 |

## 需要持久化的内容

| 数据 | 论文章节 | v1 | v2 |
|------|---------|----|-----|
| Episodic 记忆 | S2.2.3 | SQLite+decay+merge | JSON |
| Semantic 记忆 | S2.2.3 | SQLite+embedding | JSON |
| Procedural/SOP | S2.2.3 | SQLite+频次 | JSON |
| Working 记忆 | S2.2.1 | SQLite+衰减 | 内存 |
| 偏好/倾向 | S2.4 | reward-system MCP | JSON |
| 信号权重 | S3 | 未实现 | JSON |
| 奖赏历史 | S2.4 | reward-system MCP | 内存 |
| 重要性分数 | S2.2.2 | importance 字段 | 缺失 |
| 访问频率 | S2.2.2 | access_count | 缺失 |
| 记忆衰减 | S2.2.5 | DECAY_LAMBDAS | 缺失 |
| 语义搜索 | S2.2.4 | embedding | 缺失 |
| 记忆合并 | S2.2.2 | similarity merge | 缺失 |
| micro-gate | MemCtrl | RETAIN/UPDATE/DISCARD | 缺失 |

## 关键差距

v2 比 v1 缺 12 项，最关键 3 个：
1. SQLite -- 替代 JSON
2. FadeMem 衰减系统
3. micro-gate 记忆门控
