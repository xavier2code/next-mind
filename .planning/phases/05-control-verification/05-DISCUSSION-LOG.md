# Phase 5: Control & Verification - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 05-control-verification
**Areas discussed:** Workflow Control, Checkpoint & Recovery, Timeout & Error Handling, Result Aggregation

---

## Workflow Control (CTRL-01~03)

| Option | Description | Selected |
|--------|-------------|----------|
| Pipeline 视图按钮 | 在 Pipeline 视图旁边添加「暂停」「取消」按钮，与现有 UI 集成 | ✓ |
| 聊天命令 | 在聊天中输入 /pause、/cancel、/resume 命令 | |
| 两者都有 | Pipeline 按钮 + 聊天命令两种方式都支持 | |

**User's choice:** Pipeline 视图按钮

---

| Option | Description | Selected |
|--------|-------------|----------|
| 等待当前 Wave 完成 | 等待当前 Wave 中所有任务完成，不启动下一个 Wave | ✓ |
| 立即中断当前任务 | 立即停止所有正在运行的任务，可能产生不完整结果 | |

**User's choice:** 等待当前 Wave 完成

---

| Option | Description | Selected |
|--------|-------------|----------|
| 手动继续 | 用户点击「继续」按钮后立即继续执行剩余任务 | ✓ |
| 自动继续（带超时） | 暂停后自动等待 N 秒，然后继续 | |

**User's choice:** 手动继续

---

| Option | Description | Selected |
|--------|-------------|----------|
| 取消整个工作流 | 取消整个工作流，所有任务终止 | ✓ |
| 支持取消单个任务 | 允许取消特定子任务，依赖它的任务也会被取消 | |

**User's choice:** 取消整个工作流

---

| Option | Description | Selected |
|--------|-------------|----------|
| 无决策点 | 工作流执行无需人工干预，只在最后展示结果 | ✓ |
| 关键决策点确认 | 在关键步骤（如敏感操作前）暂停并请求用户确认 | |

**User's choice:** 无决策点

---

## Checkpoint & Recovery (CTRL-04~05)

| Option | Description | Selected |
|--------|-------------|----------|
| 每 Wave 完成后 | 每个 Wave 完成后自动保存检查点 | ✓ |
| 定时保存 | 按固定时间间隔保存检查点（如每 30 秒） | |
| 仅暂停时保存 | 仅在用户显式暂停时保存 | |

**User's choice:** 每 Wave 完成后

---

| Option | Description | Selected |
|--------|-------------|----------|
| 最小状态集 | 已完成的任务结果 + 剩余任务列表 + 当前 Wave 索引 | ✓ |
| 完整状态快照 | 最小状态 + 所有中间数据 + 详细执行日志 | |

**User's choice:** 最小状态集

---

| Option | Description | Selected |
|--------|-------------|----------|
| 手动选择继续 | 用户可从工作流列表中看到暂停的工作流，点击继续 | ✓ |
| 自动恢复 | 系统重启后自动检测并恢复未完成的工作流 | |

**User's choice:** 手动选择继续

---

## Timeout & Error Handling (CTRL-06)

| Option | Description | Selected |
|--------|-------------|----------|
| 60 秒固定超时 | 每个子 Agent 任务固定 60 秒超时 | ✓ |
| 按 Agent 类型设置 | 不同 Agent 类型不同超时（文件 120s、搜索 30s、代码 90s） | |
| 用户可配置 | 用户可在 Agent Card 中配置 timeout 字段 | |

**User's choice:** 60 秒固定超时

---

| Option | Description | Selected |
|--------|-------------|----------|
| 标记失败并继续 | 超时任务标记为失败，Cascade cancel 依赖它的任务 | ✓ |
| 重试一次 | 超时后自动重试 1 次，仍失败则标记失败 | |

**User's choice:** 标记失败并继续

---

| Option | Description | Selected |
|--------|-------------|----------|
| 继续独立任务 (Cascade) | 任务失败后继续执行独立任务，依赖失败任务的任务被取消 | ✓ |
| 立即停止全部 | 任何任务失败立即停止整个工作流 | |

**User's choice:** 继续独立任务 (Cascade)

---

## Result Aggregation (RSLT-01~05)

| Option | Description | Selected |
|--------|-------------|----------|
| 顺序展示（不合并） | 按任务顺序依次展示每个 Agent 的结果，不自动合并 | ✓ |
| LLM 智能合并 | LLM 将多个结果合并为一个连贯的响应 | |
| 摘要 + 详情展开 | 只展示最终结果摘要，详细结果可展开查看 | |

**User's choice:** 顺序展示（不合并）

---

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要对比展示 | 按执行顺序依次展示，不提供并排对比 | ✓ |
| 可选对比视图 | 提供「对比视图」按钮，点击后并排展示多个结果 | |

**User's choice:** 不需要对比展示

---

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要摘要 | 不生成额外摘要，用户直接看到各任务结果 | ✓ |
| 简短摘要 | LLM 生成简短摘要（1-2 句）概述整体结果 | |

**User's choice:** 不需要摘要

---

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要用户选择 | 所有结果都展示给用户，不需要选择 | ✓ |
| 用户选择采纳 | 多个结果时用户选择采纳哪个 | |

**User's choice:** 不需要用户选择

---

| Option | Description | Selected |
|--------|-------------|----------|
| 显示来源标签 | 每个结果前显示 Agent 类型和 Skill ID | ✓ |
| 不显示来源 | 只显示结果内容，不显示来源 | |

**User's choice:** 显示来源标签

---

## Claude's Discretion

- 检查点数据结构的具体 JSON schema
- Pipeline 视图按钮的具体 UI 样式和位置
- 来源标签的展示格式
- 暂停/取消/恢复的 API 端点设计

## Deferred Ideas

- 用户可配置超时时间 — 未来版本
- 按任务粒度取消（而非整个工作流）— 未来版本
- LLM 智能合并多结果 — 未来版本
- 结果对比视图 — 未来版本
- 自动恢复未完成工作流（系统重启后）— 未来版本
