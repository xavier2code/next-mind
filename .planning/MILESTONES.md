# Milestones

## v1.2 文件处理 (Shipped: 2026-03-27)

**Phases completed:** 4 phases, 14 plans, 30 tasks

**Key accomplishments:**

- File storage schema with Drizzle ORM (files + conversationFiles tables), unstorage abstraction layer with local/S3 driver selection, and file CRUD queries
- File upload API with dual transport strategy (formData for <10MB, busboy streaming for >=10MB) and server-side magic byte validation
- FileChip component with 4-state display (pending/uploading/uploaded/error), drag-and-drop ChatInput zone with overlay, useFileUpload hook with XHR progress tracking, and Paperclip attachment button
- Strategy pattern type contracts, PDF extractor via unpdf + rule-based Markdown, DOCX extractor via mammoth + turndown with D-10 warning annotations
- Three extractor classes implementing the Extractor interface with dynamic imports, dual-format data output, and 1000-row limits with warning messages.
- Extraction dispatcher with mimeType-based strategy routing, 30-second timeout, concurrency semaphore, fire-and-forget upload trigger, and authenticated status/retry API endpoints.
- Polling hook with 2s interval drives FileChip through processing spinner, ready checkmark, or failed error states after file upload
- Paginated file list API with server-side sort/filter, file detail/delete endpoints with ownership checks and storage cleanup, and JSON content-based auto-classification correcting file types during extraction
- 1. [Rule 1 - Bug] Pre-existing file-chip test expected wrong formatSize output
- 1. [Rule 1 - Bug] Fixed parallel test pollution in hook tests
- Pure utility module
- 1. [Rule 3 - Blocking] Missing files table in schema.ts
- File content injection pipeline wired into chat UI with inline Markdown editor on FileChip, attachment bar on user messages, and fire-and-forget file-conversation linking via new POST endpoint

### Known Gaps

12/28 requirements unchecked in REQUIREMENTS.md (code implemented but checkboxes not updated):
- UPLD-01/02/05/06, EXTR-03/04/05, MGMT-04, SKIL-01/02/03/04

**Archives:**

- `.planning/milestones/v1.2-ROADMAP.md`
- `.planning/milestones/v1.2-REQUIREMENTS.md`

---

## v1.1 A2A 协作 (Shipped: 2026-03-26)

**Phases completed:** 4 phases, 17 plans, 35 tasks

**Key accomplishments:**

- Agent type definitions, Agent Registry with skill validation, and four predefined Agent Cards using reference-based design
- Drizzle schema with agents, workflows, tasks tables using UUID primary keys, JSONB storage, and foreign key relationships to existing conversations table
- Task decomposition engine that breaks complex user requests into sequential subtasks using LLM with skill catalog context, validates skillIds against registry, and logs to audit
- SubAgentExecutor wrapping SkillExecutor with workflow tracking, AgentSkillContext extending SkillContext, and database queries for workflows, tasks, and agents
- Fixed syntax errors in SSE implementation files (status-broadcaster.ts, route.ts, test file) to enable compilation and testing of real-time workflow status updates.
- Core Functions:
- Progress bar component displaying workflow completion percentage with status-based colors and ARIA accessibility
- Real-time agent status display with AgentStatusList and AgentTaskRow components, showing all tasks sorted by status priority with visual indicators
- Optional log viewer with lazy loading, allowing users to expand and view agent execution logs for debugging and transparency
- 1. [Rule 2 - Missing Critical Functionality] Extended AgentStatusList interface

---

## v1.0 MVP (Shipped: 2026-03-25)

**Phases completed:** 2 phases, 11 plans, 4 tasks

**Key accomplishments:**

1. **Core Foundation** — Next.js 16 项目初始化、Auth.js v5 认证、LLM Gateway (Qwen/GLM/MiniMax)、ChatGPT 风格对话 UI、安全中间件、结构化日志
2. **MCP Protocol** — JSON-RPC 2.0 合规实现、会话作用域工具注册表、资源管理器、提示模板管理器
3. **Bash Tool** — 沙箱执行、命令白名单 (27 allowed)、危险命令阻断 (27 blocked)、输入验证、超时控制
4. **Skills System** — TypeScript 装饰器模式、技能发现机制、执行引擎、编排器 (顺序执行)
5. **Approval Flow** — 状态机、内联 UI 组件、API 端点
6. **Sidebar Panel** — 技能面板、分类浏览、搜索过滤

**Verification:** 24/24 must-haves verified

**Archives:**

- `.planning/milestones/v1.0-ROADMAP.md`
- `.planning/milestones/v1.0-REQUIREMENTS.md`

---
