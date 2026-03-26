# Phase 8: Content Extraction - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 08-content-extraction
**Areas discussed:** 提取触发与状态流转, mammoth Turbopack 阻塞, 数据文件处理细节, Markdown 输出质量

---

## 提取触发与状态流转

### Q: 提取应该在什么时机触发？

| Option | Description | Selected |
|--------|-------------|----------|
| 上传后同步触发 | 上传 API 成功存储文件后立即触发提取，但大文件可能触发请求超时 | |
| 上传后异步触发（推荐） | fire-and-forget 异步调用，与 v1.2 已确定的"异步提取"一致 | ✓ |
| 手动触发 | 用户在文件管理界面手动点击"提取内容"按钮 | |

**User's choice:** 上传后异步触发（推荐）

### Q: 提取失败后如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 手动重试（推荐） | status='failed'，用户在文件管理界面手动重试 | ✓ |
| 自动重试 + 限制次数 | 自动重试 N 次指数退避，适合临时性故障 | |
| 不重试 | 失败后不提供重试，用户只能重新上传 | |

**User's choice:** 手动重试（推荐）

### Q: 客户端如何获知提取状态变化？

| Option | Description | Selected |
|--------|-------------|----------|
| 轮询 API（推荐） | GET /api/files/:id/status 定时轮询 | ✓ |
| SSE 推送 | Server-Sent Events 推送状态变化 | |
| 被动查询 | 刷新页面时才查询状态 | |

**User's choice:** 轮询 API（推荐）

### Q: 提取模块如何加载解析库？

| Option | Description | Selected |
|--------|-------------|----------|
| 直接 import | 直接 import 各解析库，可能受 Turbopack 影响 | |
| 动态 import（推荐） | 运行时 dynamic import()，绕过 Turbopack 构建时解析 | ✓ |

**User's choice:** 动态 import（推荐）

---

## mammoth Turbopack 阻塞

### Q: mammoth Turbopack 阻塞的应对策略？

| Option | Description | Selected |
|--------|-------------|----------|
| 动态 import + 验证（推荐） | 依赖动态 import() 绕过 Turbopack，提取在 Node.js runtime 执行 | ✓ |
| webpack override | next.config.ts 中配置 webpack override 让特定 route 使用 webpack | |
| 替代库 | 放弃 mammoth，改用 docx-preview、python-docx 或 LibreOffice | |

**User's choice:** 动态 import + 验证（推荐）

---

## 数据文件处理细节

### Q: CSV/Excel 提取结果如何存储？

| Option | Description | Selected |
|--------|-------------|----------|
| 双格式存储（推荐） | extractedMarkdown 存 Markdown 表格，extractedContent 存 JSON 字符串 | ✓ |
| 仅 JSON | 只存 JSON 字符串，程序化处理方便但可读性差 | |
| 仅 Markdown | 只存 Markdown 表格，可读性好但丢失结构化数据 | |

**User's choice:** 双格式存储（推荐）

### Q: Excel/CSV 提取行数限制？

| Option | Description | Selected |
|--------|-------------|----------|
| 1000 行上限（推荐） | 防止内存爆炸，PITFALLS.md 建议设置行数限制 | ✓ |
| 5000 行上限 | 更大限制但内存消耗更高 | |
| 不限制 | 不限制行数，可能导致内存溢出 | |

**User's choice:** 1000 行上限（推荐）

### Q: Excel 多 sheet 如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 仅第一个 sheet（推荐） | 简单直接，覆盖大多数场景 | ✓ |
| 所有 sheet | 读取所有 sheet，用 sheet 名称分隔 | |
| 第一个 + sheet 列表提示 | 默认读第一个，附加其他 sheet 列表 | |

**User's choice:** 仅第一个 sheet（推荐）

---

## Markdown 输出质量

### Q: Markdown 输出应保留多少文档结构？

| Option | Description | Selected |
|--------|-------------|----------|
| 保留结构 + 损失注释（推荐） | 保留标题/表格/列表格式，损失内容用 HTML 注释标记 | ✓ |
| 保留结构，不标记损失 | 尽量保留格式，不标记损失 | |
| 纯文本，忽略格式 | 只提取纯文本，不做格式保留 | |

**User's choice:** 保留结构 + 损失注释（推荐）

### Q: PDF→Markdown 的转换方式？

| Option | Description | Selected |
|--------|-------------|----------|
| 基于规则的文本转换（推荐） | unpdf 提取文本 + 简单规则转 Markdown | ✓ |
| unpdf + pdf-parse 降级 | 双重保险但增加依赖 | |
| 仅纯文本 | PDF 只存纯文本，不做 Markdown | |

**User's choice:** 基于规则的文本转换（推荐）

### Q: 单文件提取超时限制？

| Option | Description | Selected |
|--------|-------------|----------|
| 30 秒超时（推荐） | 超时后 status='failed'，记录超时信息 | ✓ |
| 60 秒超时 | 给大文件更多时间但可能阻塞队列 | |
| 不设超时 | 依赖事件循环，风险大 | |

**User's choice:** 30 秒超时（推荐）

---

## Claude's Discretion

- 轮询间隔（建议 2-3 秒）
- PDF 标题检测规则
- 提取模块目录结构
- 并发提取控制数量
- 错误信息文案格式
- Markdown 表格列对齐方式
- 代码文件语言检测方式

## Deferred Ideas

None — discussion stayed within phase scope
