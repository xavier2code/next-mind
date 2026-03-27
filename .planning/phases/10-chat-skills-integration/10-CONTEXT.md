# Phase 10: Chat & Skills Integration - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

用户在对话中引用已上传文件，AI 基于文件内容回答问题。同时将文件处理能力（提取、转换、分类）注册为 Agent 工作流可调用的 Skills。客户端在发送消息时拉取文件内容拼接到消息中（不改流式 chat API），消息级关联文件，用户消息下方展示附件条。

</domain>

<decisions>
## Implementation Decisions

### 客户端内容注入策略
- **D-01**: 注入位置 — 客户端拼接。Chat 页面 handleSend 收到 fileIds 后，先调 GET /api/files/:id 拉取 extractedMarkdown，拼接到用户消息 content 中发送。不修改流式 chat API route。与 STATE.md "客户端内容注入"决策一致。
- **D-02**: Token 预算管理 — 客户端截断。客户端拼接时检查文件内容总字符数，超过阈值时截断并在消息中告知用户"文件内容过长，已截断显示前 N 字符"。阈值固定或基于模型配置。
- **D-03**: 内容注入格式 — 分块分隔。在用户消息文本后面追加文件内容块，每个文件用分隔线包裹：`\n\n---\n📎 {filename} ({type}, {size})\n{extractedMarkdown}\n---\n`。清晰分隔，LLM 能理解哪个内容属于哪个文件。
- **D-04**: 文件关联粒度 — 消息级关联。发送消息后，客户端调 linkFileToConversation(fileId, conversationId, messageId) 关联文件到具体消息。messageId 在 AI 回复创建后获取，需要修改 handleSend 流程。
- **D-05**: 内容编辑 — 内联 Markdown 编辑器。CHAT-05 要求用户能在发送前编辑提取后的文件内容。在 FileChip 上加"编辑"按钮，点击展开内联 Markdown 编辑器，编辑后 AI 使用修改版。

### Skills 集成
- **D-06**: Skills 范围 — 全部实现。4 个 Skills 要求全部覆盖：file-extract（SKIL-01）、file-convert（SKIL-02）、file-classify（SKIL-03）、更新 file-read/file-list（SKIL-04）。
- **D-07**: file-convert 定位 — 封装提取器。file-convert 接收 fileId + targetFormat，内部调对应提取器并返回转换结果。实际是对已有 extractFile 的封装，不是独立格式转换工具。

### 消息中的文件展示
- **D-08**: 附件展示 — 附件条。用户消息下方显示附件行：文件名 + 类型图标 + 大小，紧凑水平排列。点击可跳转到文件管理页预览。不直接在消息中显示文件内容。
- **D-09**: AI 回复引用 — 无特殊处理。AI 回复不显示文件引用标识，用户知道自己发送了什么文件，AI 回复中自然会引用文件内容。

### Claude's Discretion
- 客户端截断的具体阈值（建议 8000-12000 字符，基于模型上下文窗口大小）
- 批量获取文件内容的 API 设计（单个请求 vs 批量端点）
- 内联 Markdown 编辑器的具体实现（textarea vs 轻量编辑库）
- file-extract Skill 的输入参数设计（fileId 还是 fileId+options）
- file-classify Skill 返回值的详细程度
- 更新后的 file-read/file-list Skill 的权限模型（只能读自己的文件？）
- Skills 注册到哪个 category（'file' 已存在于 SkillMetadata）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § CHAT-01~05 — 聊天集成需求（文件附带、内容注入、多文件、token 预算、内容编辑）
- `.planning/REQUIREMENTS.md` § SKIL-01~04 — Skills 集成需求（file-extract、file-convert、file-classify、更新 file-read/list）
- `.planning/REQUIREMENTS.md` § DB-01 — files 表结构（extractedContent, extractedMarkdown, status 字段）
- `.planning/REQUIREMENTS.md` § DB-02 — conversationFiles 关联表（fileId + conversationId + messageId）

### 技术研究
- `.planning/research/STACK.md` — 推荐技术栈详情
- `.planning/research/ARCHITECTURE.md` — 系统架构模式
- `.planning/research/PITFALLS.md` — 关键陷阱

### 项目上下文
- `.planning/PROJECT.md` — 项目愿景和关键决策
- `.planning/ROADMAP.md` § Phase 10 — 阶段目标："Users can reference files in conversations with AI and agents can process files as registered skills"
- `.planning/STATE.md` § Accumulated Context > Decisions — v1.2 关键决策（客户端内容注入、异步提取、策略模式）

### 前置阶段上下文
- `.planning/phases/07-storage-upload/07-CONTEXT.md` — Phase 7 上传存储决策（conversationFiles D-15 含 messageId、单消息最多 5 文件 D-05、onSend 签名含 fileIds）
- `.planning/phases/08-content-extraction/08-CONTEXT.md` — Phase 8 提取决策（双格式存储 D-07、extractedMarkdown 供 LLM 消费、extractFile dispatcher 接口）
- `.planning/phases/09-file-management-preview/09-CONTEXT.md` — Phase 9 文件管理决策（预览按类型分渲染 D-06、FileChip 组件可复用）

### 现有代码模式
- `src/components/chat/chat-input.tsx` — ChatInput 组件（onSend 已支持 fileIds、FileUploadButton、FileChip、useFileUpload hook）
- `src/components/chat/chat-message.tsx` — ChatMessage 组件（需扩展支持附件条展示）
- `src/components/chat/chat-list.tsx` — ChatList 组件
- `src/app/(chat)/page.tsx` — 新对话页面（handleSend 需扩展接受 fileIds）
- `src/app/(chat)/[conversationId]/page.tsx` — 现有对话页面（handleSend 需扩展接受 fileIds）
- `src/app/api/chat/route.ts` — Chat API（流式响应，不修改）
- `src/lib/skills/` — Skills 系统（decorator、discovery、executor、registry）
- `src/skills/file-processing.ts` — 现有 file-read/file-list Skills（需更新为数据库驱动）
- `src/lib/extraction/dispatcher.ts` — extractFile() 主入口（file-extract Skill 封装）
- `src/lib/extraction/classifier.ts` — classifyByContent()（file-classify Skill 封装）
- `src/lib/db/queries.ts` — getFileById()、linkFileToConversation()、getFilesByConversation()
- `src/lib/db/schema.ts` — conversationFiles 表定义（含 messageId 字段）
- `src/hooks/use-file-extraction-status.ts` — 提取状态轮询 hook
- `src/components/files/file-chip.tsx` — FileChip 组件（类型图标、formatSize 可复用）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChatInput` — `onSend(message, fileIds?)` 签名已就绪，`useFileUpload()` hook 提供完整的文件上传管理
- `FileChip` — `getTypeIcon()`、`formatSize()` 函数可复用到附件条
- `getFileById()` — 返回完整文件记录含 extractedMarkdown/extractedContent
- `linkFileToConversation(fileId, conversationId, messageId?)` — 消息级文件关联查询已实现
- `getFilesByConversation(conversationId)` — 获取会话关联的所有文件
- `extractFile(fileId)` — 提取调度器，file-extract Skill 直接封装
- `classifyByContent(filename, extractedContent, extractedMarkdown)` — 分类器，file-classify Skill 直接封装
- `getGlobalExecutor()` / `executeSkill()` — Skills 执行器
- `discoverSkills()` / `registerSkill()` — Skills 发现和注册机制

### Established Patterns
- Skills 定义 — `@skill(metadata)` 装饰器 + Zod inputSchema + SkillContext + SkillResult
- Skills 注册 — `src/lib/skills/registry.ts` 中 initializeSkillRegistry() 从模块导入
- API route — `auth()` → 验证 → 处理 → 响应
- 流式响应 — `text/plain; charset=utf-8` + `Transfer-Encoding: chunked`，客户端 reader.read() 逐块读取
- 数据库查询 — Drizzle ORM，`src/lib/db/queries.ts` 集中管理

### Integration Points
- `src/app/(chat)/page.tsx` 和 `[conversationId]/page.tsx` — handleSend 需扩展接受 fileIds，添加文件内容拉取和拼接逻辑
- `src/components/chat/chat-message.tsx` — 需添加附件条展示（文件名+图标+大小）
- `src/skills/file-processing.ts` — file-read/file-list 需更新为数据库驱动
- `src/lib/skills/registry.ts` — 注册新的 file-extract、file-convert、file-classify Skills
- `src/components/files/file-chip.tsx` — 需扩展支持内联编辑功能（编辑按钮 + Markdown 编辑器）
- 消息数据模型 — 需考虑如何传递附件信息到 ChatMessage（扩展 message 类型或独立查询）

</code_context>

<specifics>
## Specific Ideas

- 客户端在 handleSend 中：收到 fileIds → 并行 GET /api/files/:id 获取 extractedMarkdown → 拼接到用户消息文本后面 → 发送完整消息 → AI 回复创建后 linkFileToConversation
- 拼接格式：用户原始消息 + 每个文件的分块（--- 分隔线 + 📎 filename (type, size) + extractedMarkdown + ---）
- 附件条在用户消息气泡下方：复用 FileChip 的 getTypeIcon 和 formatSize，水平排列
- 内联 Markdown 编辑器：FileChip 点击编辑按钮展开 textarea，显示 extractedMarkdown，用户可修改，发送时使用编辑后的内容
- Skills 全部放在 `src/skills/file-processing.ts` 中（扩展现有文件），category='file'
- file-extract 封装 extractFile(fileId)，返回 extractedMarkdown + extractedContent
- file-convert 封装提取器，输入 fileId + targetFormat，输出对应格式
- file-classify 封装 classifyByContent()，返回分类结果

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-chat-skills-integration*
*Context gathered: 2026-03-27*
