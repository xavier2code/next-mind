# Next-Mind AI Agent Framework

## What This Is

Next-Mind是一个面向中型团队（10-50人）的AI Agent协作平台，基于Next.js 16构建，支持国产大模型（Qwen3.5、GLM、MinMax）。平台提供Web界面和API两种使用方式，集成完整的MCP协议、Skills技能系统、审批流程，具备全面的工具调用和文件处理能力，旨在成为团队日常工作的核心AI助手。

**v1.0 MVP 已发布** — 包含核心对话界面、MCP工具集成、技能系统、安全控制。
**v1.1 已发布** — A2A 多 Agent 协作能力。
**v1.2 已完成** — 多类型文件上传、处理、管理和对话集成。

## Current Milestone: v1.2 文件处理

**Goal:** 实现多类型文件上传、处理和管理能力，让用户能在对话中引用文件内容，也能独立管理已上传文件。

**Target features:**
- 四类文件支持：PDF、Word (.docx)、代码文件、数据文件 (CSV/Excel)
- 文件上传（最大 100MB），抽象存储层（本地/云存储可切换）
- 内容提取：文本提取、元数据解析
- 格式转换：PDF → Markdown、Word → Markdown、CSV → 结构化数据等
- 智能分类：根据文件类型和内容自动归类
- 文件预览：在界面中预览文件内容
- 内容修改：对提取后的内容进行编辑
- 文件管理：查看、删除、搜索已上传文件列表
- 对话集成：上传文件后在对话中引用其内容

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

### Active (v1.2 Scope)

- [ ] 文件上传（最大100MB，拖拽+按钮，多文件，进度显示） — Phase 7 代码完成，UAT 待测
- [ ] 抽象存储层（本地/云存储可切换） — Validated in Phase 7
- [ ] 数据库文件表（files、conversationFiles） — Validated in Phase 7
- [ ] 内容提取（PDF/DOCX/代码/CSV/Excel → Markdown+JSON） — Validated in Phase 8
- [ ] 提取调度器（策略模式、并发控制、审计日志） — Validated in Phase 8
- [ ] 提取状态 API（轮询、重试端点） — Validated in Phase 8
- [ ] 上传 UI 提取状态（FileChip 状态转换、轮询 hook） — Validated in Phase 8
- [ ] 文件管理页面（浏览、预览、删除） — Validated in Phase 9
- [ ] 对话文件内容注入（injectFileContent，截断策略） — Validated in Phase 10
- [ ] 文件处理技能（file-extract/convert/classify/read/list） — Validated in Phase 10
- [ ] 聊天 UI 集成（附件栏、内联编辑器、file-link API） — Validated in Phase 10

### Deferred (Future Milestones)

- [ ] 构建RAG知识检索系统（文件、对话历史、外部知识库、网络资源）
- [ ] 提供完整的API接口供系统集成
- [ ] 实现内容安全检测
- [ ] 支持公有云部署
- [ ] 集成云存储服务（抽象存储层已在 v1.2 实现，此指具体云厂商集成）

### Out of Scope

- 私有化部署支持 — 初期聚焦公有云，后续可扩展
- 移动端原生应用 — Web优先，后续考虑移动适配
- 实时音视频功能 — 非核心需求，暂不纳入
- 多租户隔离 — 初期单团队使用，不涉及多租户
- 图片/扫描件处理 — v1.2 聚焦文档、代码、数据文件，图片处理延后

## Context

**v1.1 交付状态：**
- 多 Agent 协作系统完整实现
- 任务分解、智能调度、并行执行、实时状态、用户控制全部就绪

**已实现功能：**
- 认证：Auth.js v5 会话管理
- LLM Gateway：Qwen、GLM、MiniMax 多模型支持
- MCP 协议：JSON-RPC 2.0 合规、工具注册表、资源/提示管理
- Bash 工具：沙箱执行、命令白名单、输入验证
- 技能系统：装饰器模式、执行器、编排器、发现机制
- 审批流程：状态机、内联 UI、API 端点
- 侧边栏：技能面板、分类浏览
- Agent 系统：类型注册、任务分解、Wave 调度、消息总线、工作流控制

**已知限制：**
- Web Search 技能返回 mock 数据（外部 API 集成待实现）
- 本地存储 → 抽象存储层（unstorage）已在 v1.2 Phase 7 实现

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 选择Next.js 16作为基础框架 | 全栈能力、React生态、TypeScript支持 | ✓ Good |
| 采用MCP协议作为工具集成标准 | 标准化、可扩展、社区支持 | ✓ Good |
| Skills系统使用装饰器模式 | TypeScript原生、元数据丰富、易于发现 | ✓ Good |
| 审批流程内联于对话 | 减少上下文切换、用户体验流畅 | ✓ Good |
| 本地存储优先 | 简化MVP、后续迁移云存储 | ⚠ Addressed by v1.2 抽象存储层 |
| v1.2 文件存储采用抽象层 | 支持本地和云存储切换，为后续云存储集成铺路 | v1.2 |

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
*Last updated: 2026-03-27 — Phase 9 File Management & Preview complete*
