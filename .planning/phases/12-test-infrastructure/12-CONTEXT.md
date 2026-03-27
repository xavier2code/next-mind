# Phase 12: Test Infrastructure - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

E2E 测试可在 Docker 环境中运行，具备认证会话复用、LLM 响应 mock、测试数据初始化能力。这是纯基础设施层 — 不写具体业务测试（Phase 13 负责），只搭建让测试能跑起来的机制。

</domain>

<decisions>
## Implementation Decisions

### 认证 Fixture 策略
- **D-01:** storageState 复用 — 全局 setup 一次性通过 credentials API 登录，保存 cookie/storageState 到文件，每个测试用例复用。Playwright 官方推荐模式，每测试套件只登录一次
- **D-02:** 测试用户创建方式 — seed 脚本（db:seed）创建测试用户到数据库，auth fixture 通过 `/api/auth/callback/credentials` 登录获取 session。标准流程，测到完整认证链路
- **D-03:** 用户角色 — 单一标准测试用户。简单，覆盖绝大多数场景。多用户场景需要时再加

### LLM Mock 粒度
- **D-04:** Mock 机制 — Playwright `route.fulfill` 拦截 `/api/chat` 请求，返回预构造的流式响应。不修改业务代码，TINF-03 要求的方式
- **D-05:** 响应格式 — 单次完整文本响应，模拟流式 chunked 传输。简单可靠，覆盖聊天功能测试足够
- **D-06:** 场景覆盖 — Phase 12 只提供成功响应 mock（通用 `mockLLMResponse()` fixture）。错误、超时等场景在 Phase 13 按需扩展

### Seed 数据范围
- **D-07:** 数据范围 — 最小化，只创建一个测试用户（邮箱 + 密码 hash）。测试数据由具体测试自行创建和清理，seed 依赖少、维护简单
- **D-08:** 执行方式 — `npm run db:seed`，与现有 `db:generate`/`db:migrate`/`db:push` 风格一致。内部调用 Drizzle 插入用户记录。可手动执行或在 Docker 环境中按需运行

### Health 端点
- **D-09:** 响应内容 — 详细状态检查：DB 连通（`SELECT 1`）+ 应用状态 + timestamp，返回 JSON `{ status, db, timestamp }`。Docker healthcheck 和调试都用得上
- **D-10:** 认证 — 不需要认证，公开端点。Docker healthcheck 可直接调用，安全风险低（只返回连接状态，无敏感数据）

### Claude's Discretion
- Playwright config 的具体 webServer 配置（Docker vs 本地如何切换）
- storageState 文件的存储路径和命名
- mock 流式响应的具体 chunked 编码方式
- seed 脚本中测试用户的邮箱/密码具体值
- health 端点的 HTTP 状态码选择（200 vs 503）

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 需求定义
- `.planning/REQUIREMENTS.md` § 测试基础设施 — TINF-01~05（Playwright 配置、auth fixture、LLM mock、seed 脚本、health 端点）
- `.planning/ROADMAP.md` § Phase 12 — 阶段目标、需求映射和成功标准

### 项目上下文
- `.planning/PROJECT.md` — 技术栈（Next.js 16、Drizzle ORM、Auth.js v5、Playwright）
- `.planning/phases/11-docker-environment/11-CONTEXT.md` — Docker 环境配置（docker-compose 服务结构、entrypoint、env）

### 现有代码
- `playwright.config.ts` — 当前 Playwright 配置，硬编码 baseURL，需改为 env 驱动
- `src/auth.ts` — Auth.js v5 配置，JWT 会话策略，credentials provider，登录路由 `/api/auth/callback/credentials`
- `docker-compose.yml` — PostgreSQL + Next.js 服务定义，已有 healthcheck
- `src/app/api/chat/route.ts` — 流式聊天 API（mock 目标）
- `src/lib/db/schema.ts` — 完整数据库 schema（users 表结构，seed 用）
- `src/lib/password.ts` — `hashPassword()` 函数（seed 创建用户需要）
- `tests/setup.ts` — Vitest 单元测试 setup 模式（参考风格）
- `e2e/auth.spec.ts` — 现有 E2E 测试示例（placeholder 级别）

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `playwright.config.ts` — 已有基础配置（testDir、reporter、projects），需修改 baseURL 和 webServer
- `src/auth.ts` — credentials provider 已实现，auth fixture 可直接调用登录 API
- `src/lib/password.ts` — `hashPassword()` 可用于 seed 脚本创建测试用户
- `docker-compose.yml` — postgres 服务带 healthcheck，app 服务带 env_file，可复用
- `e2e/` 目录 — 已有 Playwright 测试结构，可在此基础上添加 fixture

### Established Patterns
- npm scripts 命名 — `db:*` 系列（generate、migrate、push、studio），seed 脚本用 `db:seed` 保持一致
- Vitest 单元测试 setup — `tests/setup.ts` 中 mock DATABASE_URL 和 AUTH_SECRET
- Drizzle ORM — 所有数据库操作使用 Drizzle，seed 脚本也应使用
- API 路由 — `src/app/api/` 下的 Next.js App Router 路由处理函数

### Integration Points
- `playwright.config.ts` — 修改 baseURL 为 env 驱动（`PLAYWRIGHT_BASE_URL`），webServer 配置适配 Docker
- `e2e/` — 添加全局 setup（`globalSetup`）和 auth fixture
- `src/app/api/health/` — 新建 health 端点路由
- `scripts/seed.ts`（或类似路径）— 新建 seed 脚本
- `package.json` — 添加 `db:seed` script

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

*Phase: 12-test-infrastructure*
*Context gathered: 2026-03-27*
