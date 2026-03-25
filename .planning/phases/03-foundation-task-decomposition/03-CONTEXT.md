# Phase 3: Foundation & Task Decomposition - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

建立 Agent 类型定义、注册表、数据库结构，实现任务分解引擎。这是 A2A 协作的基础设施层——定义 Agent 是什么、任务如何存储、分解如何工作、如何复用现有 Skills。智能调度、通信机制、结果聚合等高级功能在 Phase 4-6 实现。

</domain>

<decisions>
## Implementation Decisions

### Agent Card 格式
- **结构**: 引用式设计，复用现有 SkillMetadata 类型
- **字段**: id, name, description, skillIds[] (引用现有 skill), inputSchema, outputSchema, systemPrompt (可选覆盖)
- **Skill 映射**: 只存 skillId 字符串数组，运行时从 SkillRegistry 解析完整 metadata
- **类型约束**: 强类型，必须声明 inputSchema/outputSchema (Zod)
- **系统提示词**: 每个 Agent 类型有内置默认提示词，Agent Card 可选覆盖

### 任务分解策略
- **分解驱动**: LLM 驱动，主 Agent 调用 LLM 分析复杂任务并生成子任务列表
- **子任务粒度**: Skill 级别，每个子任务对应一个 skill 调用
- **完成判断**: LLM 生成固定数量的子任务，全部执行完即视为完成
- **Agent 选择**: 分解时显式指定每个子任务的 Agent 类型，不自动匹配
- **分解输出**: 结构化 JSON 包含 tasks[{agentType, skillId, input}]

### 数据库模式
- **Agent 表**: 最小化设计
  - id (UUID)
  - type (enum: file, search, code, custom)
  - card (JSONB 存储 Agent Card)
  - createdAt, updatedAt
- **Task 表**: 基础字段 + 状态
  - id (UUID)
  - workflowId (FK)
  - agentType (enum)
  - skillId (string)
  - input (JSONB)
  - output (JSONB)
  - status (enum: pending, running, completed, failed)
  - createdAt, completedAt
- **Workflow 表**: 基础字段 + 状态
  - id (UUID)
  - conversationId (FK)
  - status (enum: pending, running, completed, failed)
  - createdAt, updatedAt
- **Conversation 关联**: Workflow 通过 conversationId 关联现有对话

### Agent-Skills 集成
- **调用方式**: 子 Agent 直接调用 SkillExecutor.execute()
- **权限处理**: 子 Agent 继承用户权限，敏感操作保留现有审批流程
- **上下文传递**: 扩展 SkillContext 接口增加 workflowId, parentTaskId 字段
- **结果返回**: 复用现有 SkillResult 格式 (success, data, error, metadata)

### Claude's Discretion
- Agent Card JSON 的确切字段命名
- LLM 分解提示词的具体设计
- 数据库索引策略
- Task 状态机的具体状态转换规则

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § DELEG-01~10 — 核心委派需求
- `.planning/REQUIREMENTS.md` § ATYPE-01~07 — Agent 类型需求
- `.planning/REQUIREMENTS.md` § INTG-01~05 — 系统集成需求

### 现有代码模式
- `src/lib/skills/types.ts` — SkillMetadata, SkillContext, SkillResult 类型定义
- `src/lib/skills/discovery.ts` — DiscoveredSkill, registerSkills, getSkillById 模式
- `src/lib/skills/executor.ts` — SkillExecutor 类，execute(), 审批流程
- `src/lib/skills/registry.ts` — initializeSkillRegistry(), getAllSkills() 模式
- `src/skills/file-processing.ts` — 技能定义示例，@skill 装饰器用法

### 项目上下文
- `.planning/PROJECT.md` — Key Decisions 表：Sub-agents 复用 Skills 基础设施
- `.planning/STATE.md` — 已锁定决策：Orchestrator-worker 模式，Typed schemas

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `SkillMetadata` 接口 — 可作为 Agent Card 字段参考
- `SkillContext` 接口 — 可扩展增加 workflowId, parentTaskId
- `SkillExecutor` 类 — 子 Agent 直接复用执行逻辑
- `SkillResult` 类型 — 子 Agent 结果返回格式
- `registerSkills()` / `getSkillById()` — 可参考实现 AgentRegistry

### Established Patterns
- 装饰器模式 (`@skill`) — Agent Card 可考虑类似声明方式
- JSONB 存储 — 已用于灵活配置，Agent Card 可沿用
- 审批流程 — `requiresApproval` + `onApprovalRequired` 回调
- 超时控制 — `executeWithTimeout()` 模式

### Integration Points
- `src/app/api/chat/route.ts` — 主 Agent 对话入口，分解触发点
- `src/lib/skills/registry.ts` — Agent Registry 可平行实现
- Conversation 表 — Workflow 需要关联

</code_context>

<specifics>
## Specific Ideas

- Agent Card 引用现有 skill IDs，避免重复定义能力
- 分解结果直接指定 agentType，简单可预测
- 数据库最小化设计，Phase 4 再加依赖关系等复杂字段

</specifics>

<deferred>
## Deferred Ideas

- 动态任务分解（执行中生成新子任务）— Phase 4 智能调度
- 任务依赖关系和并行执行 — Phase 4
- Agent 间通信机制 — Phase 4
- 结果聚合策略 — Phase 5
- 实时状态展示 — Phase 6

</deferred>

---

*Phase: 03-foundation-task-decomposition*
*Context gathered: 2026-03-25*
