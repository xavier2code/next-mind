# Milestones

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
