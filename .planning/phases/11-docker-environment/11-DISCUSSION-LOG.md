# Phase 11: Docker Environment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 11-docker-environment
**Areas discussed:** 迁移策略, 基础镜像选择, 构建与优化, 环境定位与配置

---

## 迁移策略

### Q: 容器内如何执行数据库迁移？

| Option | Description | Selected |
|--------|-------------|----------|
| 独立 drizzle-kit 层 (Recommended) | Dockerfile 中单独安装 drizzle-kit 作为迁移工具，entrypoint 调用 drizzle-kit migrate。工具独立于应用，职责清晰。 | ✓ |
| 应用内嵌迁移 | 应用启动代码中用 drizzle-orm/migrate 直接读 SQL 文件执行。不需要额外安装 drizzle-kit，但需要在应用代码中嵌入迁移逻辑。 | |
| db:push 方式 | 直接用 drizzle-kit push，不需要迁移文件。最简单但不是标准迁移流程。 | |

**User's choice:** 独立 drizzle-kit 层

### Q: 迁移文件过时问题如何处理？

| Option | Description | Selected |
|--------|-------------|----------|
| 重新生成迁移 (Recommended) | 执行 drizzle-kit generate 重新生成迁移文件，删除旧的 0000 迁移，从空数据库开始创建所有表。 | ✓ |
| 增量追加迁移 | 保留现有 0000 迁移，在其后追加新的迁移文件。兼容已有数据库。 | |

**User's choice:** 重新生成迁移

---

## 基础镜像选择

### Q: 基础镜像选择？

| Option | Description | Selected |
|--------|-------------|----------|
| Alpine 优先 (Recommended) | Node 22-alpine，镜像更小（~50MB vs ~180MB），可能需要额外安装编译依赖。 | ✓ |
| Debian slim | Node 22-slim (Debian)，glibc 兼容性好，native modules 开箱即用，但镜像稍大。 | |

**User's choice:** Alpine 优先，遇到问题再处理

---

## 构建与优化

### Q: 构建方式？

| Option | Description | Selected |
|--------|-------------|----------|
| 先试 Turbopack，失败再回退 (Recommended) | 先尝试 next build（Turbopack 默认），如果 standalone 输出正常则使用。失败再回退到 --webpack。 | ✓ |
| 直接用 --webpack | 直接用 next build --webpack 构建。已知可用但不是推荐方式。 | |
| 只用 Turbopack | 只使用 Turbopack 构建。如果失败则作为 bug 修复处理。 | |

**User's choice:** 先试 Turbopack，失败再回退

### Q: 是否启用 Docker BuildKit 构建缓存？

| Option | Description | Selected |
|--------|-------------|----------|
| 启用构建缓存 (Recommended) | 使用 Docker BuildKit 缓存挂载（--mount=type=cache）加速 npm install 和 next build。 | ✓ |
| 标准构建 | 标准多阶段构建，不使用缓存挂载。简单可靠但每次全量构建。 | |

**User's choice:** 启用构建缓存

---

## 环境定位与配置

### Q: Docker 环境的目标定位？

| Option | Description | Selected |
|--------|-------------|----------|
| 开发/测试环境 (Recommended) | 纯开发/测试环境，不追求生产级优化，可包含调试工具和详细日志。 | ✓ |
| 接近生产环境 | 接近生产配置，包含安全加固、日志级别控制、性能优化。 | |

**User's choice:** 开发/测试环境

### Q: Volume 持久化范围？

| Option | Description | Selected |
|--------|-------------|----------|
| 最小持久化 (Recommended) | PostgreSQL 数据（named volume）+ 上传文件（bind mount）。 | ✓ |
| 包含迁移日志 | PostgreSQL + 上传文件 + Drizzle 日志。 | |

**User's choice:** 最小持久化

### Q: .env.docker 的内容范围？

| Option | Description | Selected |
|--------|-------------|----------|
| 完整模板 + 占位符 (Recommended) | 包含所有必需和可选变量，LLM keys 填占位符。 | ✓ |
| 最小必需变量 | 只包含 DATABASE_URL 和 AUTH_SECRET。 | |

**User's choice:** 完整模板 + 占位符

### Q: Volume 类型选择？

| Option | Description | Selected |
|--------|-------------|----------|
| Named volume + bind mount (Recommended) | PostgreSQL 用 named volume（pgdata），上传目录用 bind mount（./data/uploads）。 | ✓ |
| 全部 named volume | 所有持久化数据都用 named volume。 | |

**User's choice:** Named volume + bind mount

---

## Claude's Discretion

- Alpine 系统依赖的具体安装方式
- Dockerfile 层结构和缓存挂载细节
- entrypoint 脚本的重试逻辑和超时
- docker-compose.yml 端口映射和健康检查
- .dockerignore 排除列表
- Docker Compose 服务名称和网络配置

## Deferred Ideas

None
