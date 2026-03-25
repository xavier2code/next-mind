# Requirements: Next-Mind AI Agent Framework

**Defined:** 2026-03-24 (v1.1: 2026-03-25)
**Core Value:** 让团队成员通过统一的对话界面，高效处理文件、管理知识、调用工具，完成80%以上的日常工作任务

---

## v1.1 Requirements — A2A 多 Agent 协作

主 Agent 任务分解与委派能力。

### Core Delegation (核心委派)

基础多 Agent 协作能力，验证委派概念。

- [x] **DELEG-01**: 用户可以向主 Agent 发送复杂任务请求
- [x] **DELEG-02**: 主 Agent 自动将复杂任务分解为多个子任务
- [x] **DELEG-03**: 系统维护可用的子 Agent 注册表及其能力描述
- [x] **DELEG-04**: 子任务分配给合适的子 Agent 类型执行
- [ ] **DELEG-05**: 子 Agent 按顺序执行（基础模式）
- [x] **DELEG-06**: 主 Agent 收集所有子 Agent 结果并聚合
- [x] **DELEG-07**: 聚合结果以连贯的方式呈现给用户
- [x] **DELEG-08**: 用户可以看到当前活跃的 Agent 及其状态
- [x] **DELEG-09**: 子 Agent 执行失败时系统进行错误恢复
- [x] **DELEG-10**: 数据库新增 Agent、Task、Workflow 相关表结构

### Agent Types (Agent 类型)

四种专业子 Agent 类型。

- [x] **ATYPE-01**: 文件处理 Agent — 处理 PDF/Word/图片/代码文件
- [x] **ATYPE-02**: 搜索 Agent — 执行网络搜索、知识库检索
- [x] **ATYPE-03**: 代码 Agent — 代码生成、审查、重构任务
- [x] **ATYPE-04**: 自定义 Agent — 用户定义的专用 Agent 类型
- [x] **ATYPE-05**: 每种 Agent 类型有专用的系统提示词
- [x] **ATYPE-06**: 每种 Agent 类型有专属的工具集
- [x] **ATYPE-07**: Agent 能力通过 Agent Card (JSON) 声明

### Smart Orchestration (智能编排)

自动选择最优执行策略。

- [ ] **ORCH-01**: 系统分析子任务之间的依赖关系
- [ ] **ORCH-02**: 独立的子任务并行执行
- [ ] **ORCH-03**: 有依赖的子任务按正确顺序执行
- [ ] **ORCH-04**: 系统自动决定顺序或并行执行模式
- [ ] **ORCH-05**: 并行执行时控制最大并发数（防止 token 消耗）
- [ ] **ORCH-06**: 执行计划可视化展示给用户

### Result Handling (结果处理)

多种结果处理策略。

- [ ] **RSLT-01**: 结果合并 — 多个 Agent 输出合并为连贯响应
- [ ] **RSLT-02**: 结果对比 — 多个 Agent 结果并排展示差异
- [ ] **RSLT-03**: 结果总结 — 对多个结果生成摘要
- [ ] **RSLT-04**: 用户选择 — 用户从多个结果中选择采纳
- [ ] **RSLT-05**: 结果包含来源标注（来自哪个 Agent）

### Communication (Agent 通信)

Agent 间通信机制。

- [ ] **COMM-01**: 子 Agent 可向主 Agent 请求额外上下文
- [ ] **COMM-02**: 子 Agent 之间可以发送消息共享信息
- [ ] **COMM-03**: Agent 状态变更时发送通知（开始、完成、失败）
- [ ] **COMM-04**: 子 Agent 可以请求人工介入确认
- [ ] **COMM-05**: 通信消息有标准化的格式和类型
- [ ] **COMM-06**: 通信记录保存用于审计和调试

### Control (控制机制)

执行控制和人工干预。

- [ ] **CTRL-01**: 用户可以暂停正在执行的工作流
- [ ] **CTRL-02**: 用户可以取消特定的子 Agent 任务
- [ ] **CTRL-03**: 用户可以在关键决策点提供指导
- [ ] **CTRL-04**: 长时间任务支持检查点保存
- [ ] **CTRL-05**: 从检查点恢复执行（不从头开始）
- [ ] **CTRL-06**: 设置子 Agent 执行超时限制

### Visibility (过程可见性)

用户对协作过程的感知。

- [ ] **VIS-01**: 实时显示当前正在执行的 Agent 列表
- [ ] **VIS-02**: 每个 Agent 显示当前状态（运行中/完成/失败）
- [ ] **VIS-03**: 工作流整体进度指示
- [ ] **VIS-04**: Agent 执行日志可查看（可选展开）
- [ ] **VIS-05**: 过程信息简洁展示（不过度干扰）

### Integration (系统集成)

与现有系统集成。

- [x] **INTG-01**: A2A 系统复用现有 Skills 基础设施
- [x] **INTG-02**: 子 Agent 可以调用现有 MCP 工具
- [x] **INTG-03**: 敏感操作复用现有审批流程
- [x] **INTG-04**: 多 Agent 操作记录到审计日志
- [ ] **INTG-05**: 与现有对话 UI 无缝集成

---

## v1 Requirements (Completed)

v1.0 MVP 已发布的需求。

### Core Infrastructure — ✓ Complete

- [x] **CORE-01**: System provides ChatGPT-style conversation UI with streaming output, markdown rendering, and code highlighting
- [x] **CORE-02**: Users can authenticate via email/password and SSO providers
- [x] **CORE-03**: User sessions persist across browser refreshes with secure session management
- [x] **CORE-04**: System maintains conversation history with search and filtering capabilities
- [x] **CORE-05**: System provides REST API with rate limiting for external integrations
- [x] **CORE-06**: System logs all user actions with timestamps and user IDs for audit purposes
- [x] **CORE-07**: All data in transit and at rest is encrypted (TLS 1.3, AES-256)

### Chinese LLM Integration — ✓ Complete

- [x] **LLM-01**: System supports Qwen3.5 model with official TypeScript SDK integration
- [x] **LLM-02**: System supports GLM (Zhipu AI) models via OpenAI-compatible API
- [x] **LLM-03**: System supports MiniMax M2.5 models with native pi-mono integration
- [x] **LLM-04**: System provides unified LLM API abstraction layer to isolate provider-specific implementations
- [x] **LLM-05**: System implements retry logic with exponential backoff for API rate limits (429 errors)
- [x] **LLM-06**: System handles provider-specific streaming parameters (e.g., `incremental_output: true`)
- [x] **LLM-07**: System provides model switching UI allowing users to select between available LLMs

### MCP Protocol — Partial

- [x] **MCP-01**: System implements MCP server with JSON-RPC 2.0 compliance
- [x] **MCP-02**: System provides MCP Tools registry for agent tool access
- [ ] **MCP-03**: System provides MCP Resources manager for file and data access
- [ ] **MCP-04**: System provides MCP Prompts templates for reusable prompt patterns
- [ ] **MCP-05**: System implements bash execution tool with sandboxing and permission controls
- [x] **MCP-06**: System requires authentication for all MCP requests (no anonymous access)
- [ ] **MCP-07**: System binds MCP server to localhost by default (not externally exposed)
- [ ] **MCP-08**: System validates and sanitizes all inputs to MCP tools
- [ ] **MCP-09**: System never runs MCP tools with root privileges

### Skills System — Partial

- [ ] **SKILL-01**: System provides predefined skills for common tasks (file processing, data analysis, web search)
- [ ] **SKILL-02**: Users can create custom skills through UI or configuration files
- [ ] **SKILL-03**: System supports skill orchestration for combining multiple skills in sequence
- [x] **SKILL-04**: System implements skill execution with action budgets and approval gates
- [x] **SKILL-05**: System requires human approval for destructive operations (file deletion, system commands)
- [x] **SKILL-06**: System provides skill discovery and browsing interface
- [ ] **SKILL-07**: System supports skill versioning and dependency management

### Security and Compliance — ✓ Complete

- [x] **SEC-01**: System implements content safety detection for sensitive or harmful content
- [x] **SEC-02**: System provides explicit state objects (agents know state, don't infer)
- [x] **SEC-03**: System implements verification checkpoints for multi-step operations
- [x] **SEC-04**: System limits agent chains to maximum 5 sequential steps before verification
- [x] **SEC-05**: System implements circuit breakers for failing operations (max 3 retries)
- [x] **SEC-06**: System provides real-time monitoring and alerting for security events

---

## v2 Requirements (Future)

推迟到未来版本的功能。

### File Processing

- **FILE-01**: Users can upload PDF files with automatic text extraction and OCR for scanned documents
- **FILE-02**: Users can upload Word documents (.doc, .docx) with content extraction
- **FILE-03**: Users can upload code files with syntax highlighting and language detection
- **FILE-04**: Users can upload data files (Excel, CSV, JSON) with automatic parsing
- **FILE-05**: Users can upload images and scanned documents with OCR text extraction
- **FILE-06**: System performs file format conversion (PDF to Word, image to text, etc.)
- **FILE-07**: System extracts key information and summaries from uploaded files
- **FILE-08**: System automatically classifies and tags uploaded files based on content
- **FILE-09**: Users can modify file content through natural language instructions
- **FILE-10**: System stores uploaded files in cloud storage with secure access controls

### RAG Knowledge System

- **RAG-01**: System processes uploaded documents into 400-800 token chunks respecting document structure
- **RAG-02**: System generates embeddings for document chunks using Chinese-optimized embedding model
- **RAG-03**: System stores embeddings in Qdrant vector database with metadata
- **RAG-04**: System performs hybrid retrieval combining semantic and keyword search
- **RAG-05**: System assembles retrieved context with citations and source attribution
- **RAG-06**: System retrieves from conversation history with semantic search
- **RAG-07**: System retrieves from external knowledge bases (configurable connectors)
- **RAG-08**: System retrieves from web resources via search API integration
- **RAG-09**: System tracks retrieval quality metrics (precision@k) for continuous improvement

### Team Knowledge Base

- **TEAM-01**: System provides team workspaces with shared file libraries
- **TEAM-02**: Team members can share conversations for collaborative context
- **TEAM-03**: System implements role-based access control (admin, member, viewer)
- **TEAM-04**: System provides team-level API access with scoped permissions
- **TEAM-05**: System enables team knowledge sharing through shared RAG indexes
- **TEAM-06**: System tracks team usage metrics and resource consumption

### Advanced Features

- **ADV-01**: Agent 学习和优化
- **ADV-02**: 复杂 DAG 工作流可视化编辑
- **ADV-03**: 跨会话 Agent 记忆
- **ADV-04**: Agent 性能分析和调优建议

### Skills Marketplace

- **MKT-01**: System provides skills marketplace for team skill sharing
- **MKT-02**: System enables skill rating and reviews
- **MKT-03**: System supports skill installation and updates from marketplace
- **MKT-04**: System provides skill usage analytics

### Advanced RAG

- **ARAG-01**: System implements Graph-RAG for knowledge graph integration
- **ARAG-02**: System implements Hybrid RAG with multiple retrieval strategies
- **ARAG-03**: System provides agentic document extraction with multimodal understanding

---

## Out of Scope

明确排除的功能。

| Feature | Reason |
|---------|--------|
| 无限制并行 Agent | Token 消耗爆炸、协调开销、结果冲突 |
| 实时 Agent 间聊天 | 创建瓶颈、增加复杂度、Agent 不擅长实时协调 |
| 所有 Agent 共享内存 | 上下文污染、信息冲突、隐私问题 |
| 完全自主委派 | 79% 失败是设计/协调问题，需要人工监督 |
| 复杂 DAG 工作流编辑器 | 维护噩梦、难以调试、大多数场景不需要 |
| Agent 互相学习 | 错误交叉污染、难以调试 |
| Private deployment | Initial focus on public cloud; can extend later |
| Mobile native apps | Web-first approach; mobile responsive UI is sufficient |
| Real-time audio/video | Not core to team AI assistant value proposition |
| Multi-tenant isolation | Initial single-team use; enterprise features later |

---

## Traceability

需求到阶段的映射。

### v1.1 Requirements Mapping

| Requirement | Phase | Status |
|-------------|-------|--------|
| DELEG-01 | Phase 3 | Complete |
| DELEG-02 | Phase 3 | Complete |
| DELEG-03 | Phase 3 | Complete |
| DELEG-04 | Phase 3 | Complete |
| DELEG-05 | Phase 3 | Pending |
| DELEG-06 | Phase 3 | Complete |
| DELEG-07 | Phase 3 | Complete |
| DELEG-08 | Phase 3 | Complete |
| DELEG-09 | Phase 3 | Complete |
| DELEG-10 | Phase 3 | Complete |
| ATYPE-01 | Phase 3 | Complete |
| ATYPE-02 | Phase 3 | Complete |
| ATYPE-03 | Phase 3 | Complete |
| ATYPE-04 | Phase 3 | Complete |
| ATYPE-05 | Phase 3 | Complete |
| ATYPE-06 | Phase 3 | Complete |
| ATYPE-07 | Phase 3 | Complete |
| INTG-01 | Phase 3 | Complete |
| INTG-02 | Phase 3 | Complete |
| INTG-03 | Phase 3 | Complete |
| INTG-04 | Phase 3 | Complete |
| INTG-05 | Phase 3 | Pending |
| ORCH-01 | Phase 4 | Pending |
| ORCH-02 | Phase 4 | Pending |
| ORCH-03 | Phase 4 | Pending |
| ORCH-04 | Phase 4 | Pending |
| ORCH-05 | Phase 4 | Pending |
| ORCH-06 | Phase 4 | Pending |
| COMM-01 | Phase 4 | Pending |
| COMM-02 | Phase 4 | Pending |
| COMM-03 | Phase 4 | Pending |
| COMM-04 | Phase 4 | Pending |
| COMM-05 | Phase 4 | Pending |
| COMM-06 | Phase 4 | Pending |
| CTRL-01 | Phase 5 | Pending |
| CTRL-02 | Phase 5 | Pending |
| CTRL-03 | Phase 5 | Pending |
| CTRL-04 | Phase 5 | Pending |
| CTRL-05 | Phase 5 | Pending |
| CTRL-06 | Phase 5 | Pending |
| RSLT-01 | Phase 5 | Pending |
| RSLT-02 | Phase 5 | Pending |
| RSLT-03 | Phase 5 | Pending |
| RSLT-04 | Phase 5 | Pending |
| RSLT-05 | Phase 5 | Pending |
| VIS-01 | Phase 6 | Pending |
| VIS-02 | Phase 6 | Pending |
| VIS-03 | Phase 6 | Pending |
| VIS-04 | Phase 6 | Pending |
| VIS-05 | Phase 6 | Pending |

**v1.1 Coverage:**
- v1.1 requirements: 50 total
- Mapped to phases: 50
- Unmapped: 0 ✓

### v1 Requirements Mapping (Complete)

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01~07 | Phase 1 | Complete |
| LLM-01~07 | Phase 1 | Complete |
| MCP-01~02, MCP-06 | Phase 2 | Complete |
| SKILL-04~06 | Phase 2 | Complete |
| SEC-01~06 | Phase 2 | Complete |

**v1 Coverage:**
- v1 requirements: 59 total
- Mapped to phases: 59
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-25 after v1.1 roadmap creation*
