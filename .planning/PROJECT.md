# Next-Mind AI Agent Framework

## What This Is

Next-Mind是一个面向中型团队（10-50人）的AI Agent协作平台，基于Next.js 16构建，支持国产大模型（Qwen3.5、GLM、MinMax）。平台提供Web界面和API两种使用方式，集成完整的MCP协议、Skills技能系统、审批流程，具备全面的工具调用和文件处理能力，旨在成为团队日常工作的核心AI助手。

**v1.0 MVP 已发布** — 包含核心对话界面、MCP工具集成、技能系统、安全控制。
**v1.1 开发中** — A2A 多 Agent 协作能力。

## Current Milestone: v1.1 A2A 协作

**Goal:** 实现主 Agent 任务分解与委派能力，支持多种专业子 Agent 并行/顺序执行。

**Target features:**
- 任务分解与委派机制
- 四种子 Agent 类型（文件处理、搜索、代码、自定义）
- 智能调度（自动选择顺序/并行执行）
- 结果处理（合并、对比、总结、用户选择）
- Agent 通信机制（上下文请求、子Agent间通信、状态通知、人工介入）
- 简洁过程展示

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

### Active (v1.1 Scope)

- [ ] 智能调度引擎（Phase 4）
- [ ] Agent通信机制（Phase 4）
- [ ] 用户控制机制（Phase 5）
- [ ] 实时过程展示（Phase 6）

### Deferred (Future Milestones)

- [ ] 支持多种文件类型上传和处理（PDF/Word文档、代码文件、数据文件、图片/扫描件）
- [ ] 实现文件整理功能（格式转换、内容提取、智能分类、内容修改）
- [ ] 构建RAG知识检索系统（文件、对话历史、外部知识库、网络资源）
- [ ] 提供完整的API接口供系统集成
- [ ] 实现内容安全检测
- [ ] 支持公有云部署
- [ ] 集成云存储服务

### Out of Scope

- 私有化部署支持 — 初期聚焦公有云，后续可扩展
- 移动端原生应用 — Web优先，后续考虑移动适配
- 实时音视频功能 — 非核心需求，暂不纳入
- 多租户隔离 — 初期单团队使用，不涉及多租户

## Context

**v1.0 交付状态：**
- 技术栈：Next.js 16, TypeScript, Auth.js v5, MCP SDK
- 代码量：~395K TypeScript
- 功能模块：LLM Gateway、MCP Server、Skills System、Approval Flow

**已实现功能：**
- 认证：Auth.js v5 会话管理
- LLM Gateway：Qwen、GLM、MiniMax 多模型支持
- MCP 协议：JSON-RPC 2.0 合规、工具注册表、资源/提示管理
- Bash 工具：沙箱执行、命令白名单、输入验证
- 技能系统：装饰器模式、执行器、编排器、发现机制
- 审批流程：状态机、内联 UI、API 端点
- 侧边栏：技能面板、分类浏览

**已知限制：**
- Web Search 技能返回 mock 数据（外部 API 集成待实现）
- 本地存储（云存储集成待 v1.1）

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 选择Next.js 16作为基础框架 | 全栈能力、React生态、TypeScript支持 | ✓ Good |
| 采用MCP协议作为工具集成标准 | 标准化、可扩展、社区支持 | ✓ Good |
| Skills系统使用装饰器模式 | TypeScript原生、元数据丰富、易于发现 | ✓ Good |
| 审批流程内联于对话 | 减少上下文切换、用户体验流畅 | ✓ Good |
| 本地存储优先 | 简化MVP、后续迁移云存储 | ⚠ Revisit v1.1 |

---
*Last updated: 2026-03-25 after Phase 3 Foundation & Task Decomposition complete*
