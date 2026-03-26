# Phase 8: Content Extraction - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

上传完成后系统自动从文件中提取文本内容并转换为可用格式（Markdown、结构化数据）。支持四类文件：PDF（unpdf 提取文本 + 规则转 Markdown）、DOCX（mammoth→HTML→turndown 转 Markdown）、代码文件（直接读取）、CSV/Excel（papaparse/exceljs 提取结构化数据）。提取异步执行（fire-and-forget），带状态跟踪和失败重试。为 Phase 9 文件管理预览和 Phase 10 聊天集成提供 `extractedContent` 和 `extractedMarkdown` 数据。

</domain>

<decisions>
## Implementation Decisions

### 提取触发与状态流转
- **D-01**: 提取触发时机 — 上传 API 成功存储文件后，通过不等待结果的异步调用（fire-and-forget）启动提取。与 v1.2 已确定的"异步提取"一致。
- **D-02**: 失败处理 — 手动重试。提取失败后 status='failed'，errorMessage 记录原因。用户在文件管理界面手动触发重试。不自动重试以避免浪费资源处理注定失败的文件。
- **D-03**: 状态轮询 — 客户端定时轮询 GET /api/files/:id/status 获取文件状态。实现简单，符合现有项目模式。
- **D-04**: 库加载策略 — 动态 import() 加载所有解析库（unpdf、mammoth、turndown、papaparse、exceljs），避免 Turbopack 构建时解析有问题的模块，同时支持按需加载减少内存。
- **D-05**: 单文件提取超时 — 30 秒。超时后 status='failed'，errorMessage 记录超时信息。

### mammoth Turbopack 阻塞
- **D-06**: mammoth 应对策略 — 依赖动态 import() 绕过 Turbopack 构建时解析。提取运行在纯服务端 Node.js runtime（route handler 里 runtime='nodejs'），不经过 Turbopack 编译。需在实现时验证此方案有效；若无效则考虑 webpack override 或替代库。

### 数据文件处理
- **D-07**: CSV/Excel 存储格式 — 双格式存储：extractedMarkdown 存为 Markdown 表格（人类可读 + LLM 消费），extractedContent 存为 JSON 字符串（程序化处理 + Phase 9 表格视图）。
- **D-08**: 行数限制 — Excel/CSV 提取限制前 1000 行。超出部分丢弃并在 errorMessage 中记录警告（如 "仅提取了前 1000 行（共 5000 行）"）。
- **D-09**: 多 sheet 处理 — 仅读取 Excel 第一个 sheet，忽略其他。

### Markdown 输出质量
- **D-10**: 结构保留 — 提取的 Markdown 保留原始文档结构：标题层级、表格（GFM 语法）、列表（有序/无序）、粗体/斜体。转换损失的内容用 HTML 注释标记（如 `<!-- [表1: 3x5 表格, 复杂合并单元格已简化] -->`）。
- **D-11**: PDF→Markdown 方式 — 基于规则的文本转换。unpdf 提取文本后，用简单规则（标题检测、段落分割）转为 Markdown。不引入额外 Markdown 转换库。

### Claude's Discretion
- 轮询间隔（建议 2-3 秒，提取完成后停止）
- PDF 标题检测的具体规则（字号变化、全大写行、编号模式等）
- 提取模块的目录结构（建议 `src/lib/extraction/` 按文件类型分策略）
- 并发提取控制（建议同时最多 N 个提取任务，防止内存溢出）
- 错误信息的具体文案格式
- Markdown 表格生成时的列对齐方式
- 代码文件的语言检测方式（基于文件扩展名映射）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § EXTR-01~09 — 内容提取需求（PDF/DOCX/代码/CSV/Excel 提取、异步处理、状态跟踪、Markdown 转换）
- `.planning/REQUIREMENTS.md` § DB-01 — files 表结构定义（extractedContent, extractedMarkdown, status, errorMessage 字段）
- `.planning/REQUIREMENTS.md` § Out of Scope — 不支持的功能范围（图片/扫描件 OCR、Excel 公式计算）

### 技术研究
- `.planning/research/STACK.md` § Content Extraction — 推荐技术栈详情（unpdf、mammoth+turndown、papaparse、exceljs 及版本号）
- `.planning/research/PITFALLS.md` § Pitfall 3 — PDF 内存溢出（per-file 大小限制、worker 线程、超时取消）
- `.planning/research/PITFALLS.md` § Pitfall 4 — DOCX 转换损失 + mammoth Turbopack 不兼容
- `.planning/research/PITFALLS.md` § Pitfall 5 — Excel 内存爆炸（exceljs 流式读取、行数限制、sheet 限制）
- `.planning/research/ARCHITECTURE.md` — 系统架构模式

### 项目上下文
- `.planning/PROJECT.md` — 项目愿景和关键决策
- `.planning/ROADMAP.md` § Phase 8 — 阶段目标："System automatically extracts text and converts uploaded files to usable formats (Markdown, structured data) asynchronously after upload"
- `.planning/STATE.md` § Blockers/Concerns — mammoth.js Turbopack 兼容性、busboy + Next.js App Router

### 现有代码模式
- `src/lib/storage/provider.ts` — 存储层（getFile 读取已上传文件、storeFile 写入）
- `src/lib/storage/types.ts` — 文件类型定义（getFileType、ACCEPTED_EXTENSIONS）
- `src/lib/db/schema.ts` — files 表（FileStatusEnum、extractedContent、extractedMarkdown、errorMessage 字段）
- `src/app/api/files/upload/route.ts` — 上传 API（返回 status='uploaded'，触发提取的入口点）
- `src/lib/audit.ts` — 审计日志 logAudit() fire-and-forget 模式

### 前置阶段上下文
- `.planning/phases/07-storage-upload/07-CONTEXT.md` — Phase 7 上传存储决策（文件 ID UUID、storage key 格式、fileType 枚举）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/storage/provider.ts` — `getFile(storagePath)` 读取已上传文件的 Buffer，提取模块直接使用
- `src/lib/storage/types.ts` — `getFileType(filename)` 返回 'document'|'code'|'data'，用于提取策略分发
- `src/lib/db/schema.ts` — `FileStatusEnum`、`files` 表定义、`updateFile` 查询函数位置
- `src/lib/audit.ts` — `logAudit()` 记录提取操作审计日志
- `src/lib/monitoring.ts` — `logger` 日志系统、`generateRequestId()` 请求追踪

### Established Patterns
- API route 模式 — `auth()` → 验证 → 处理 → 响应（见 upload route）
- 数据库操作 — Drizzle ORM 查询函数在 `src/lib/db/queries.ts`
- 枚举定义 — `const enum = [...] as const` 模式（FileTypeEnum, FileStatusEnum）
- 错误处理 — NextResponse.json({ error: 'message' }, { status: N })
- 异步模式 — fire-and-forget（`.catch(() => {})`）用于非关键后台操作

### Integration Points
- `src/app/api/files/upload/route.ts` — 上传成功后触发提取（在 storeFile + createFile 之后）
- `src/lib/db/queries.ts` — 添加 updateFileStatus、getFileById 等查询函数
- `src/lib/extraction/` — 新建提取模块（按文件类型的策略模式）
- `src/app/api/files/[id]/status/route.ts` — 新建状态轮询 API 端点
- `src/app/api/files/[id]/extract/route.ts` — 新建手动重试提取 API 端点

</code_context>

<specifics>
## Specific Ideas

- 提取模块按策略模式组织：每种文件类型一个提取器（PdfExtractor、DocxExtractor、CodeExtractor、CsvExtractor、ExcelExtractor），统一接口
- 动态 import() 加载解析库以绕过 Turbopack，提取在 Node.js runtime 执行
- 数据文件双格式存储：Markdown 表格 + JSON 字符串，覆盖人类阅读和程序处理两种场景
- Markdown 转换损失用 HTML 注释标记，让用户和 LLM 知道哪些内容被简化了
- 30 秒超时保护，防止大文件或损坏文件阻塞提取队列

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-content-extraction*
*Context gathered: 2026-03-26*
