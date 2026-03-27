# Requirements: Next-Mind v1.3 全量回归验证

**Defined:** 2026-03-27
**Core Value:** 让团队成员通过统一的对话界面，高效处理文件、管理知识、调用工具，完成80%以上的日常工作任务

## v1.3 Requirements

### Docker 容器化

- [x] **DOCK-01**: 项目包含多阶段 Dockerfile，基于 Node 22-alpine，构建产物使用 standalone 输出模式
- [x] **DOCK-02**: docker-compose.yml 定义 PostgreSQL + Next.js 两个服务，PostgreSQL 带 healthcheck
- [x] **DOCK-03**: 容器启动时自动执行 Drizzle 数据库迁移（entrypoint 脚本）
- [x] **DOCK-04**: .dockerignore 排除 node_modules、.git、.planning 等非必要文件
- [x] **DOCK-05**: .env.docker 提供容器化环境所需的完整环境变量配置
- [x] **DOCK-06**: unstorage 上传目录通过 Docker volume 持久化
- [x] **DOCK-07**: 用户可通过 `docker compose up` 一键启动完整开发/测试环境
- [x] **DOCK-08**: next.config.ts 配置 `output: 'standalone'` 以优化 Docker 镜像大小

### 测试基础设施

- [x] **TINF-01**: Playwright 配置支持通过环境变量覆盖 baseURL（Docker 环境 vs 本地）
- [x] **TINF-02**: 提供 auth fixture，支持 E2E 测试中快速获取已认证会话
- [x] **TINF-03**: LLM API 调用可被 mock（Playwright route.fulfill 或类似机制），无需真实 API key 即可运行测试
- [x] **TINF-04**: 提供 seed 脚本，可在 Docker 环境中创建测试用户和基础数据
- [x] **TINF-05**: /api/health 端点返回应用和数据库连通状态
- [x] **TINF-06**: Drizzle 迁移文件包含 v1.1 和 v1.2 的所有表结构变更

### 回归验证 — v1.0

- [ ] **V10-01**: 用户可通过 E2E 测试完成邮箱注册和登录流程
- [ ] **V10-02**: 用户可通过 E2E 测试发送聊天消息并收到流式响应（mock LLM）
- [ ] **V10-03**: MCP bash 工具可通过 E2E 测试执行允许列表内的命令
- [ ] **V10-04**: Skills 系统可通过 E2E 测试调用预定义技能并返回结果
- [ ] **V10-05**: 审批流程可通过 E2E 测试触发并完成批准/拒绝操作

### 回归验证 — v1.1

- [ ] **V11-01**: Agent 任务分解可通过 E2E 测试将复杂请求拆分为子任务
- [ ] **V11-02**: WaveScheduler 可通过测试验证依赖拓扑排序和并发控制
- [ ] **V11-03**: 工作流控制（暂停/恢复/取消）可通过 E2E 测试操作
- [ ] **V11-04**: 工作流状态持久化可通过测试验证（暂停后重启仍可恢复）
- [ ] **V11-05**: WorkflowProgress 和 AgentStatusList 可通过 E2E 测试验证实时更新

### 回归验证 — v1.2

- [ ] **V12-01**: 文件上传可通过 E2E 测试完成（小文件 formData + 大文件流式）
- [ ] **V12-02**: PDF/DOCX 内容提取可通过测试验证输出 Markdown 格式
- [ ] **V12-03**: 代码/CSV/Excel 提取器可通过测试验证输出格式
- [ ] **V12-04**: 文件管理页面可通过 E2E 测试浏览、预览、删除文件
- [ ] **V12-05**: 文件内容注入聊天可通过 E2E 测试验证（上传文件后对话包含文件内容）

### 验证报告与修复

- [ ] **RPT-01**: 产出 v1.0 验证报告，列出所有功能的 PASS/FAIL 状态
- [ ] **RPT-02**: 产出 v1.1 验证报告，列出所有功能的 PASS/FAIL 状态
- [ ] **RPT-03**: 产出 v1.2 验证报告，列出所有功能的 PASS/FAIL 状态
- [ ] **RPT-04**: 所有 FAIL 项创建对应修复任务
- [ ] **RPT-05**: 单元测试覆盖率达到合理阈值（现有测试全部通过）

## Future Requirements

Deferred to future milestones.

- Docker 镜像发布到容器仓库
- CI/CD 流水线集成（GitHub Actions）
- 性能基准测试
- 安全扫描（依赖漏洞、容器安全）

## Out of Scope

| Feature | Reason |
|---------|--------|
| 移动端测试 | Web 优先，移动适配延后 |
| 多浏览器兼容性测试 | 初期聚焦 Chromium，后续扩展 |
| 压力/负载测试 | 非当前目标 |
| Kubernetes 部署 | 初期 Docker Compose 足够 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DOCK-01 | Phase 11 | Complete |
| DOCK-02 | Phase 11 | Complete |
| DOCK-03 | Phase 11 | Complete |
| DOCK-04 | Phase 11 | Complete |
| DOCK-05 | Phase 11 | Complete |
| DOCK-06 | Phase 11 | Complete |
| DOCK-07 | Phase 11 | Complete |
| DOCK-08 | Phase 11 | Complete |
| TINF-01 | Phase 12 | Complete |
| TINF-02 | Phase 12 | Complete |
| TINF-03 | Phase 12 | Complete |
| TINF-04 | Phase 12 | Complete |
| TINF-05 | Phase 12 | Complete |
| TINF-06 | Phase 11 | Complete |
| V10-01 | Phase 13 | Pending |
| V10-02 | Phase 13 | Pending |
| V10-03 | Phase 13 | Pending |
| V10-04 | Phase 13 | Pending |
| V10-05 | Phase 13 | Pending |
| V11-01 | Phase 13 | Pending |
| V11-02 | Phase 13 | Pending |
| V11-03 | Phase 13 | Pending |
| V11-04 | Phase 13 | Pending |
| V11-05 | Phase 13 | Pending |
| V12-01 | Phase 13 | Pending |
| V12-02 | Phase 13 | Pending |
| V12-03 | Phase 13 | Pending |
| V12-04 | Phase 13 | Pending |
| V12-05 | Phase 13 | Pending |
| RPT-01 | Phase 14 | Pending |
| RPT-02 | Phase 14 | Pending |
| RPT-03 | Phase 14 | Pending |
| RPT-04 | Phase 14 | Pending |
| RPT-05 | Phase 14 | Pending |

**Coverage:**
- v1.3 requirements: 30 total
- Mapped to phases: 30/30
- Unmapped: 0

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27 after roadmap creation*
