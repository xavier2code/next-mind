# Phase 5: Control & Verification - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

实现用户控制机制、检查点保存、错误恢复和结果处理策略。这是让用户"掌控"多 Agent 协作的关键层——暂停/恢复工作流、从失败中恢复、展示聚合结果。实时状态展示在 Phase 6 实现。

</domain>

<decisions>
## Implementation Decisions

### Workflow Control (CTRL-01~03)
- **D-01**: 触发方式 — 在 Pipeline 视图旁添加「暂停」「取消」「继续」按钮
- **D-02**: 暂停行为 — 等待当前 Wave 中所有任务完成，不启动下一个 Wave
- **D-03**: 恢复方式 — 用户点击「继续」按钮手动恢复
- **D-04**: 取消粒度 — 取消整个工作流，所有任务终止（与现有 Cascade cancel 一致）
- **D-05**: 决策点 — 无决策点，工作流全自动化执行，敏感操作复用现有审批流程

### Checkpoint & Recovery (CTRL-04~05)
- **D-06**: 保存时机 — 每 Wave 完成后自动保存检查点
- **D-07**: 保存内容 — 最小状态集：
  - 已完成任务的结果 Map (taskId → result)
  - 剩余待执行任务列表
  - 当前 Wave 索引
- **D-08**: 恢复方式 — 用户从工作流列表看到暂停的工作流，点击继续
- **D-09**: 存储位置 — 检查点数据存储在 Workflow 表的 checkpoint JSONB 字段

### Timeout & Error Handling (CTRL-06)
- **D-10**: 超时限制 — 每个子 Agent 任务固定 60 秒超时（与现有 SkillExecutor 默认值一致）
- **D-11**: 超时行为 — 超时任务标记为失败，Cascade cancel 依赖它的任务
- **D-12**: 错误策略 — 继续执行独立任务（与 Phase 4 Cascade cancel 一致）
- **D-13**: 错误记录 — 错误信息存入 Task 表 output 字段的 error 属性

### Result Aggregation (RSLT-01~05)
- **D-14**: 结果展示 — 按任务执行顺序依次展示每个 Agent 的结果，不自动合并
- **D-15**: 对比功能 — 不提供并排对比视图
- **D-16**: 摘要生成 — 不生成额外摘要
- **D-17**: 用户选择 — 不需要用户选择采纳哪个结果
- **D-18**: 来源标注 — 每个结果前显示来源标签（Agent 类型 + Skill ID）

### Claude's Discretion
- 检查点数据结构的具体 JSON schema
- Pipeline 视图按钮的具体 UI 样式和位置
- 来源标签的展示格式（如 `[File Agent] file-processing`）
- 暂停/取消/恢复的 API 端点设计

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § CTRL-01~06 — 控制机制需求
- `.planning/REQUIREMENTS.md` § RSLT-01~05 — 结果处理需求

### 现有代码模式
- `src/lib/agents/scheduler.ts` — WaveScheduler, ScheduledTask, Cascade cancel
- `src/lib/agents/executor.ts` — SubAgentExecutor, executeSubtask timeout
- `src/lib/agents/types.ts` — SubtaskWithDeps, AgentSkillContext
- `src/lib/db/schema.ts` — workflows, tasks 表定义
- `src/lib/db/queries.ts` — Workflow/Task CRUD 操作
- `src/components/workflow/pipeline-view.tsx` — 执行计划可视化组件

### 前阶段上下文
- `.planning/phases/04-smart-orchestration-communication/04-CONTEXT.md` — Wave-based 执行、Cascade cancel、Hub-and-Spoke 通信

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `WaveScheduler` — 已有 ScheduledTask 状态追踪 (pending/running/completed/failed/cancelled)
- `Workflow` 表 — 已有 status 字段，需扩展增加 paused 状态和 checkpoint 字段
- `Task` 表 — 已有 status 和 output 字段，复用存储结果
- `PipelineView` 组件 — 可扩展添加控制按钮

### Established Patterns
- 状态机模式 — pending → running → completed/failed/cancelled
- Cascade cancel — Phase 4 已实现，依赖失败任务的任务自动取消
- 审批流程 — 敏感操作复用现有 onApprovalRequired 回调
- 超时控制 — SkillExecutor 已有 executeWithTimeout 模式

### Integration Points
- `src/lib/agents/scheduler.ts` — 扩展支持 pause/resume/cancel
- `src/lib/db/schema.ts` — 扩展 WorkflowStatusEnum 增加 paused
- `src/lib/db/queries.ts` — 增加 checkpoint 保存/加载函数
- `src/components/workflow/pipeline-view.tsx` — 添加控制按钮
- `src/app/api/workflow-status/route.ts` — 扩展支持控制操作

</code_context>

<specifics>
## Specific Ideas

- 固定 60 秒超时简化实现，与现有默认值一致
- 检查点按 Wave 粒度保存，与执行模型匹配
- 顺序展示结果简单可预测，不需要复杂的 LLM 合并
- 来源标签提供透明度，用户知道结果来自哪个 Agent

</specifics>

<deferred>
## Deferred Ideas

- 用户可配置超时时间 — 未来版本
- 按任务粒度取消（而非整个工作流）— 未来版本
- LLM 智能合并多结果 — 未来版本
- 结果对比视图 — 未来版本
- 自动恢复未完成工作流（系统重启后）— 未来版本

</deferred>

---

*Phase: 05-control-verification*
*Context gathered: 2026-03-26*
