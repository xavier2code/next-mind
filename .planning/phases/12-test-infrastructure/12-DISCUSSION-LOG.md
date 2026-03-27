# Phase 12: Test Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 12-test-infrastructure
**Areas discussed:** 认证 Fixture 策略, LLM Mock 粒度, Seed 数据范围, Health 端点深度

---

## 认证 Fixture 策略

### Q1: E2E 测试中如何获取已认证会话？

| Option | Description | Selected |
|--------|-------------|----------|
| storageState 复用 | 全局 setup 一次性登录保存 cookie，测试复用 | ✓ |
| 程序化登录 per test | beforeEach 中调用登录 API，更独立但更慢 | |
| 直接构造 JWT | 绕过登录构造 JWT，最快但不测认证流程 | |

**User's choice:** storageState 复用
**Notes:** Playwright 官方推荐模式，每测试套件只登录一次

### Q2: 测试用户怎么创建？

| Option | Description | Selected |
|--------|-------------|----------|
| Seed 脚本 + API 登录 | db:seed 创建用户，auth fixture 通过 API 登录 | ✓ |
| 注册 API 创建用户 | fixture 调用 /register 创建用户，更自包含 | |
| 直接数据库插入 | Drizzle 插入用户记录，更可靠但不测注册 | |

**User's choice:** Seed 脚本 + API 登录
**Notes:** 标准流程，测到完整认证链路

### Q3: 需要几种测试用户角色？

| Option | Description | Selected |
|--------|-------------|----------|
| 单用户 | 一个标准测试用户，简单覆盖多数场景 | ✓ |
| 两种角色 | 标准用户 + 额外用户（多用户交互测试） | |
| Claude 决定 | 根据实际需要选择 | |

**User's choice:** 单用户

---

## LLM Mock 粒度

### Q1: mock LLM 响应用哪种方式？

| Option | Description | Selected |
|--------|-------------|----------|
| Playwright route.fulfill | 浏览器层拦截 /api/chat，返回预构造流式响应 | ✓ |
| 环境变量切换 Mock 实现 | 聊天 API 内部加 mock 模式，需改业务代码 | |
| 混合方案 | route.fulfill 拦截外部 LLM API，让路由正常执行 | |

**User's choice:** Playwright route.fulfill
**Notes:** TINF-03 要求的方式，不修改业务代码

### Q2: 流式响应 mock 的具体行为？

| Option | Description | Selected |
|--------|-------------|----------|
| 单次完整响应 | mock 返回固定文本，模拟流式 chunked 传输 | ✓ |
| 模拟流式 chunk | 多个 chunk 分片到达，测前端流式渲染 | |
| 可配置场景 | helper 函数可自定义响应内容 | |

**User's choice:** 单次完整响应

### Q3: Mock 需要覆盖哪些场景？

| Option | Description | Selected |
|--------|-------------|----------|
| 只做成功响应 | Phase 12 建基础设施，Phase 13 按需扩展 | ✓ |
| 成功 + 基础错误 | 同时提供成功和错误 mock helper | |
| Claude 决定 | 根据实际需要选择 | |

**User's choice:** 只做成功响应

---

## Seed 数据范围

### Q1: seed 脚本应该创建多少测试数据？

| Option | Description | Selected |
|--------|-------------|----------|
| 最小化 | 只创建一个测试用户，测试数据由测试自行创建 | ✓ |
| 基础场景数据 | 用户 + 示例对话 + 消息 | |
| 完整场景数据 | 用户、对话、消息、工作流、文件等多种数据 | |

**User's choice:** 最小化

### Q2: seed 脚本的执行方式？

| Option | Description | Selected |
|--------|-------------|----------|
| npm run db:seed | 与现有 db:* 风格一致，可手动或 Docker 执行 | ✓ |
| Docker entrypoint 自动执行 | 容器启动自动 seed，但每次重启都执行 | |
| 两者都支持 | npm run db:seed + 环境变量控制 Docker 自动执行 | |

**User's choice:** npm run db:seed

---

## Health 端点深度

### Q1: /api/health 应该返回什么级别的信息？

| Option | Description | Selected |
|--------|-------------|----------|
| 详细状态检查 | DB 连通 + 应用状态 + timestamp | ✓ |
| 简单 OK | 只返回 { status: 'ok' } | |
| 完整组件检查 | DB + 存储 + Auth 配置等所有组件 | |

**User's choice:** 详细状态检查

### Q2: health 端点需要认证吗？

| Option | Description | Selected |
|--------|-------------|----------|
| 不需要认证 | 公开端点，Docker healthcheck 可直接调用 | ✓ |
| 需要认证 | 保护内部信息但增加 Docker 配置复杂度 | |

**User's choice:** 不需要认证

---

## Claude's Discretion

- Playwright config 的 webServer 配置细节
- storageState 文件存储路径和命名
- mock 流式响应的 chunked 编码方式
- seed 脚本中测试用户的邮箱/密码具体值
- health 端点的 HTTP 状态码选择

## Deferred Ideas

None — discussion stayed within phase scope
