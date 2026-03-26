# Phase 6: Visibility & Polish - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

实现实时过程展示、Agent 状态追踪和 UI 集成优化。这是多 Agent 协作的用户感知层——让用户清晰看到协作进度、Agent 状态和执行日志。控制机制已在 Phase 5 完成。

</domain>

<decisions>
## Implementation Decisions

### 聊天 UI 集成 (VIS-05)
- **D-01**: 集成位置 — Agent 状态面板嵌入在用户消息下方，与任务请求关联
- **D-02**: 视觉层次 — 默认折叠显示状态徽章和进度，用户可展开查看详情
- **D-03**: 消息关联 — 每个工作流与触发它的用户消息绑定

### 错误状态处理 (VIS-02)
- **D-04**: 任务失败行为 — 自动展开失败任务的日志区域，让用户立即看到错误信息
- **D-05**: 工作流失败样式 — 整个面板显示红色边框和"工作流失败"标题，失败任务高亮
- **D-06**: 错误日志格式 — 红色文字 + XCircle 图标

### 日志持久化 (VIS-04)
- **D-07**: 存储策略 — 日志持久化到 agent_messages 表
- **D-08**: 历史查看 — 用户可在历史消息中展开查看已执行工作流的日志
- **D-09**: 日志粒度 — 记录 Agent 生命周期事件（启动、调用技能、完成、失败）

### 实时状态展示 (VIS-01, VIS-03)
- **D-10**: 进度指示器 — 显示 "{completed}/{total} tasks completed ({percentage}%)"
- **D-11**: 状态徽章 — Running(蓝)、Completed(绿)、Failed(红)、Pending(灰)
- **D-12**: 进度条样式 — 高度 8px，圆角，带过渡动画

### Claude's Discretion
- 日志条目的具体 JSON schema
- 面板展开/折叠的动画效果
- 移动端响应式布局适配
- 日志滚动区域的虚拟化（大量日志时）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § VIS-01~05 — 过程可见性需求
- `.planning/REQUIREMENTS.md` § INTG-05 — 与现有对话 UI 无缝集成

### UI 设计契约
- `.planning/phases/06-visibility-polish/06-UI-SPEC.md` — 完整 UI 设计规范（设计系统、排版、颜色、交互模式、组件清单）

### 现有代码模式
- `src/components/workflow/pipeline-view.tsx` — 执行计划可视化组件，SSE 集成
- `src/components/workflow/task-status-icon.tsx` — 状态图标组件
- `src/components/workflow/workflow-controls.tsx` — 控制按钮组件
- `src/components/workflow/workflow-status-badge.tsx` — 状态徽章组件
- `src/app/api/workflow-status/route.ts` — SSE 实时更新端点
- `src/lib/db/schema.ts` — agent_messages 表定义

### 前阶段上下文
- `.planning/phases/04-smart-orchestration-communication/04-CONTEXT.md` — Wave-based 执行、SSE 推送
- `.planning/phases/05-control-verification/05-CONTEXT.md` — 控制按钮、来源标签格式

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PipelineView` — 已有 Wave 渲染、SSE 连接、状态更新逻辑
- `TaskStatusIcon` — 已有状态图标 (running/completed/failed/pending/cancelled)
- `WorkflowStatusBadge` — 已有状态徽章样式
- `WorkflowControls` — 已有暂停/恢复/取消按钮
- shadcn UI — Button, Dialog, ScrollArea 组件可用

### Established Patterns
- SSE 实时更新 — EventSource 连接 `/api/workflow-status?workflowId={id}`
- 状态机模式 — pending → running → completed/failed/cancelled
- 来源标签格式 — `[{AgentType} Agent] {skillId}`

### Integration Points
- `src/components/workflow/pipeline-view.tsx` — 扩展支持折叠/展开、错误高亮
- `src/lib/db/queries.ts` — 添加日志查询函数
- 聊天消息组件 — 嵌入 Agent 状态面板
- `src/app/api/chat/route.ts` — 工作流与消息关联

</code_context>

<specifics>
## Specific Ideas

- 用户消息下方嵌入保持上下文连贯性
- 自动展开失败日志减少用户操作步骤
- 红色边框突出失败状态视觉冲击力强
- 日志持久化支持事后调试和审计

</specifics>

<deferred>
## Deferred Ideas

- 移动端专属布局优化 — 未来版本
- 日志搜索和过滤 — 未来版本
- 日志导出功能 — 未来版本
- 实时日志流式显示（打字机效果）— 未来版本

</deferred>

---

*Phase: 06-visibility-polish*
*Context gathered: 2026-03-26*
