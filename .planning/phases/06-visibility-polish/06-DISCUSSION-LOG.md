# Phase 6: Visibility & Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 06-visibility-polish
**Areas discussed:** 聊天UI集成, 错误状态处理, 日志持久化

---

## 聊天 UI 集成位置

| Option | Description | Selected |
|--------|-------------|----------|
| 用户消息下方 | 在用户发送任务请求的消息气泡下方显示，与该请求关联 | ✓ |
| 助手回复上方 | 在助手最终回复的消息气泡上方显示，结果出现前可见进度 | |
| 聊天区域顶部固定 | 在聊天输入框上方的固定区域，全局显示当前工作流状态 | |

**User's choice:** 用户消息下方（推荐）
**Notes:** 保持上下文连贯性，用户可清楚看到哪个请求触发了哪个工作流

---

## 任务失败时日志展示

| Option | Description | Selected |
|--------|-------------|----------|
| 自动展开日志 | 失败时自动展开该任务的日志区域，让用户立即看到错误信息 | ✓ |
| 保持折叠，显示错误徽章 | 显示失败状态，用户需手动点击查看错误详情 | |

**User's choice:** 自动展开日志（推荐）
**Notes:** 减少用户操作步骤，快速定位问题

---

## 工作流整体失败显示

| Option | Description | Selected |
|--------|-------------|----------|
| 视觉上突出显示失败 | 整个面板显示红色边框和"工作流失败"标题，失败任务高亮 | ✓ |
| 仅任务级别标记 | 仅失败任务显示红色，面板整体保持原样 | |

**User's choice:** 视觉上突出显示失败（推荐）
**Notes:** 红色边框视觉冲击力强，用户一眼识别问题

---

## 日志持久化

| Option | Description | Selected |
|--------|-------------|----------|
| 持久化到数据库 | 日志存入 agent_messages 表，用户可在历史消息中展开查看 | ✓ |
| 仅实时展示 | 日志仅实时通过 SSE 推送，页面刷新后不可见 | |

**User's choice:** 持久化到数据库（推荐）
**Notes:** 支持事后调试和审计，符合项目审计日志惯例

---

## Claude's Discretion

- 日志条目的具体 JSON schema
- 面板展开/折叠的动画效果
- 移动端响应式布局适配
- 日志滚动区域的虚拟化（大量日志时）

## Deferred Ideas

- 移动端专属布局优化 — 未来版本
- 日志搜索和过滤 — 未来版本
- 日志导出功能 — 未来版本
- 实时日志流式显示（打字机效果）— 未来版本
