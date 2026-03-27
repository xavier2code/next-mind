# Phase 10: Chat & Skills Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 10-chat-skills-integration
**Areas discussed:** 聊天文件引用, Skills 集成, 客户端注入策略, 消息中的文件展示

---

## 客户端注入策略

| Option | Description | Selected |
|--------|-------------|----------|
| 客户端拼接 | Chat 页面拉取文件内容拼接到消息，不改 chat API | ✓ |
| 服务端注入 | fileIds 传到 chat API，服务端查文件注入 messages | |
| 混合方案 | 客户端拼 + 批量获取接口 | |

**User's choice:** 客户端拼接
**Notes:** 与 STATE.md "客户端内容注入" 决策一致。不修改流式 chat API。

---

## Token 预算管理

| Option | Description | Selected |
|--------|-------------|----------|
| 客户端截断 | 客户端检查字符数，超阈值截断并告知用户 | ✓ |
| 服务端截断 | 服务端用 tokenizer 精确截断 | |
| 不截断 | 依赖 LLM 上下文窗口限制 | |

**User's choice:** 客户端截断
**Notes:** 简单直观，阈值固定或基于模型配置。

---

## 内容注入格式

| Option | Description | Selected |
|--------|-------------|----------|
| 分块分隔 | 用户消息后追加 --- 分隔的文件内容块 | ✓ |
| 独立消息注入 | 插入额外 system/user 消息 | |
| System prompt 前置 | 在 system prompt 中添加文件上下文 | |

**User's choice:** 分块分隔
**Notes:** 格式：\n\n---\n📎 {filename} ({type}, {size})\n{extractedMarkdown}\n---

---

## 内容编辑 (CHAT-05)

| Option | Description | Selected |
|--------|-------------|----------|
| 内联 Markdown 编辑器 | FileChip 上加编辑按钮，展开 textarea | ✓ |
| 预览面板编辑 | 复用 Phase 9 预览面板编辑 | |
| 延后实现 | CHAT-05 是 nice-to-have | |

**User's choice:** 内联 Markdown 编辑器
**Notes:** 在发送前编辑，AI 使用修改版内容。

---

## 文件关联粒度

| Option | Description | Selected |
|--------|-------------|----------|
| 消息级关联 | linkFileToConversation(fileId, conversationId, messageId) | ✓ |
| 会话级关联 | 只关联到 conversation，不关联到 message | |

**User's choice:** 消息级关联
**Notes:** conversationFiles 表已有 messageId 字段（Phase 7 D-15）。

---

## Skills 范围

| Option | Description | Selected |
|--------|-------------|----------|
| 全部实现 | 4 个 Skills 全覆盖 | ✓ |
| 核心优先 | SKIL-04 + SKIL-01 | |
| 仅更新现有 | 只更新 file-read/file-list | |

**User's choice:** 全部实现
**Notes:** file-extract, file-convert, file-classify 新建，file-read/list 更新。

---

## file-convert 定位

| Option | Description | Selected |
|--------|-------------|----------|
| 封装提取器 | 封装 extractFile，接收 fileId + targetFormat | ✓ |
| 格式转换工具 | 已有内容的格式转换 | |
| 不需要此 Skill | 已有双格式够用 | |

**User's choice:** 封装提取器
**Notes:** 实际是对已有 extractFile 的封装。

---

## 消息附件展示

| Option | Description | Selected |
|--------|-------------|----------|
| 附件条 | 文件名+图标+大小，紧凑水平排列 | ✓ |
| 文件卡片 | 文件名+图标+大小+内容预览 | |
| 不展示 | 文件内容已融入 AI 回复 | |

**User's choice:** 附件条
**Notes:** 点击可跳转文件管理页预览。

---

## AI 回复引用标识

| Option | Description | Selected |
|--------|-------------|----------|
| 无特殊处理 | AI 回复不显示文件引用标识 | ✓ |
| 文件消费标签 | "已分析 N 个文件" | |
| 引用来源高亮 | LLM 输出中标记引用来源 | |

**User's choice:** 无特殊处理
**Notes:** 用户知道自己发送了什么文件，AI 回复自然引用。

---

## Claude's Discretion

- 客户端截断阈值
- 批量获取文件内容 API 设计
- 内联 Markdown 编辑器实现方式
- Skills 输入参数和权限模型
