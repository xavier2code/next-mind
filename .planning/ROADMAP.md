# Roadmap: Next-Mind AI Agent Framework

## Milestones

- **v1.0 MVP** — Phases 1-2 (shipped 2026-03-25)
- **v1.1 A2A 协作** — Phases 3-6 (shipped 2026-03-26)
- **v1.2 文件处理** — Phases 7-10 (in progress)
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

### v1.2 文件处理 (In Progress)

**Milestone Goal:** 实现多类型文件上传、处理和管理能力，让用户能在对话中引用文件内容，也能独立管理已上传文件

#### Phase 7: Storage & Upload
**Goal**: Users can upload files through the chat interface; files are stored safely via an abstract storage layer with proper validation and streaming support
**Depends on**: v1.1 shipped
**Requirements**: UPLD-01, UPLD-02, UPLD-03, UPLD-04, UPLD-05, UPLD-06, UPLD-07, UPLD-08, DB-01, DB-02
**Success Criteria** (what must be TRUE):
  1. User can upload a file by dragging it into the chat input and see a progress indicator
  2. User can upload a file by clicking the attachment button and see a progress indicator
  3. System rejects unsupported file types with a clear error message
  4. System rejects files over 100MB with a clear error message
  5. User sees a file preview card (filename, type icon, size) after upload and can remove it before sending
  6. Uploaded files are persisted via the abstract storage layer and tracked in the database
**Plans**: 3 plans

Plans:
- [x] 07-01: Database schema, storage abstraction, file queries, and test scaffolds
- [x] 07-02: File validation module and upload API with dual transport
- [x] 07-03: ChatInput UI extension with drag-drop, file chips, and upload hook

#### Phase 8: Content Extraction
**Goal**: System automatically extracts text and converts uploaded files to usable formats (Markdown, structured data) asynchronously after upload
**Depends on**: Phase 7
**Requirements**: EXTR-01, EXTR-02, EXTR-03, EXTR-04, EXTR-05, EXTR-06, EXTR-07, EXTR-08, EXTR-09
**Plans**: 4 plans

Plans:
- [x] 08-01: Extraction types, markdown utilities, and document extractors (PDF + DOCX)
- [x] 08-02: Code, CSV, and Excel extractors
- [x] 08-03: Extraction dispatcher, concurrency control, upload trigger, and status/retry APIs
- [x] 08-04: Extraction status polling hook and FileChip UI extension

#### Phase 9: File Management & Preview
**Goal**: Users can browse, preview, and manage their uploaded files through a dedicated file management interface
**Depends on**: Phase 8
**Requirements**: MGMT-01, MGMT-02, MGMT-03, MGMT-04, MGMT-05
**Plans**: 3 plans

Plans:
- [ ] 09-01: Backend API (paginated list, delete) and auto-classification module
- [ ] 09-02: File table UI with sort/filter/pagination and data hooks
- [ ] 09-03: Preview panel, page assembly, and sidebar entry

#### Phase 10: Chat & Skills Integration
**Goal**: Users can reference files in conversations with AI and agents can process files as registered skills
**Depends on**: Phase 9
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04, CHAT-05, SKIL-01, SKIL-02, SKIL-03, SKIL-04
**Plans**: TBD
**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Core Foundation | v1.0 | 5/5 | Complete | 2026-03-25 |
| 2. MCP Protocol & Skills | v1.0 | 6/6 | Complete | 2026-03-25 |
| 3. Foundation & Task Decomposition | v1.1 | 4/4 | Complete | 2026-03-25 |
| 4. Smart Orchestration & Communication | v1.1 | 5/5 | Complete | 2026-03-26 |
| 5. Control & Verification | v1.1 | 4/4 | Complete | 2026-03-26 |
| 6. Visibility & Polish | v1.1 | 4/4 | Complete | 2026-03-26 |
| 7. Storage & Upload | v1.2 | 3/3 | Complete | 2026-03-26 |
| 8. Content Extraction | v1.2 | 4/4 | Complete | 2026-03-26 |
| 9. File Management & Preview | v1.2 | 0/3 | Not started | - |
| 10. Chat & Skills Integration | v1.2 | 0/0 | Not started | - |

---
*Roadmap updated: 2026-03-27*
*Current milestone: v1.2 文件处理*
