# Phase 9: File Management & Preview - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

用户通过专用文件管理页面（`/files`）浏览、预览和删除已上传文件。页面采用左右分栏布局：左侧为可排序分页的文件表格列表，右侧为文件预览面板。支持按文件类型过滤（document/code/data）。预览按文件类型分渲染：文档用 rendered Markdown、代码用语法高亮、数据文件用表格视图。提取失败的文件在预览面板头部显示错误信息和重试按钮。

</domain>

<decisions>
## Implementation Decisions

### 界面入口与路由
- **D-01**: 界面位置 — 独立页面 `/files`，不走 Dialog 或侧边栏面板。侧边栏 New chat 按钮下方添加 Files 入口按钮（FolderOpen 图标）。
- **D-02**: 布局结构 — 左右分栏：左侧文件列表表格，右侧文件预览面板。默认选中第一个文件或显示空状态提示。

### 文件列表表格
- **D-03**: 表格列 — 全部显示：文件名+类型图标、文件类型（document/code/data）、文件大小、上传时间、提取状态（ready/processing/failed）、操作（预览/删除）。需要新建 Table UI 组件。
- **D-04**: 排序与分页 — 表头可点击切换排序（文件名、大小、时间、类型）。分页加载，每页 20 条。默认按上传时间倒序。
- **D-05**: 类型过滤 — 顶部过滤栏支持按 fileType 过滤：全部 / document / code / data。与 Phase 7 D-14 的三分类枚举一致。

### 文件预览面板
- **D-06**: 预览渲染策略 — 按文件类型分渲染：
  - 文档（PDF/DOCX）— react-markdown 渲染 extractedMarkdown
  - 代码 — 语法高亮显示 extractedContent（prismjs 或 shiki）
  - 数据文件（CSV/Excel）— 表格视图渲染 extractedContent（JSON 字符串解析为表格）
- **D-07**: 预览面板头部 — 显示文件名、文件类型、文件大小、上传时间、提取状态。提取失败时显示 errorMessage 和重试按钮（调用现有 `/api/files/[id]/extract` 端点）。

### 删除流程
- **D-08**: 删除确认 — 确认 Dialog："确定要删除 {filename} 吗？此操作不可撤销。" 确认后调用 `deleteFile()`（同时删除数据库记录和存储文件）。

### 自动分类
- **D-09**: 分类策略 — 复用 fileType 三分类（document/code/data），content analysis 在提取阶段修正基于扩展名的分类。例如 `.json` 文件根据内容判断是 code（配置文件）还是 data（数据集）。修正结果写入 files.classification 字段，不影响 fileType 主分类。

### 空状态与初始状态
- **D-10**: 空状态 — 显示空状态插图 + "还没有上传文件" 文字 + "上传第一个文件"按钮（跳转到聊天页面，引导用户在对话中上传文件）。
- **D-11**: 初始预览状态 — 右侧预览面板在未选中文件时显示提示信息（如 "选择一个文件查看预览"）。

### Claude's Discretion
- Table 组件的具体样式（行高、hover 效果、边框风格）
- 排序图标的具体样式
- 分页控件的设计（上一页/下一页 vs 页码）
- react-markdown 的具体插件配置（GFM、代码块样式等）
- 语法高亮库选择（prismjs vs shiki vs highlight.js）
- 预览面板的宽度和比例
- 内容分析的具体规则和阈值
- 空状态插图的具体样式

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § MGMT-01~05 — 文件管理需求（文件列表、删除、过滤、预览、自动分类）
- `.planning/REQUIREMENTS.md` § DB-01 — files 表结构（extractedContent, extractedMarkdown, classification, status, errorMessage 字段）
- `.planning/REQUIREMENTS.md` § Out of Scope — 不支持的功能范围

### 技术研究
- `.planning/research/STACK.md` — 推荐技术栈详情
- `.planning/research/ARCHITECTURE.md` — 系统架构模式
- `.planning/research/PITFALLS.md` — 关键陷阱

### 项目上下文
- `.planning/PROJECT.md` — 项目愿景和关键决策
- `.planning/ROADMAP.md` § Phase 9 — 阶段目标和成功标准
- `.planning/ROADMAP.md` § Phase 10 — 下游阶段（Chat & Skills Integration），确保预览面板设计不与之冲突

### 前置阶段上下文
- `.planning/phases/07-storage-upload/07-CONTEXT.md` — Phase 7 上传存储决策（fileType 枚举 D-14、存储层 API、FileChip 组件）
- `.planning/phases/08-content-extraction/08-CONTEXT.md` — Phase 8 提取决策（双格式存储 D-07、Markdown 质量 D-10、状态轮询 D-03、重试端点）

### 现有代码模式
- `src/lib/db/schema.ts` — files 表定义（FileTypeEnum, FileStatusEnum, extractedContent, extractedMarkdown, classification）
- `src/lib/db/queries.ts` — getFilesByUser(), getFileById(), deleteFile(), updateFileExtraction(), updateFileStatus()
- `src/lib/storage/types.ts` — getFileType(), ACCEPTED_EXTENSIONS
- `src/lib/storage/provider.ts` — StorageProvider（getFile, deleteFile）
- `src/app/api/files/[id]/status/route.ts` — 状态轮询 API
- `src/app/api/files/[id]/extract/route.ts` — 手动重试提取 API
- `src/components/files/file-chip.tsx` — 现有文件芯片组件（类型图标、状态图标、formatSize 函数可复用）
- `src/components/sidebar/sidebar.tsx` — 侧边栏布局（需在此添加 Files 入口按钮）
- `src/app/(chat)/layout.tsx` — 聊天布局（侧边栏+主区域）
- `src/components/ui/dialog.tsx` — Dialog 组件（用于删除确认）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/files/file-chip.tsx` — `getTypeIcon()` 函数（fileType→lucide 图标映射）、`formatSize()` 函数可复用到表格中
- `src/components/ui/dialog.tsx` — 删除确认 Dialog
- `src/components/ui/button.tsx` — 操作按钮
- `src/components/ui/scroll-area.tsx` — 预览面板滚动
- `src/components/ui/select.tsx` — 过滤下拉
- `src/lib/db/queries.ts` — `getFilesByUser()` 已返回按 createdAt 倒序排列的文件列表
- `src/lib/storage/provider.ts` — `deleteFile(storagePath)` 可删除存储文件
- `lucide-react` — FolderOpen, FileText, FileCode, FileSpreadsheet, Trash2, Eye, AlertCircle, RefreshCw 等图标

### Established Patterns
- API route 模式 — `auth()` → 验证 → 处理 → 响应
- 数据库查询 — Drizzle ORM，`src/lib/db/queries.ts` 集中管理
- 枚举定义 — `const enum = [...] as const` 模式（FileTypeEnum, FileStatusEnum）
- 审计日志 — `logAudit()` fire-and-forget 模式
- 页面布局 — `(chat)` 路由组包含侧边栏，新 `/files` 页面需考虑是否复用此布局

### Integration Points
- `src/app/(chat)/layout.tsx` 或新建布局 — 文件管理页面需要侧边栏（包含 Files 入口）
- `src/components/sidebar/sidebar.tsx` — 添加 Files 导航按钮
- `src/app/api/files/` — 新建文件列表 API（GET /api/files，支持分页排序过滤）
- `src/app/api/files/[id]/` — 复用现有 status 和 extract 端点，新建 delete 端点
- `src/lib/db/queries.ts` — 扩展分页查询、排序、过滤功能
- `src/lib/extraction/` — 预览面板消费 extractedContent 和 extractedMarkdown

</code_context>

<specifics>
## Specific Ideas

- 左右分栏布局：左侧表格约 60% 宽度，右侧预览面板约 40% 宽度
- 表格全列显示但紧凑：文件名列带类型图标，状态列用彩色图标（绿=ready、蓝=processing、红=failed），操作列放预览和删除图标按钮
- 预览面板三种渲染模式：文档→react-markdown、代码→语法高亮、数据→表格组件
- 预览面板头部同时作为"文件详情卡片"，包含元数据和操作（重试、删除）
- 空状态引导用户到聊天页面上传文件，保持"对话为核心"的产品理念
- 自动分类在提取阶段执行，修正 fileType 字段（不新增分类维度）

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-file-management-preview*
*Context gathered: 2026-03-27*
