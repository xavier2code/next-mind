# Next-Mind

面向中型团队的 AI Agent 协作平台，基于 Next.js 16 构建，支持国产大模型（Qwen、GLM、MiniMax），实现了 MCP 协议与多 Agent 工作流编排。

![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.2-06b6d4?logo=tailwindcss)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169e1?logo=postgresql)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.45-c5f74f?logo=drizzle)
![Vitest](https://img.shields.io/badge/Vitest-4.1-6e9f18?logo=vitest)
![Playwright](https://img.shields.io/badge/Playwright-1.58-2ead33?logo=playwright)
![License](https://img.shields.io/badge/License-MIT-blue)

## 功能特性

### v1.0 MVP

- **多模型支持** -- 接入 Qwen3.5、GLM、MiniMax 等国产大模型，支持运行时切换
- **MCP 协议** -- 完整实现 Model Context Protocol（资源访问、工具调用、提示词模板）
- **Skills 技能系统** -- TypeScript 装饰器模式，支持预定义技能、自定义技能、技能编排
- **Bash 工具** -- 沙箱执行、命令白名单、危险命令阻断
- **审批流程** -- 敏感操作需要用户确认，内联 UI 交互
- **ChatGPT 风格界面** -- 侧边栏会话管理、Markdown 渲染、代码高亮
- **安全认证** -- Auth.js v5 会话管理，支持 Google SSO

### v1.1 Multi-Agent 工作流

- **任务分解引擎** -- LLM 驱动的智能任务分解，支持依赖感知的并行调度
- **波次调度器** -- 基于 Kahn 算法的拓扑排序，同波次任务并行执行（最大并发数 3）
- **工作流控制** -- 支持暂停（检查点保存）、恢复（从检查点续执行）、取消（级联终止）
- **Agent 类型** -- 文件处理、网络搜索、代码生成、自定义 Agent
- **Agent 通信** -- Agent 间消息总线，支持上下文请求、状态通知、进度更新
- **工作流 UI** -- 实时状态面板、Agent 任务列表、日志查看、暂停/恢复/取消控制

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 语言 | TypeScript 5.8 (strict, decorators) |
| 认证 | Auth.js v5 (JWT + Google OAuth + Credentials) |
| 数据库 | PostgreSQL + Drizzle ORM |
| AI 接口 | @mariozechner/pi-ai (OpenAI-compatible) |
| MCP | @modelcontextprotocol/sdk |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui (base-nova) |
| 图标 | lucide-react |
| 校验 | Zod |
| 测试 | Vitest + Testing Library + Playwright |

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 15+

### 安装

```bash
git clone https://github.com/your-org/next-mind.git
cd next-mind

npm install

cp .env.example .env
# 编辑 .env 填入必要配置
```

### 配置

编辑 `.env` 文件：

```env
# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/nextmind

# 认证
AUTH_SECRET=your-secret-key-min-32-chars
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# LLM API Keys（至少配置一个）
QWEN_API_KEY=your-qwen-api-key
GLM_API_KEY=your-glm-api-key
MINIMAX_API_KEY=your-minimax-api-key
```

### 数据库迁移

```bash
npm run db:generate  # 生成迁移
npm run db:migrate   # 执行迁移
```

### 运行

```bash
npm run dev          # 开发模式 (Turbopack)
npm run build        # 生产构建
npm start            # 启动生产服务
```

访问 http://localhost:3000

## 项目结构

```
src/
├── app/                     # Next.js App Router
│   ├── (auth)/              # 认证相关页面 (login, register)
│   ├── (chat)/              # 对话主界面 ([conversationId])
│   └── api/                 # API 路由
│       ├── chat/            # 流式对话 (text/plain chunked)
│       ├── mcp/             # MCP 协议端点
│       ├── approval/        # 审批请求处理
│       ├── workflow-control/# 工作流暂停/恢复/取消
│       ├── workflow-status/ # 工作流状态查询
│       └── ...
├── components/
│   ├── auth/                # 登录/注册表单
│   ├── chat/                # 聊天界面组件
│   ├── sidebar/             # 会话列表、技能面板
│   ├── ui/                  # shadcn/ui 基础组件
│   └── workflow/            # 工作流面板、Agent 状态、日志
├── agents/                  # Agent 定义 (file, search, code, custom)
├── lib/
│   ├── llm/                 # LLM Gateway (多模型统一接口 + 重试)
│   ├── mcp/                 # MCP 服务器、工具注册、Bash 沙箱
│   ├── skills/              # 技能装饰器、发现、执行、编排
│   ├── agents/              # 任务分解、波次调度、工作流控制
│   ├── approval/            # 审批状态机
│   └── db/                  # Drizzle Schema + 查询
├── skills/                  # 预定义技能 (web-search, file-processing, data-analysis)
├── hooks/                   # React Hooks
└── types/                   # TypeScript 类型定义
```

## 架构概览

```
                        Frontend
  Chat UI          Sidebar           Workflow Panel
  (ChatList,       (ConversationList, (AgentStatusList,
   ChatInput,       SkillsPanel)      PipelineView,
   ModelSelector)                     LogSection)

                         | API Layer
                         |
  /api/chat (stream)   /api/mcp   /api/workflow-*
                         |
              Core Services
  +------------------+ +------------------+ +-------------------+
  | LLM Gateway      | | MCP Server       | | Agent System      |
  | Qwen/GLM/MiniMax | | Tool Registry    | | Decomposition     |
  | Retry wrapper    | | Bash sandbox     | | WaveScheduler     |
  +------------------+ +------------------+ | WorkflowCtrl      |
                                          | MessageBus        |
                                          +-------------------+
                         |
                   Data Layer
  PostgreSQL + Drizzle ORM
  (users, sessions, conversations, messages, agents,
   workflows, tasks, agent_messages, audit_logs)
```

## 自定义技能

使用 TypeScript 装饰器定义技能：

```typescript
import { skill, getSkillMetadata, skillToMcpTool } from '@/lib/skills';
import { z } from 'zod';
import type { SkillContext, SkillResult } from '@/lib/skills';

class MySkills {
  @skill({
    id: 'my-skill',
    name: 'My Custom Skill',
    description: 'A custom skill example',
    version: '1.0.0',
    category: 'custom',
    tags: ['example'],
    inputSchema: { query: z.string() },
    requiresApproval: false,
    destructiveActions: [],
    dependencies: [],
    timeout: 10000,
  })
  async mySkill(
    input: { query: string },
    context: SkillContext
  ): Promise<SkillResult> {
    return { success: true, data: { result: input.query.toUpperCase() } };
  }
}
```

技能可通过 `skillToMcpTool()` 转换为 MCP 工具，自动注册到 MCP 服务器。

## MCP 工具安全策略

Bash 工具安全措施：

- **白名单命令** (27 allowed): ls, cat, grep, find, git, mkdir, touch, rm, cp, mv 等
- **黑名单命令** (35+ blocked): sudo, su, curl, wget, python, node, npm, ssh, iptables 等
- **参数注入防护**: `sanitizeCommandArg()` 检测并阻断注入模式
- **路径保护**: 阻止删除 /etc, /root, /usr 等关键系统路径
- **超时控制**: 默认 30 秒，最大 60 秒
- **非 root 执行**: 运行时检测 UID，拒绝 root 权限执行
- **最小环境变量**: 仅传递 PATH, HOME, USER, LANG, NODE_ENV

## 开发

```bash
npm run dev            # 启动开发服务器
npm run build          # 生产构建
npm run lint           # ESLint 检查
npm test               # 运行单元测试
npm run test:watch     # 监听模式
npx vitest run tests/path/to/file.test.ts  # 单个测试文件
npm run test:coverage  # 覆盖率报告
npm run test:e2e       # E2E 测试
npm run db:studio      # Drizzle Studio 数据库管理
```

## 路线图

### 未来规划

- [ ] 文件上传与处理（PDF/Word/图片）
- [ ] RAG 知识检索系统
- [ ] 完整 REST API 接口
- [ ] 云存储集成
- [ ] 私有化部署支持
- [ ] 移动端适配
- [ ] 多租户支持

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

[MIT License](LICENSE)
