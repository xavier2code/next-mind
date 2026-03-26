# Roadmap: Next-Mind AI Agent Framework

## Milestones

- **v1.0 MVP** — Phases 1-2 (shipped 2026-03-25)
- **v1.1 A2A 协作** — Phases 3-6 (shipped 2026-03-26)
- **v2.0** — Future (planned)

## Phases

<details>
<summary>v1.0 MVP (Phases 1-2) — SHIPPED 2026-03-25</summary>

### Phase 1: Core Foundation
**Goal**: 建立 Next.js 16 项目基础，实现核心对话功能和认证系统
**Plans**: 5 plans

Plans:
- [x] 01-01: Project initialization and configuration
- [x] 01-02: Auth.js v5 authentication
- [x] 01-03: LLM Gateway multi-model support
- [x] 01-04: ChatGPT-style conversation UI
- [x] 01-05: Security middleware and structured logging

### Phase 2: MCP Protocol & Skills
**Goal**: 实现 MCP 协议、Bash 工具、Skills 系统和审批流程
**Plans**: 6 plans

Plans:
- [x] 02-01: MCP Server JSON-RPC 2.0 implementation
- [x] 02-02: Bash tool with sandboxing
- [x] 02-03: Skills decorator pattern and discovery
- [x] 02-04: Skills executor and orchestrator
- [x] 02-05: Approval flow state machine
- [x] 02-06: Sidebar skills panel

</details>

<details>
<summary>v1.1 A2A 协作 (Phases 3-6) — SHIPPED 2026-03-26</summary>

**Milestone Goal:** 实现主 Agent 任务分解与委派能力，支持多种专业子 Agent 并行/顺序执行

#### Phase 3: Foundation & Task Decomposition
**Goal**: 建立 Agent 类型定义、注册表、数据库结构，实现任务分解引擎
**Plans**: 4 plans

Plans:
- [x] 03-01: Agent type definitions and registry
- [x] 03-02: Database schema for agents, tasks, and workflows
- [x] 03-03: Task decomposition engine
- [x] 03-04: Agent-Skills integration layer

#### Phase 4: Smart Orchestration & Communication
**Goal**: 实现智能调度引擎、Agent 执行器、通信总线和执行计划可视化
**Plans**: 5 plans

Plans:
- [x] 04-01: Wave scheduler with topological sort for dependency analysis
- [x] 04-02: Hub-and-Spoke message bus for agent communication
- [x] 04-03: Execution plan visualization with SSE real-time updates
- [x] 04-04: Dependency-aware task decomposition
- [x] 04-05: Phase verification and gap closure

#### Phase 5: Control & Verification
**Goal**: 实现用户控制机制、检查点保存、错误恢复和结果处理策略
**Plans**: 4 plans

Plans:
- [x] 05-01: Workflow control schema and scheduler extensions
- [x] 05-02: Workflow control API and controller
- [x] 05-03: Pipeline view control UI
- [x] 05-04: Timeout enforcement and error handling

#### Phase 6: Visibility & Polish
**Goal**: 实现实时过程展示、Agent 状态追踪和 UI 集成优化
**Plans**: 4 plans

Plans:
- [x] 06-01: Real-time agent status display
- [x] 06-02: Workflow progress UI
- [x] 06-03: Execution log viewer
- [x] 06-04: UI polish and integration

</details>

### v2.0 (Planned)

Future phases to be defined via `/gsd:new-milestone`.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Foundation | v1.0 | 5/5 | Complete | 2026-03-25 |
| 2. MCP Protocol & Skills | v1.0 | 6/6 | Complete | 2026-03-25 |
| 3. Foundation & Task Decomposition | v1.1 | 4/4 | Complete | 2026-03-25 |
| 4. Smart Orchestration & Communication | v1.1 | 5/5 | Complete | 2026-03-26 |
| 5. Control & Verification | v1.1 | 4/4 | Complete | 2026-03-26 |
| 6. Visibility & Polish | v1.1 | 4/4 | Complete | 2026-03-26 |

---
*Roadmap updated: 2026-03-26*
*Current milestone: None — ready for v2.0 planning*
