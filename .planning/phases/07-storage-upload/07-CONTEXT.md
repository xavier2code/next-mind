# Phase 7: Storage & Upload - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

用户通过聊天界面上传文件（拖拽 + 附件按钮），文件通过抽象存储层（unstorage）安全存储到本地文件系统，具备客户端和服务端双重验证、流式上传（>10MB 用 busboy）和进度反馈。上传后文件元数据持久化到 PostgreSQL，为后续 Phase 8 内容提取、Phase 9 文件管理、Phase 10 聊天集成提供基础。

</domain>

<decisions>
## Implementation Decisions

### 上传交互设计
- **D-01**: 交互风格 — ChatGPT 风格：整个 ChatInput 区域可拖拽，附件按钮 + 文件预览芯片
- **D-02**: 附件按钮位置 — Textarea 左侧，使用 Paperclip 图标（lucide-react `Paperclip`）
- **D-03**: 文件预览卡片样式 — 紧凑芯片：文件名 + 类型图标 + 文件大小 + 关闭按钮，水平排列溢出换行
- **D-04**: 拖拽视觉反馈 — 整个 ChatInput 区域边框高亮 + 覆盖层提示
- **D-05**: 单消息最大文件数 — 5 个文件。超过时提示用户先移除一些

### 进度与错误处理
- **D-06**: 进度指示器 — 芯片内嵌细进度条 + 百分比文字。上传中芯片显示加载动画，完成后变为类型图标
- **D-07**: 错误展示 — 芯片内联错误：红色边框 + 错误图标 + 原因文字（"不支持的文件类型"、"文件超过 100MB"），5 秒后自动淡出
- **D-08**: 重试策略 — 手动重试：上传失败时芯片显示重试按钮，用户点击后重新上传，不自动重试

### 存储配置与 API 设计
- **D-09**: 存储配置 — 环境变量驱动：`STORAGE_DRIVER=local|s3`，本地模式用 `STORAGE_LOCAL_PATH` 指定目录
- **D-10**: 上传 API — 统一端点 `POST /api/files/upload`，服务端自动切换：小文件（<10MB）用 `request.formData()`，大文件用 busboy 流式解析
- **D-11**: 文件 ID 生成 — UUID，与现有代码保持一致（conversations、messages、workflows、tasks 全部使用 UUID + `defaultRandom()`）
- **D-12**: 上传响应格式 — 完整元数据返回：`{ id, filename, size, mimeType, fileType, storagePath, status }`，status 初始为 `"uploaded"`

### 数据库 Schema
- **D-13**: 表结构 — 单 `files` 表包含元数据和提取内容字段（不分离 fileContents），与 DB-01 定义一致
- **D-14**: fileType 枚举 — 3 类分类：`document`（PDF、DOCX）、`code`（代码文件）、`data`（CSV、Excel），与 MGMT-03 过滤分类一致
- **D-15**: conversationFiles 关联 — 包含 `messageId` 字段（fileId + conversationId + messageId），支持文件关联到特定消息，为 Phase 10 聊天集成做准备

### Claude's Discretion
- 附件按钮的具体 hover/active 动画效果
- 拖拽覆盖层的具体文案和动画
- 进度条的颜色方案和动画细节
- 错误芯片淡出的具体过渡效果
- 本地存储的默认路径（`STORAGE_LOCAL_PATH` 未设置时的 fallback）
- busboy 流式上传的进度事件粒度（百分比更新频率）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § UPLD-01~08 — 上传与存储需求
- `.planning/REQUIREMENTS.md` § DB-01 — files 表结构定义
- `.planning/REQUIREMENTS.md` § DB-02 — conversationFiles 关联表定义
- `.planning/REQUIREMENTS.md` § Out of Scope — 不支持的功能范围

### 技术研究
- `.planning/research/SUMMARY.md` — v1.2 完整研究总结（推荐技术栈、架构方案、关键陷阱）
- `.planning/research/STACK.md` — 推荐技术栈详情
- `.planning/research/ARCHITECTURE.md` — 系统架构模式
- `.planning/research/PITFALLS.md` — 关键陷阱（App Router body limit、magic bytes 验证、PDF 内存溢出）

### 项目上下文
- `.planning/PROJECT.md` — 项目愿景和关键决策
- `.planning/ROADMAP.md` § Phase 7 — 阶段目标和成功标准
- `.planning/STATE.md` § Accumulated Context > Decisions — 已确定的 v1.2 决策（抽象存储层、busboy 流式上传、异步提取、客户端注入、策略模式）

### 现有代码模式
- `src/components/chat/chat-input.tsx` — 需要改造的 ChatInput 组件
- `src/lib/db/schema.ts` — 现有数据库 schema 模式（Drizzle ORM + pgTable）
- `src/app/api/chat/route.ts` — 现有 API route 模式（auth → validate → process → respond）
- `src/components/ui/button.tsx` — shadcn/ui Button 组件
- `src/components/ui/input.tsx` — shadcn/ui Input 组件

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChatInput` — 现有聊天输入组件，需要扩展支持文件上传（添加 Paperclip 按钮、拖拽区域、预览芯片）
- shadcn/ui — Button, Dialog, ScrollArea, Input, Textarea 组件可直接使用
- `lucide-react` — Paperclip, X, FileText, FileCode, FileSpreadsheet, Upload, AlertCircle 等图标可用
- `cn()` from `src/lib/utils.ts` — 条件 className 合并工具

### Established Patterns
- API route 模式 — `auth()` → 验证 → 处理 → 响应（见 `src/app/api/chat/route.ts`）
- 数据库 schema — Drizzle ORM + `pgTable()` + uuid 主键 + timestamp + index（见 `src/lib/db/schema.ts`）
- 审计日志 — `logAudit()` fire-and-forget 模式（`.catch(() => {})`）
- 类型导出 — `$inferSelect` / `$inferInsert` 模式
- 枚举定义 — `const enum = [...] as const` 模式（见 AgentTypeEnum, TaskStatusEnum）

### Integration Points
- `src/components/chat/chat-input.tsx` — 扩展 ChatInput 添加文件上传 UI
- `src/lib/db/schema.ts` — 添加 files 和 conversationFiles 表定义
- `src/lib/db/queries.ts` — 添加文件相关查询函数
- `src/app/api/files/upload/route.ts` — 新建上传 API 端点
- `src/lib/storage/` — 新建存储抽象层（StorageProvider + LocalAdapter）
- 聊天页面组件 — 集成修改后的 ChatInput

</code_context>

<specifics>
## Specific Ideas

- ChatGPT 风格上传：附件按钮在 Textarea 左侧，拖拽覆盖整个输入区域
- 紧凑芯片式文件预览：文件名 + 类型图标 + 大小 + 关闭按钮，水平排列
- 芯片内嵌进度条 + 百分比，上传完成前显示加载动画
- 错误直接在芯片上展示（红色边框 + 错误原因），5 秒自动淡出
- 手动重试按钮在失败芯片上，不自动重试

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-storage-upload*
*Context gathered: 2026-03-26*
