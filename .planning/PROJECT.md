# Next-Mind AI Agent Framework

## What This Is

Next-Mind是一个面向中型团队（10-50人）的AI Agent协作平台，基于Next.js 16构建，支持国产大模型（Qwen3.5、GLM、MinMax）。平台提供Web界面和API两种使用方式，集成完整的MCP协议、Skills技能系统、审批流程，具备全面的工具调用和文件处理能力，旨在成为团队日常工作的核心AI助手。

**v1.0 MVP 已发布** — 包含核心对话界面、MCP工具集成、技能系统、安全控制。
**v1.1 已发布** — A2A 多 Agent 协作能力。
**v1.2 已发布** — 多类型文件上传、处理、管理和对话集成。

## Current State

**Shipped:** v1.2 文件处理 (2026-03-27)
**Total LOC:** ~15,400 TypeScript
**Total Phases:** 10 | **Total Plans:** 42

<details>
<summary>v1.0 交付内容</summary>

- Auth.js v5 会话管理
- LLM Gateway: Qwen、GLM、MiniMax 多模型支持
- MCP 协议: JSON-RPC 2.0 合规、工具注册表、资源/提示管理
- Bash 工具: 沙箱执行、命令白名单、输入验证
- 技能系统: 装饰器模式、执行器、编排器、发现机制
- 审批流程: 状态机、内联 UI、API 端点
- 侧边栏: 技能面板、分类浏览

</details>

<details>
<summary>v1.1 交付内容</summary>

- Agent 类型系统 (AgentType、AgentCard、AgentRegistry)
- 任务分解引擎 (decomposeTask、decomposeTaskWithDeps)
- 智能调度引擎 (WaveScheduler、依赖分析、并发控制)
- Agent 通信机制 (Hub-and-Spoke 消息总线、SSE 实时更新)
- 用户控制机制 (暂停/恢复/取消、WorkflowControls 组件)
- 工作流状态持久化 (WorkflowStatusService)
- 实时过程展示 (WorkflowProgress、AgentStatusList)

</details>

<details>
<summary>v1.2 交付内容</summary>

- 抽象存储层 (unstorage，本地/S3 可切换)
- 文件上传 API (双传输策略：formData + busboy 流式)
- 内容提取引擎 (PDF/DOCX/代码/CSV/Excel → Markdown+JSON)
- 提取调度器 (策略模式、并发控制、审计日志)
- 文件管理页面 (浏览、预览、删除、自动分类)
- 对话文件注入 (injectFileContent，截断策略)
- 文件处理技能 (file-extract/convert/classify/read/list)
- 聊天 UI 集成 (附件栏、内联编辑器、拖拽上传)

</details>

## Next Milestone Goals

TBD — use `/gsd:new-milestone` to define next milestone.

### Known Gaps (from v1.2)

- UPLD-01/02/05/06: 前端上传 UI 进度和预览功能未完全验证
- EXTR-03/04/05: 代码/CSV/Excel 提取器已实现但 REQUIREMENTS 未标记完成
- MGMT-04: 预览面板已实现但 REQUIREMENTS 未标记完成
- SKIL-01/02/03/04: 文件处理技能已实现但 REQUIREMENTS 未标记完成

## Core Value

让团队成员通过统一的对话界面，高效处理文件、管理知识、调用工具，完成80%以上的日常工作任务。

## Requirements

### Validated

- ✓ 支持Qwen3.5、GLM、MinMax等国产大模型接入 — v1.0
- ✓ 实现完整的MCP协议（资源访问、工具调用、提示词模板、bash访问） — v1.0
- ✓ 构建Skills技能系统（预定义技能、自定义技能、技能编排） — v1.0
- ✓ 提供ChatGPT风格的对话式Web界面 — v1.0
- ✓ 实现用户认证和权限管理 — v1.0 (Auth.js v5)
- ✓ 实现操作审计日志 — v1.0
- ✓ 实现数据加密（传输和存储） — v1.0
- ✓ Agent类型系统（AgentType、AgentCard、AgentRegistry） — v1.1 Phase 3
- ✓ 数据库基础设施（agents、tasks、workflows表） — v1.1 Phase 3
- ✓ 任务分解引擎（decomposeTask函数） — v1.1 Phase 3
- ✓ Agent-Skills集成层（SubAgentExecutor） — v1.1 Phase 3
- ✓ 智能调度引擎（WaveScheduler、依赖分析、并发控制） — v1.1 Phase 4
- ✓ Agent通信机制（Hub-and-Spoke消息总线、SSE实时更新） — v1.1 Phase 4
- ✓ 任务依赖感知分解（decomposeTaskWithDeps） — v1.1 Phase 4
- ✓ 用户控制机制（暂停/恢复/取消、WorkflowControls组件） — v1.1 Phase 5
- ✓ 工作流状态持久化（WorkflowStatusService） — v1.1 Phase 5
- ✓ SSE取消机制（AbortController集成） — v1.1 Phase 5
- ✓ 实时过程展示（WorkflowProgress进度条、AgentStatusList状态列表） — v1.1 Phase 6
- ✓ 可选日志查看（CollapsibleLogSection、LogEntry组件） — v1.1 Phase 6
- ✓ 紧凑面板集成（WorkflowPanel、ChatMessage集成） — v1.1 Phase 6
- ✓ 抽象存储层（本地/云存储可切换） — v1.2 Phase 7
- ✓ 数据库文件表（files、conversationFiles） — v1.2 Phase 7
- ✓ 内容提取（PDF/DOCX → Markdown） — v1.2 Phase 8
- ✓ 提取调度器（策略模式、并发控制、审计日志） — v1.2 Phase 8
- ✓ 文件管理页面（浏览、预览、删除） — v1.2 Phase 9
- ✓ 对话文件内容注入（injectFileContent，截断策略） — v1.2 Phase 10
- ✓ 聊天 UI 集成（附件栏、内联编辑器、file-link API） — v1.2 Phase 10

### Active

- [ ] 完善前端上传 UI 体验（进度条、预览卡片、拖拽优化）
- [ ] 代码/CSV/Excel 文件提取器完整验证
- [ ] 文件处理技能端到端验证
- [ ] 构建RAG知识检索系统（文件、对话历史、外部知识库、网络资源）
- [ ] 提供完整的API接口供系统集成
- [ ] 实现内容安全检测
- [ ] 支持公有云部署
- [ ] 集成云存储服务（具体云厂商集成）

### Deferred (Future Milestones)

- [ ] Web Search 技能接入真实搜索 API（当前返回 mock 数据）
- [ ] 多实例部署状态外部化（Redis 替代内存单例）

### Out of Scope

- 私有化部署支持 — 初期聚焦公有云，后续可扩展
- 移动端原生应用 — Web优先，后续考虑移动适配
- 实时音视频功能 — 非核心需求，暂不纳入
- 多租户隔离 — 初期单团队使用，不涉及多租户
- 图片/扫描件处理 — OCR 是独立领域，依赖重，CJK 准确度存疑
- 文件版本控制 — 团队工具暂不需要多版本追踪
- 实时协同编辑 — 需要 CRDT/OT 基础设施，复杂度过高
- Presigned URL 直传 — 100MB 以下服务端流式上传足够

## Context

**技术栈：**
- Next.js 16 (App Router, Turbopack)
- TypeScript + Decorators
- Drizzle ORM + PostgreSQL
- Auth.js v5
- unstorage (抽象存储层)
- shadcn/ui (base-nova style)
- Vitest + Playwright

**已知限制：**
- Web Search 技能返回 mock 数据（外部 API 集成待实现）
- 单例模式（WaveScheduler、WorkflowController、ApprovalStateMachine）需要 Redis 替代用于多实例部署

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 选择Next.js 16作为基础框架 | 全栈能力、React生态、TypeScript支持 | ✓ Good |
| 采用MCP协议作为工具集成标准 | 标准化、可扩展、社区支持 | ✓ Good |
| Skills系统使用装饰器模式 | TypeScript原生、元数据丰富、易于发现 | ✓ Good |
| 审批流程内联于对话 | 减少上下文切换、用户体验流畅 | ✓ Good |
| 本地存储优先 | 简化MVP、后续迁移云存储 | ✓ Good |
| v1.2 抽象存储层 (unstorage) | 支持本地和云存储切换 | ✓ Good — v1.2 |
| v1.2 双传输上传策略 | formData <10MB + busboy 流式 ≥10MB | ✓ Good — v1.2 |
| v1.2 策略模式内容提取 | mimeType 路由 + 30s 超时 + 信号量并发控制 | ✓ Good — v1.2 |
| v1.2 客户端内容注入 | 零改动流式聊天 API，通过 onSend 扩展 | ✓ Good — v1.2 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-27 after v1.2 milestone*
