# Phase 7: Storage & Upload - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 7-Storage & Upload
**Areas discussed:** 上传交互设计, 进度与错误处理, 存储配置与 API 设计, 数据库 schema 细节

---

## 上传交互设计

### 文件上传交互方式

| Option | Description | Selected |
|--------|-------------|----------|
| ChatGPT 风格 (推荐) | 整个 ChatInput 区域可拖拽，附件按钮 + 文件预览芯片。ChatGPT 和 Claude 都用这种模式。 | ✓ |
| 纯按钮上传 | 点击附件按钮弹出文件选择器，无拖拽支持。更简单但交互受限。 | |
| 拖拽优先 | 拖拽时显示全宽拖拽区域覆盖聊天区域。更强调拖拽但实现复杂。 | |

**User's choice:** ChatGPT 风格
**Notes:** 用户选择了最常见的 AI 聊天工具上传模式。

### 文件预览卡片样式

| Option | Description | Selected |
|--------|-------------|----------|
| 紧凑芯片 (推荐) | 文件名 + 类型图标 + 文件大小 + 关闭按钮，水平排列溢出换行。类似 Slack/Teams。 | ✓ |
| 列表样式 | 每行一个文件，显示更多信息，垂直列表。更清晰但占空间。 | |

**User's choice:** 紧凑芯片
**Notes:** 水平芯片节省垂直空间，适合聊天输入区域。

### 单消息最大文件数

| Option | Description | Selected |
|--------|-------------|----------|
| 最多 5 个 (推荐) | 最多 5 个文件，超过时提示先移除。避免 token 预算超限。 | ✓ |
| 不限数量 | 不限文件数，仅限制总大小 100MB。 | |
| 最多 3 个 | 更保守，保证对话质量。 | |

**User's choice:** 最多 5 个
**Notes:** 平衡灵活性和 token 预算管理。

### 附件按钮位置

| Option | Description | Selected |
|--------|-------------|----------|
| 左侧 + Paperclip 图标 (推荐) | 紧贴 Textarea 左侧，类似 Claude。视觉一体化。 | ✓ |
| 底部工具栏 + Plus 图标 | 与 ModelSelector 同行，类似 ChatGPT 底部工具栏。 | |

**User's choice:** 左侧 + Paperclip 图标

### 拖拽视觉反馈

| Option | Description | Selected |
|--------|-------------|----------|
| 边框高亮 + 覆盖层 (推荐) | 整个 ChatInput 区域变为拖拽目标，边框变色+背景高亮+覆盖层。 | ✓ |
| 仅 Textarea 高亮 | 仅 Textarea 响应拖拽，目标区域小。 | |

**User's choice:** 边框高亮 + 覆盖层

---

## 进度与错误处理

### 上传进度指示器

| Option | Description | Selected |
|--------|-------------|----------|
| 芯片内嵌进度条 (推荐) | 每个文件芯片下方显示细进度条 + 百分比文字。类似微信/Gmail。 | ✓ |
| 统一进度条 | ChatInput 底部显示统一进度条，汇总所有文件。更简洁但粒度低。 | |

**User's choice:** 芯片内嵌进度条

### 上传失败错误展示

| Option | Description | Selected |
|--------|-------------|----------|
| 芯片内联错误 (推荐) | 芯片变为红色边框 + 错误图标 + 原因文字，5 秒后自动淡出。 | ✓ |
| Toast 通知 | 使用 toast 通知，文件从预览区移除。更规范但脱离上下文。 | |

**User's choice:** 芯片内联错误

### 重试策略

| Option | Description | Selected |
|--------|-------------|----------|
| 手动重试 (推荐) | 失败芯片显示重试按钮，用户点击重新上传。 | ✓ |
| 自动重试网络错误 | 网络错误自动重试 3 次指数退避。 | |
| 不重试 | 失败即移除，用户需重新选择。 | |

**User's choice:** 手动重试

---

## 存储配置与 API 设计

### 存储配置方式

| Option | Description | Selected |
|--------|-------------|----------|
| 环境变量配置 (推荐) | STORAGE_DRIVER=local|s3，STORAGE_LOCAL_PATH 指定目录。 | ✓ |
| 配置文件 | 在 config.ts 中配置，更易管理但不够灵活。 | |

**User's choice:** 环境变量配置

### 上传 API 端点

| Option | Description | Selected |
|--------|-------------|----------|
| 统一端点自动切换 (推荐) | 一个 POST /api/files/upload，服务端自动选择 formData 或 busboy。 | ✓ |
| 分开两个端点 | POST /api/files（小文件）和 POST /api/files/stream（大文件）。 | |

**User's choice:** 统一端点自动切换

### 文件 ID 生成

| Option | Description | Selected |
|--------|-------------|----------|
| UUID (推荐) | 与现有代码一致（conversations, messages, workflows 都用 UUID）。 | ✓ |
| nanoid | 更短（21 vs 36 字符），但风格不一致。 | |

**User's choice:** UUID

### 上传响应格式

| Option | Description | Selected |
|--------|-------------|----------|
| 完整元数据返回 (推荐) | 返回 { id, filename, size, mimeType, fileType, storagePath, status }。 | ✓ |
| 最小响应 | 只返回 { id, filename, status }。 | |

**User's choice:** 完整元数据返回

---

## 数据库 Schema

### 表结构

| Option | Description | Selected |
|--------|-------------|----------|
| 单 files 表 (推荐) | 元数据和提取内容在同一表，与 DB-01 一致。更简单。 | ✓ |
| files + fileContents 分离 | 研究文档建议，查询性能更好但增加 JOIN。 | |

**User's choice:** 单 files 表
**Notes:** 保持简单，与 DB-01 需求定义一致。

### fileType 枚举

| Option | Description | Selected |
|--------|-------------|----------|
| 3 类: document/code/data (推荐) | 与 MGMT-03 过滤分类一致。 | ✓ |
| 5 类: 按具体类型 | pdf, docx, code, csv, excel。更精确但过滤选项多。 | |

**User's choice:** 3 类: document/code/data

### conversationFiles 关联

| Option | Description | Selected |
|--------|-------------|----------|
| 包含 messageId (推荐) | fileId + conversationId + messageId，支持消息级关联。 | ✓ |
| 仅 file + conversation | 仅 fileId + conversationId，更简单。 | |

**User's choice:** 包含 messageId
**Notes:** 为 Phase 10 聊天集成做准备，支持文件关联到特定消息。

---

## Claude's Discretion

- 附件按钮 hover/active 动画效果
- 拖拽覆盖层文案和动画
- 进度条颜色方案和动画细节
- 错误芯片淡出过渡效果
- 本地存储默认路径 fallback
- busboy 进度事件粒度

## Deferred Ideas

None — discussion stayed within phase scope
