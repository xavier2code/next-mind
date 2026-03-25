# Roadmap: Next-Mind AI Agent Framework

## Milestones

- ✅ **v1.0 MVP** — Phases 1-2 (shipped 2026-03-25)
- 🚧 **v1.1 A2A 协作** — Phases 3-6 (in progress)
- 📋 **v2.0** — Future (planned)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-2) - SHIPPED 2026-03-25</summary>

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

### 🚧 v1.1 A2A 协作 (In Progress)

**Milestone Goal:** 实现主 Agent 任务分解与委派能力，支持多种专业子 Agent 并行/顺序执行

#### Phase 3: Foundation & Task Decomposition
**Goal**: 建立 Agent 类型定义、注册表、数据库结构，实现任务分解引擎
**Depends on**: Phase 2 (v1.0 complete)
**Requirements**: DELEG-01~10, ATYPE-01~07, INTG-01~05
**Success Criteria** (what must be TRUE):
  1. User can send a complex task to the lead agent and see it automatically decomposed into subtasks
  2. User can view available sub-agent types and their capabilities in a registry
  3. Sub-agent capabilities are declared via Agent Card (JSON) with clear skill mappings
  4. System persists agents, tasks, and workflows in database tables
  5. Sub-agents integrate with existing Skills infrastructure (no code duplication)
**Plans**: TBD

Plans:
- [ ] 03-01: Agent type definitions and registry
- [ ] 03-02: Database schema for agents, tasks, and workflows
- [ ] 03-03: Task decomposition engine
- [ ] 03-04: Agent-Skills integration layer

#### Phase 4: Smart Orchestration & Communication
**Goal**: 实现智能调度引擎、Agent 执行器、通信总线和结果聚合
**Depends on**: Phase 3
**Requirements**: ORCH-01~06, COMM-01~06
**Success Criteria** (what must be TRUE):
  1. System automatically analyzes task dependencies and executes independent tasks in parallel
  2. User sees execution plan visualization showing which agents run in parallel vs sequence
  3. Sub-agents can request additional context from lead agent and share information with each other
  4. Agent status changes (started, completed, failed) are tracked and notify relevant parties
  5. Communication messages have standardized format and are logged for audit
**Plans**: TBD

Plans:
- [ ] 04-01: Agent executor with parallel/sequential support
- [ ] 04-02: Dependency analysis and auto-scheduling
- [ ] 04-03: Communication bus implementation
- [ ] 04-04: Execution plan visualization

#### Phase 5: Control & Verification
**Goal**: 实现用户控制机制、检查点保存、错误恢复和结果处理策略
**Depends on**: Phase 4
**Requirements**: CTRL-01~06, RSLT-01~05
**Success Criteria** (what must be TRUE):
  1. User can pause, cancel, or resume workflow execution at any point
  2. Long-running tasks support checkpoint save and resume from checkpoint
  3. Results from multiple agents are merged into coherent response with source attribution
  4. User can compare results side-by-side or select from multiple agent outputs
  5. Sub-agent execution respects timeout limits and handles failures gracefully
**Plans**: TBD

Plans:
- [ ] 05-01: Workflow control (pause/cancel/resume)
- [ ] 05-02: Checkpoint and recovery system
- [ ] 05-03: Result aggregation strategies
- [ ] 05-04: Timeout and error handling

#### Phase 6: Visibility & Polish
**Goal**: 实现实时过程展示、Agent 状态追踪和 UI 集成优化
**Depends on**: Phase 5
**Requirements**: VIS-01~05
**Success Criteria** (what must be TRUE):
  1. User sees real-time list of active agents with current status (running/completed/failed)
  2. Workflow progress indicator shows overall completion percentage
  3. User can optionally expand to view agent execution logs for debugging
  4. Process information displays concisely without overwhelming the main conversation
  5. Multi-agent collaboration integrates seamlessly into existing chat UI
**Plans**: TBD

Plans:
- [ ] 06-01: Real-time agent status display
- [ ] 06-02: Workflow progress UI
- [ ] 06-03: Execution log viewer
- [ ] 06-04: UI polish and integration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Foundation | v1.0 | 5/5 | Complete | 2026-03-25 |
| 2. MCP Protocol & Skills | v1.0 | 6/6 | Complete | 2026-03-25 |
| 3. Foundation & Task Decomposition | v1.1 | 0/4 | Not started | - |
| 4. Smart Orchestration & Communication | v1.1 | 0/4 | Not started | - |
| 5. Control & Verification | v1.1 | 0/4 | Not started | - |
| 6. Visibility & Polish | v1.1 | 0/4 | Not started | - |

---
*Roadmap updated: 2026-03-25*
*Current milestone: v1.1 A2A 协作*
