# Phase 9: File Management & Preview - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 9-file-management-preview
**Areas discussed:** 界面入口, 列表布局, 预览交互, 自动分类, 表格列, 预览内容, 删除流程, 侧边栏入口, 列表排序, 空状态, 预览面板头

---

## 界面入口

| Option | Description | Selected |
|--------|-------------|----------|
| 独立页面 /files | 新建 /files 路由，侧边栏添加入口按钮。列表+预览有充足空间。 | ✓ |
| 侧边栏面板 | 在现有侧边栏中添加文件管理面板。空间有限，适合快速浏览。 | |
| 主区域 Dialog | 点击侧边栏按钮弹出大 Dialog 覆盖聊天区域。空间较大但遮挡对话。 | |

**User's choice:** 独立页面 /files

---

## 列表布局

| Option | Description | Selected |
|--------|-------------|----------|
| 表格 (Table) | 行列展示元数据（文件名、类型、大小、日期、状态），信息密度高。 | ✓ |
| 文件卡片列表 | 每行一个文件卡片，带类型图标+文件名+大小+日期。 | |
| 紧凑列表 | 最小化占位，hover 显示更多详情。类似 VS Code 文件列表。 | |

**User's choice:** 表格 (Table)

---

## 预览交互

| Option | Description | Selected |
|--------|-------------|----------|
| 左右分栏 | 左侧文件列表，右侧预览面板。列表和预览同时可见。 | ✓ |
| 全屏预览覆盖 | 点击文件后预览覆盖整个文件管理区域。预览空间最大化。 | |
| 右侧滑出面板 | 点击文件后从右侧滑出预览面板。中等预览空间。 | |

**User's choice:** 左右分栏

---

## 自动分类

| Option | Description | Selected |
|--------|-------------|----------|
| 复用 fileType 三分类 | content analysis 修正 fileType（document/code/data）。 | ✓ |
| 增加语义标签 | 在 fileType 基础上添加语义标签（如 'report'、'config'、'dataset'）。 | |
| 你来定 | Claude 根据项目需求自行决定分类策略。 | |

**User's choice:** 复用 fileType 三分类

---

## 表格列

| Option | Description | Selected |
|--------|-------------|----------|
| 全部显示 | 文件名+类型图标、文件类型、文件大小、上传时间、提取状态、操作。 | ✓ |
| 紧凑显示 | 文件名、类型、大小、上传时间、操作。状态用行内图标指示。 | |
| 极简 | 文件名+大小+操作。其他信息在预览面板展示。 | |

**User's choice:** 全部显示

---

## 预览内容

| Option | Description | Selected |
|--------|-------------|----------|
| 按类型分渲染 | 文档=react-markdown、代码=syntax highlighted、数据=表格视图。 | ✓ |
| 统一 Markdown | 所有文件统一显示 extractedMarkdown 纯文本。 | |

**User's choice:** 按类型分渲染

---

## 删除流程

| Option | Description | Selected |
|--------|-------------|----------|
| 确认 Dialog | 弹出确认："确定要删除 file.pdf 吗？此操作不可撤销。" | ✓ |
| 两次点击确认 | 第一次点击显示"确认删除"文字，再次点击执行。 | |

**User's choice:** 确认 Dialog

---

## 侧边栏入口

| Option | Description | Selected |
|--------|-------------|----------|
| New chat 下方 | 与 New chat 按钮并列，FolderOpen 图标。 | ✓ |
| 侧边栏底部 | 与 Settings 等并列。 | |

**User's choice:** New chat 下方

---

## 列表排序

| Option | Description | Selected |
|--------|-------------|----------|
| 可排序 + 分页 | 表头可点击切换排序，分页每页 20 条。 | ✓ |
| 固定排序，不分页 | 默认按上传时间倒序，所有文件一次性加载。 | |

**User's choice:** 可排序 + 分页

---

## 空状态

| Option | Description | Selected |
|--------|-------------|----------|
| 空状态 + 上传引导 | 空状态插图 + "还没有上传文件" + "上传第一个文件"按钮。 | ✓ |
| 简单文字 | "暂无文件"。 | |

**User's choice:** 空状态 + 上传引导

---

## 预览面板头

| Option | Description | Selected |
|--------|-------------|----------|
| 元数据 + 错误重试 | 文件名、类型、大小、上传时间、提取状态 + 错误重试按钮。 | ✓ |
| 仅文件名 | 只显示文件名。 | |

**User's choice:** 元数据 + 错误重试

---

## Claude's Discretion

None — user made explicit choices for all gray areas
