# Phase 4: Smart Orchestration & Communication - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

实现智能调度引擎、Agent 执行器、通信总线和执行计划可视化。这是让多 Agent 真正"协作"的核心层——自动分析依赖、并行执行、Agent 间通信。控制机制、结果聚合、UI 集成在 Phase 5-6 实现。

</domain>

<decisions>
## Implementation Decisions

### 依赖分析与调度策略
- **依赖识别**: LLM 在分解时同时生成依赖关系（如 A→B→C）
- **依赖存储**: 扩展 DecompositionResult 增加 `dependencies: Record<string, string[]>` 字段
- **调度决策**: 系统自动分析依赖图，独立任务并行，有依赖任务顺序执行
- **执行模式**: Wave-based — 同级独立任务同时开始，等待全部完成后进入下一级

### 并行执行控制
- **最大并发数**: 固定上限（3），防止 token 消耗爆炸
- **资源隔离**: 每个 SubAgentExecutor 实例独立执行
- **上下文传递**: 每波次完成后更新 previousResults Map

### Agent 通信机制
- **通信模式**: Hub-and-Spoke — 子 Agent 只与主 Agent 通信，子 Agent 间不直接通信
- **消息类型**:
  - `context_request`: 子 Agent 请求额外上下文
  - `status_notification`: 开始/完成/失败状态变更
  - `human_intervention`: 敏感决策请求用户确认
  - `progress_update`: Agent 向主 Agent 汇报执行进度
- **消息格式**: 标准化 JSON `{ type, from, to, payload, timestamp }`
- **消息存储**: 持久化到数据库（agent_messages 表），用于审计和调试

### 执行计划可视化
- **展示形式**: 简化流水线视图（类似 CI/CD 流水线的步骤列表）
- **状态图标**: 运行中(旋转)、完成(绿色勾)、失败(红色叉)、等待(灰色)
- **展示时机**: 分解完成后显示执行计划，执行中实时更新状态

### 实时状态推送
- **推送机制**: WebSocket 连接推送状态更新
- **推送内容**: 任务状态变更、进度更新、错误事件
- **前端处理**: 状态消息更新 UI，无需轮询

### 错误处理策略
- **失败传播**: Cascade cancel — 依赖失败任务的所有任务取消，其他独立任务可继续
- **错误记录**: 错误信息存入 Task 表 output 字段
- **状态同步**: WebSocket 推送失败事件，前端显示失败原因

### Claude's Discretion
- 依赖图数据结构的具体实现（邻接表 vs 邻接矩阵）
- WebSocket 消息协议的详细格式
- agent_messages 表的索引策略
- 并发池的具体实现（Promise.all vs 自定义调度器）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § ORCH-01~06 — 智能编排需求
- `.planning/REQUIREMENTS.md` § COMM-01~06 — Agent 通信需求

### 现有代码模式
- `src/lib/agents/types.ts` — Subtask, DecompositionResult, AgentSkillContext 类型
- `src/lib/agents/executor.ts` — SubAgentExecutor, executeSubtasks (顺序执行)
- `src/lib/agents/decomposition.ts` — decomposeTask 函数
- `src/lib/skills/orchestration.ts` — SkillOrchestrator 顺序执行模式
- `src/lib/db/queries.ts` — Workflow/Task 数据库操作

### 数据库模式
- `src/lib/db/schema.ts` — agents, tasks, workflows 表定义

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SubAgentExecutor` — 可扩展支持并行执行
- `AgentSkillContext.previousResults` — 已有任务间结果传递机制
- `Workflow/Task` 表 — 状态字段已存在（pending, running, completed, failed）
- `SkillOrchestrator` — 顺序执行模式可参考

### Established Patterns
- 单例模式 — `getSubAgentExecutor()` 单例访问
- 审批回调 — `onApprovalRequired` 回调机制
- 审计日志 — `logAudit()` 记录操作
- 错误处理 — try/catch + 状态更新模式

### Integration Points
- `src/lib/agents/executor.ts` — 扩展 executeSubtasks 支持并行
- `src/lib/agents/decomposition.ts` — 扩展 DecompositionResult 增加依赖字段
- `src/app/api/chat/route.ts` — WebSocket 集成入口
- 前端聊天组件 — 接收状态更新渲染执行计划

</code_context>

<specifics>
## Specific Ideas

- 依赖分析由 LLM 在分解阶段完成，简单可预测
- 固定并发上限（3）平衡性能和资源消耗
- Hub-and-Spoke 通信模式简化协调逻辑
- 简化流水线视图避免过度复杂的 DAG 可视化
- WebSocket 原生支持实时推送，无需轮询

</specifics>

<deferred>
## Deferred Ideas

- 用户可配置最大并发数 — Phase 5 控制机制
- 动态任务分解（执行中生成新子任务）— 未来版本
- 复杂 DAG 可视化编辑器 — Out of Scope
- Agent 间直接通信（全互联模式）— Out of Scope
- 结果聚合策略（合并/对比/总结/选择）— Phase 5

</deferred>

---

*Phase: 04-smart-orchestration-communication*
*Context gathered: 2026-03-25*
