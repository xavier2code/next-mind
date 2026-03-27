# Phase 11: Docker Environment - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

开发者可以通过 `docker compose up` 一键启动完整的 Next.js + PostgreSQL 开发/测试环境，容器启动时自动完成 Drizzle 数据库迁移。这是纯开发/测试环境，不追求生产级优化。Docker 镜像基于 Node 22-alpine，使用 standalone 输出模式，上传文件通过 volume 持久化。

</domain>

<decisions>
## Implementation Decisions

### 迁移策略
- **D-01**: 迁移工具 — Dockerfile 中独立安装 drizzle-kit 作为迁移工具层，与 standalone 应用分离。entrypoint 脚本调用 `drizzle-kit migrate` 执行迁移
- **D-02**: 迁移文件 — 重新生成迁移文件（`drizzle-kit generate`），删除旧的 0000 迁移，从空数据库开始创建所有表（v1.0-v1.2 完整 schema）
- **D-03**: 迁移执行时机 — 容器启动时由 entrypoint 脚本执行，等待 PostgreSQL 就绪后再运行迁移

### 基础镜像
- **D-04**: 基础镜像 — Node 22-alpine。镜像更小（~50MB vs ~180MB）。如果 unpdf/exceljs/mammoth 遇到 Alpine 兼容性问题，再考虑切换到 Debian slim 或安装额外系统库

### 构建与优化
- **D-05**: 构建方式 — 先尝试 `next build`（Turbopack 默认）+ standalone 输出。如果 Turbopack standalone 有问题则回退到 `next build --webpack`
- **D-06**: 构建缓存 — 启用 Docker BuildKit 缓存挂载（`--mount=type=cache`）加速 npm install 和 next build
- **D-07**: next.config.ts — 配置 `output: 'standalone'` 以优化 Docker 镜像大小（DOCK-08）

### 环境配置
- **D-08**: 环境定位 — 纯开发/测试环境。不追求生产级安全加固，可包含调试工具和详细日志
- **D-09**: .env.docker — 完整环境变量模板，必需变量填默认值，可选变量（LLM API keys、Google OAuth）填占位符
- **D-10**: Volume 持久化 — 最小持久化：PostgreSQL 用 named volume（pgdata），上传文件用 bind mount（./data/uploads → /app/data/uploads）
- **D-11**: AUTH_URL — Docker 环境中需要显式设置 `AUTH_URL=http://localhost:3000`（Auth.js v5 在非 localhost 环境需要）

### Claude's Discretion
- Alpine 系统依赖的具体安装方式（build-base、python3 等，按需添加）
- Dockerfile 的具体层结构和缓存挂载细节
- entrypoint 脚本的重试逻辑和超时时间
- docker-compose.yml 中的端口映射、健康检查间隔
- .dockerignore 的具体排除列表（node_modules、.git、.planning、.next 等）
- Docker Compose 服务名称和网络配置

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § Docker 容器化 — DOCK-01~08
- `.planning/REQUIREMENTS.md` § 测试基础设施 — TINF-06（Drizzle 迁移文件包含 v1.1/v1.2 表结构）
- `.planning/ROADMAP.md` § Phase 11 — 阶段目标、需求和成功标准

### 项目上下文
- `.planning/PROJECT.md` — 项目愿景、技术栈（Next.js 16、Drizzle ORM、Auth.js v5、unstorage）
- `.planning/STATE.md` § Blockers/Concerns — 已知风险（Turbopack standalone bug、AUTH_URL、Alpine 兼容性、drizzle-kit devDependency）

### 现有代码
- `next.config.ts` — 需要添加 `output: 'standalone'` 配置
- `drizzle.config.ts` — Drizzle Kit 配置，schema 路径和迁移输出目录
- `src/lib/db/schema.ts` — 完整数据库 schema（v1.0-v1.2 所有表）
- `src/lib/storage/provider.ts` — unstorage 配置，默认路径 `./data/uploads`，env 驱动
- `.env.example` — 现有环境变量模板（DATABASE_URL、AUTH_SECRET、LLM keys、STORAGE_*

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.env.example` — 现有环境变量模板，.env.docker 可基于此扩展
- `drizzle.config.ts` — 已有 Drizzle 配置，schema 指向 `src/lib/db/schema.ts`
- `src/lib/db/schema.ts` — 完整的数据库表定义（users、sessions、accounts、conversations、messages、auditLogs、agents、workflows、tasks、agentMessages、files、conversationFiles）

### Established Patterns
- Drizzle ORM + PostgreSQL — 所有数据库操作使用 Drizzle
- unstorage 存储层 — env 驱动（`STORAGE_DRIVER`、`STORAGE_LOCAL_PATH`），默认本地文件系统
- Auth.js v5 — JWT 会话策略，需要 AUTH_SECRET 和 AUTH_URL

### Integration Points
- `next.config.ts` — 添加 `output: 'standalone'`
- `drizzle/` 目录 — 重新生成迁移文件（当前只有 0000_breezy_rhino.sql，缺少 v1.1/v1.2 表）
- Dockerfile — 新建多阶段构建文件
- `docker-compose.yml` — 新建，定义 PostgreSQL + Next.js 服务
- entrypoint 脚本 — 新建，等待 PostgreSQL + 执行 drizzle-kit migrate
- `.env.docker` — 新建，完整环境变量模板
- `.dockerignore` — 新建

### Known Issues (from STATE.md)
- Drizzle 迁移 SQL 过时 — 只有 v1.0 表，必须重新生成
- Turbopack standalone 可能有 bug — 先尝试，失败再 --webpack
- Auth.js v5 in Docker — 需要显式 AUTH_URL
- unpdf/exceljs 可能需要 Alpine 系统库
- drizzle-kit 是 devDependency — 不在 standalone 输出中

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-docker-environment*
*Context gathered: 2026-03-27*
