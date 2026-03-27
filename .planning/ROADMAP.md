# Roadmap: Next-Mind AI Agent Framework

## Milestones

- **v1.0 MVP** — Phases 1-2 (shipped 2026-03-25)
- **v1.1 A2A 协作** — Phases 3-6 (shipped 2026-03-26)
- **v1.2 文件处理** — Phases 7-10 (shipped 2026-03-27)
- **v1.3 全量回归验证** — Phases 11-14 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

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

<details>
<summary>v1.2 文件处理 (Phases 7-10) — SHIPPED 2026-03-27</summary>

**Milestone Goal:** 实现多类型文件上传、处理和管理能力，让用户能在对话中引用文件内容，也能独立管理已上传文件

#### Phase 7: Storage & Upload
**Goal**: Users can upload files through the chat interface; files are stored safely via an abstract storage layer with proper validation and streaming support
**Plans**: 3 plans

Plans:
- [x] 07-01: Database schema, storage abstraction, file queries, and test scaffolds
- [x] 07-02: File validation module and upload API with dual transport
- [x] 07-03: ChatInput UI extension with drag-drop, file chips, and upload hook

#### Phase 8: Content Extraction
**Goal**: System automatically extracts text and converts uploaded files to usable formats (Markdown, structured data) asynchronously after upload
**Plans**: 4 plans

Plans:
- [x] 08-01: Extraction types, markdown utilities, and document extractors (PDF + DOCX)
- [x] 08-02: Code, CSV, and Excel extractors
- [x] 08-03: Extraction dispatcher, concurrency control, upload trigger, and status/retry APIs
- [x] 08-04: Extraction status polling hook and FileChip UI extension

#### Phase 9: File Management & Preview
**Goal**: Users can browse, preview, and manage their uploaded files through a dedicated file management interface
**Plans**: 3 plans

Plans:
- [x] 09-01: Backend API (paginated list, delete) and auto-classification module
- [x] 09-02: File table UI with sort/filter/pagination and data hooks
- [x] 09-03: Preview panel, page assembly, and sidebar entry

#### Phase 10: Chat & Skills Integration
**Goal**: Users can reference files in conversations with AI and agents can process files as registered skills
**Plans**: 4 plans

Plans:
- [x] 10-01: File content injection module (types, formatting, truncation)
- [x] 10-02: File processing skills (file-extract, file-convert, file-classify, updated file-read/list)
- [x] 10-03: Chat UI integration (attachment bar, inline editor, handleSend wiring)
- [x] 10-04: Phase verification

</details>

### v1.3 全量回归验证 (In Progress)

**Milestone Goal:** 搭建 Docker 容器化验证环境，对 v1.0-v1.2 所有功能进行全量回归验证，产出验证报告并修复发现的问题

- [ ] **Phase 11: Docker Environment** - 容器化部署环境搭建（Dockerfile + compose + 迁移修复）
- [x] **Phase 12: Test Infrastructure** - E2E 测试基础设施（Playwright 配置、auth fixture、LLM mock、seed） (completed 2026-03-27)
- [ ] **Phase 13: E2E Regression** - v1.0-v1.2 全功能 E2E 回归测试
- [ ] **Phase 14: Verification & Fixes** - 验证报告产出与缺陷修复

## Phase Details

### Phase 11: Docker Environment
**Goal**: 开发者可以通过 `docker compose up` 一键启动完整的 Next.js + PostgreSQL 环境，容器内自动完成数据库迁移
**Depends on**: Phase 10
**Requirements**: DOCK-01, DOCK-02, DOCK-03, DOCK-04, DOCK-05, DOCK-06, DOCK-07, DOCK-08, TINF-06
**Success Criteria** (what must be TRUE):
  1. `docker compose up` 启动后 PostgreSQL 和 Next.js 两个容器均进入 healthy/running 状态
  2. 容器启动后数据库自动执行 Drizzle 迁移，所有 v1.0-v1.2 表结构存在
  3. 浏览器访问 localhost:3000 可正常加载登录页面
  4. unstorage 上传文件在容器重启后仍然存在（volume 持久化）
  5. Docker 镜像大小合理（standalone 输出，~200MB 量级）
**Plans**: 4 plans

Plans:
- [x] 11-01: Standalone output config and Drizzle migration regeneration
- [x] 11-02: Multi-stage Dockerfile with .dockerignore
- [x] 11-03: docker-compose.yml, entrypoint script, .env.docker
- [ ] 11-04: Phase verification (docker compose up end-to-end)

### Phase 12: Test Infrastructure
**Goal**: E2E 测试可在 Docker 环境中运行，具备认证会话复用、LLM 响应 mock、测试数据初始化能力
**Depends on**: Phase 11
**Requirements**: TINF-01, TINF-02, TINF-03, TINF-04, TINF-05
**Success Criteria** (what must be TRUE):
  1. Playwright 测试可通过环境变量 `PLAYWRIGHT_BASE_URL` 切换本地/Docker 目标
  2. E2E 测试中可通过 auth fixture 获取已认证会话，无需手动登录
  3. 聊天 E2E 测试可 mock LLM API 响应，无需真实 API key 即可运行
  4. `npm run db:seed` 在 Docker 环境中创建测试用户和基础数据
  5. `/api/health` 返回应用状态和数据库连通性（docker-compose healthcheck 使用）
**Plans**: 4 plans

Plans:
- [x] 12-01: Playwright config update (env var baseURL, Docker-aware webServer)
- [x] 12-02: Auth fixture and seed script
- [ ] 12-03: LLM mock via Playwright route interception
- [x] 12-04: Health endpoint and phase verification

### Phase 13: E2E Regression
**Goal**: v1.0-v1.2 所有核心功能均有对应的 E2E 测试覆盖，测试可在 Docker 环境中稳定运行
**Depends on**: Phase 12
**Requirements**: V10-01, V10-02, V10-03, V10-04, V10-05, V11-01, V11-02, V11-03, V11-04, V11-05, V12-01, V12-02, V12-03, V12-04, V12-05
**Success Criteria** (what must be TRUE):
  1. 用户注册/登录流程可通过 E2E 测试端到端验证
  2. 发送聊天消息可收到 mock LLM 流式响应（无需真实 API key）
  3. MCP bash 工具可执行允许列表内命令并返回结果
  4. Skills 系统可调用预定义技能；审批流程可触发并完成批准/拒绝
  5. Agent 任务分解、WaveScheduler 调度、工作流控制（暂停/恢复/取消）均可通过测试验证
  6. 文件上传（小文件 + 大文件流式）、内容提取、文件管理页面、文件内容注入对话均可通过 E2E 测试验证
**Plans**: 4 plans

Plans:
- [ ] 13-01: E2E tests for v1.0 features (auth, chat, MCP, skills, approval)
- [ ] 13-02: E2E tests for v1.1 features (agent decomposition, scheduler, workflow control, status persistence)
- [ ] 13-03: E2E tests for v1.2 features (file upload, extraction, management, chat injection)
- [ ] 13-04: Phase verification (all tests passing in Docker)

### Phase 14: Verification & Fixes
**Goal**: 产出 v1.0-v1.2 每个功能的 PASS/FAIL 验证报告，修复所有 FAIL 项，确保现有单元测试全部通过
**Depends on**: Phase 13
**Requirements**: RPT-01, RPT-02, RPT-03, RPT-04, RPT-05
**Success Criteria** (what must be TRUE):
  1. v1.0 验证报告列出所有核心功能的 PASS/FAIL 状态
  2. v1.1 验证报告列出所有核心功能的 PASS/FAIL 状态
  3. v1.2 验证报告列出所有核心功能的 PASS/FAIL 状态
  4. 所有 FAIL 项有对应修复，修复后测试通过
  5. 现有全部单元测试在 Docker 环境中通过
**Plans**: 4 plans

Plans:
- [ ] 14-01: v1.0 verification report and fixes
- [ ] 14-02: v1.1 verification report and fixes
- [ ] 14-03: v1.2 verification report and fixes
- [ ] 14-04: Unit test validation and milestone closure

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13 → 14

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
| 9. File Management & Preview | v1.2 | 3/3 | Complete | 2026-03-27 |
| 10. Chat & Skills Integration | v1.2 | 4/4 | Complete | 2026-03-27 |
| 11. Docker Environment | v1.3 | 3/4 | In Progress|  |
| 12. Test Infrastructure | v1.3 | 3/4 | In Progress|  |
| 13. E2E Regression | v1.3 | 0/4 | Not started | - |
| 14. Verification & Fixes | v1.3 | 0/4 | Not started | - |

---
*Roadmap updated: 2026-03-27*
*Next phase: Phase 11 — Docker Environment*
