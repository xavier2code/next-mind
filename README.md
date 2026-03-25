# Next-Mind

面向中型团队的 AI Agent 协作平台，基于 Next.js 16 构建，支持国产大模型（Qwen、GLM、MiniMax）。

## 功能特性

### v1.0 MVP

- **多模型支持** — 接入 Qwen3.5、GLM、MiniMax 等国产大模型，支持运行时切换
- **MCP 协议** — 完整实现 Model Context Protocol（资源访问、工具调用、提示词模板）
- **Skills 技能系统** — TypeScript 装饰器模式，支持预定义技能、自定义技能、技能编排
- **Bash 工具** — 沙箱执行、命令白名单、危险命令阻断
- **审批流程** — 敏感操作需要用户确认，内联 UI 交互
- **ChatGPT 风格界面** — 侧边栏会话管理、Markdown 渲染、代码高亮
- **安全认证** — Auth.js v5 会话管理，支持 Google SSO

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript 5.8 |
| 认证 | Auth.js v5 |
| 数据库 | PostgreSQL + Drizzle ORM |
| AI 接口 | @mariozechner/pi-ai |
| MCP | @modelcontextprotocol/sdk |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui |
| 测试 | Vitest + Playwright |

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 15+
- pnpm (推荐) 或 npm

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-org/next-mind.git
cd next-mind

# 安装依赖
pnpm install

# 配置环境变量
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
pnpm db:generate  # 生成迁移
pnpm db:migrate   # 执行迁移
```

### 运行

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build
pnpm start
```

访问 http://localhost:3000

## 项目结构

```
src/
├── app/                 # Next.js App Router
│   ├── (auth)/         # 认证相关页面
│   ├── (chat)/         # 对话主界面
│   └── api/            # API 路由
├── components/          # React 组件
├── lib/                 # 核心库
│   ├── approval/       # 审批流程
│   ├── db/             # 数据库 Schema
│   ├── llm/            # LLM Gateway
│   ├── mcp/            # MCP 协议实现
│   └── skills/         # 技能系统
├── skills/              # 预定义技能
├── hooks/               # React Hooks
└── types/               # TypeScript 类型定义
```

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Chat UI     │  │ Sidebar     │  │ Approval Dialog     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ /api/chat   │  │ /api/mcp    │  │ /api/approval       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                     Core Services                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ LLM Gateway │  │ MCP Server  │  │ Skills Orchestrator │  │
│  │ (Qwen/GLM/  │  │ (Tools/     │  │ (Execution/         │  │
│  │  MiniMax)   │  │  Resources) │  │  Orchestration)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              PostgreSQL + Drizzle ORM                    ││
│  │  (Users, Sessions, Conversations, Messages, Audit Logs) ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## 技能系统

### 预定义技能

| 技能 | 描述 |
|------|------|
| `web-search` | 网络搜索（待接入外部 API） |
| `bash` | 执行 shell 命令（沙箱隔离） |

### 自定义技能

```typescript
import { Skill, Param } from '@/lib/skills';

@Skill({
  id: 'my-skill',
  name: 'My Custom Skill',
  description: 'A custom skill example',
  category: 'custom',
})
export class MyCustomSkill {
  @Param({ type: 'string', description: 'Input text' })
  input: string;

  async execute() {
    return `Processed: ${this.input}`;
  }
}
```

## MCP 工具

### Bash 工具安全策略

- **白名单命令** (27 allowed): ls, cat, grep, find, git, npm, node 等
- **黑名单命令** (27 blocked): rm -rf, sudo, chmod 777, curl | bash 等
- **超时控制**: 默认 30 秒
- **UID/GID 隔离**: 可配置执行用户

## 开发

### 脚本

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 生产构建
pnpm lint         # ESLint 检查
pnpm test         # 运行单元测试
pnpm test:watch   # 监听模式测试
pnpm test:e2e     # E2E 测试
pnpm db:studio    # Drizzle Studio
```

### 测试

```bash
# 单元测试
pnpm test

# E2E 测试
pnpm test:e2e

# 测试覆盖率
pnpm test:coverage
```

## 路线图

### v1.1 (计划中)

- [ ] A2A 多 Agent 协作
- [ ] 文件上传与处理（PDF/Word/图片）
- [ ] RAG 知识检索系统
- [ ] 完整 API 接口
- [ ] 云存储集成

### 未来

- [ ] 私有化部署
- [ ] 移动端适配
- [ ] 多租户支持

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request。

---

*Built with Next.js 16 + TypeScript*
