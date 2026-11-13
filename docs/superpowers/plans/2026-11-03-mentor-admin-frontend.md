# 管理端前端实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `mentor-web` 中用现有技术栈交付高校创新创业中心管理端的完整前端，覆盖二级学院管理员、双创学院管理员与超级管理员的全部管理业务。

**Architecture:** 文件路由薄壳 + 按业务域拆分的 `features/`；统一 `apiFetch` 处理响应外壳、令牌刷新、错误与 blob；TanStack Query 管理服务端状态；antd 6 提供控件与表格，Tailwind v4 负责布局；权限码驱动菜单与按钮；RHF + zod 负责表单。

**Tech Stack:** React 19.3、TypeScript 7.0、Vite 8.3、TanStack Router 1.170、TanStack Query 5.105、antd 6.6、Tailwind CSS 4.3、react-hook-form 7.91、zod 4.6、@hookform/resolvers 7.0、Vitest（新增，仅纯逻辑测试）。

**Spec:** `docs/superpowers/specs/2026-11-03-mentor-admin-design.md`

## Global Constraints

- 后端地址 `http://localhost:3001`，开发端口必须是 `5173`（CORS 白名单）。
- 所有 JSON 响应是 `{ code, message, data, traceId }`；`code !== 0` 即失败。
- 大整数 ID 用字符串；时间用 ISO 8601 UTC；日期用 `YYYY-MM-DD`。
- 分页 `page` 从 1 开始，`pageSize` 最大 100。
- 不新增运行时依赖；测试依赖仅 `vitest`。
- 中文文案；状态文案严格按 spec 第 6 节。
- 权限码来自 `GET /auth/profile`；禁止按角色名判断。
- 不引入图表库；不引入 Google Fonts。
- 每个任务结束时 `pnpm build` 必须通过；涉及纯逻辑的任务同时 `pnpm test` 通过。

## Review Focus

- 令牌在请求途中过期：并发请求只能触发一次 refresh，失败后统一跳登录，不能出现半登录状态。
- 后端 `code !== 0` 但 HTTP 200：必须按失败处理并展示 `message`，不能当成功。
- 审核意见为空：`approve` 与 `reject` 都必须在客户端拦截（后端也会 400）。
- 统计时间参数：`period` 与 `from/to` 同时传会 400，UI 必须二选一。
- 文件预览/下载：`<a href>` 不带 Authorization，必须用 fetch + blob。
- 空数据与无权限：空列表不能显示“加载失败”；无权限不能闪现页面再跳 403。

---

### Task 1: 基础工程、设计令牌与 Provider

**Files:**
- Modify: `package.json`（加 `test` 脚本与 `vitest`）
- Modify: `src/index.css`（替换脚手架样式为设计令牌 + reset 补充）
- Modify: `src/main.tsx`（QueryClientProvider、ConfigProvider、AuthProvider、RouterProvider）
- Create: `src/lib/query/client.ts`
- Create: `src/theme.ts`
- Create: `src/vitest.config.ts`（或 `vite.config.ts` 内 `test` 配置）
- Test: `src/lib/query/client.test.ts`（占位，Task 2 填充）

**Interfaces:**
- Produces: `createQueryClient(): QueryClient`；`antdTheme: ThemeConfig`。

- [ ] 安装 `vitest`，加 `"test": "vitest run"`。
- [ ] `index.css` 定义 spec 5.1 的颜色、字体、间距令牌；保留 `@import "tailwindcss";`；移除脚手架 `#root` 固定宽度、`h1` 56px 等营销页样式。
- [ ] `theme.ts` 导出 antd `ThemeConfig`：`colorPrimary #0369A1`、`colorSuccess #0D9488`、`colorWarning #D97706`、`colorError #DC2626`、`borderRadius 6`、`fontSize 14`、`fontFamily` 用系统中文栈。
- [ ] `main.tsx` 用 `ConfigProvider locale={zhCN} theme={antdTheme}` 包裹 `<App>`（antd App 提供 message/modal 上下文）、`QueryClientProvider`、`AuthProvider`、`RouterProvider`。
- [ ] `pnpm build` 通过。

### Task 2: API 客户端、类型与错误模型

**Files:**
- Create: `src/lib/api/types.ts`
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/endpoints/{auth,applications,mentors,appointments,assessments,stats,archives,studentAchievements,messages,system}.ts`
- Test: `src/lib/api/client.test.ts`
- Test: `src/lib/api/types.test.ts`（类型层面由 tsc 覆盖，测试文件可省略）

**Interfaces:**
- Produces:
  - `class ApiError extends Error { code: number; fields?: FieldError[]; traceId?: string; httpStatus: number }`
  - `apiFetch<T>(path: string, init?: ApiRequestInit): Promise<T>`
  - `apiBlob(path: string): Promise<{ blob: Blob; filename?: string }>`
  - `setTokens(tokens: AuthTokens | null): void` / `getAccessToken(): string | null`
  - 各域接口函数（如 `listApplications(params)`, `getApplication(id)`, `collegeReview(id, body)`）。

- [ ] 定义 `ApiEnvelope<T>`、`ApiError`、`FieldError`、`Page<T>`、认证与各业务 DTO（字段按 openapi + 后端 DTO 源码，注意 `CollegeReviewDto` 在申请域是 `decision+comment`，在考核域是 `grade+comment`，用两个类型名区分）。
- [ ] `apiFetch`：拼 base URL（`import.meta.env.VITE_API_BASE ?? 'http://localhost:3001'`）、附 Bearer、到期前 60s 单飞刷新、`code!==0` 抛 `ApiError`、`10002/20104` 清令牌并派发 `auth:expired` 事件、网络错误包装为 `ApiError`。
- [ ] `apiBlob`：同样鉴权与刷新；从 `Content-Disposition` 解析 RFC 5987 文件名。
- [ ] 测试：成功外壳、`code!==0`、`data.fields`、401 清令牌、并发刷新只调用一次 refresh（mock `fetch`）。
- [ ] `pnpm test` 与 `pnpm build` 通过。

### Task 3: 认证、登录页与路由守卫

**Files:**
- Create: `src/lib/auth/token-store.ts`
- Create: `src/lib/auth/AuthProvider.tsx`
- Create: `src/lib/auth/permissions.ts`
- Create: `src/routes/login.tsx`
- Create: `src/routes/_app.tsx`
- Modify: `src/routes/__root.tsx`（只保留 `<Outlet/>`，Provider 在 main.tsx）
- Test: `src/lib/auth/permissions.test.ts`

**Interfaces:**
- Consumes: `apiFetch`, auth endpoints。
- Produces:
  - `useAuth(): { user: User | null; permissions: string[]; loading: boolean; isSuperAdmin: boolean; can(code: string): boolean; login(username, password): Promise<void>; logout(): Promise<void> }`
  - `hasPermission(permissions, code, isSuperAdmin): boolean`
  - `_app` 路由 `beforeLoad`：无 token → `redirect({ to: '/login' })`。

- [ ] `token-store` 读写 localStorage，`expiresAt = Date.now() + expiresIn*1000`。
- [ ] `AuthProvider` 启动时有 token 则拉 profile；监听 `auth:expired` 清状态并跳登录；`login` 后拉 profile。
- [ ] 登录页：居中卡片、系统名、用户名/密码、RHF+zod、错误展示（`20101/20102/20103`）、锁定倒计时提示、loading。
- [ ] `_app` 守卫 + `<Outlet/>`；未登录访问任意页面跳 `/login`。
- [ ] 测试 `hasPermission`：超管全通过、普通用户按码、未知码 false。
- [ ] `pnpm build` 通过。

### Task 4: 应用外壳与权限导航

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/nav-items.tsx`
- Create: `src/components/PermissionGuard.tsx`
- Create: `src/components/ErrorState.tsx`
- Modify: `src/routes/_app.tsx`（渲染 AppShell）
- Create: `src/routes/_app.index.tsx`（工作台占位）

**Interfaces:**
- Produces: `<AppShell>` 含侧栏、顶栏、面包屑、消息未读、用户下拉（个人中心/退出）、收起；`<PermissionGuard code="...">`；`navItems(permissions, isSuperAdmin)` 返回 antd Menu items。

- [ ] 侧栏分组：工作台 / 业务（入驻审核、导师资源库、预约管理、考核管理）/ 分析（统计分析、归档管理、学生成果）/ 协同（消息中心）/ 系统（配置、用户、角色、权限、部门、字典、日志、文件）。
- [ ] 按权限过滤菜单；超管显示系统管理全部。
- [ ] 顶栏消息未读角标（`GET /messages?page=1&pageSize=1` 的 `unread`，30s 轮询或路由切换刷新）。
- [ ] 响应式：<1024 默认收起，<768 用 Drawer。
- [ ] `pnpm build` 通过。

### Task 5: 通用业务组件

**Files:**
- Create: `src/components/PageHeader.tsx`
- Create: `src/components/FilterBar.tsx`
- Create: `src/components/DataTable.tsx`
- Create: `src/components/StatusTag.tsx`
- Create: `src/components/EnumSelect.tsx`
- Create: `src/components/FilePreview.tsx`
- Create: `src/components/StatCard.tsx`
- Create: `src/components/ConfirmAction.tsx`
- Create: `src/components/FormField.tsx`（RHF + antd 的受控包装）
- Create: `src/lib/enums.ts`
- Create: `src/lib/format.ts`
- Create: `src/lib/forms.ts`（`applyApiFieldErrors`）
- Test: `src/lib/enums.test.ts`, `src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `<DataTable<T> data loading total page pageSize onPageChange columns emptyText />`
  - `<StatusTag kind="application" value={2} />`（kind 覆盖 application/profile/appointment/assessment/appeal/message）
  - `<EnumSelect kind="..." />`
  - `formatDateTime(iso)`, `formatDate(iso)`, `formatFileSize(n)`, `parseContentDisposition(header)`
  - `applyApiFieldErrors(error, setError)`。

- [ ] 枚举文案与颜色集中在 `enums.ts`，测试覆盖每个 kind 的已知值与未知值回退。
- [ ] `DataTable` 统一 `rowKey="id"`、分页、`scroll={{ x: 'max-content' }}`、空态。
- [ ] `FilePreview` 支持 `image/*` 与 `application/pdf`，用 `apiBlob` 取对象 URL，关闭时 `revokeObjectURL`。
- [ ] `pnpm test` 与 `pnpm build` 通过。

### Task 6: 工作台

**Files:**
- Create: `src/features/dashboard/DashboardPage.tsx`
- Modify: `src/routes/_app.index.tsx`
- Create: `src/features/dashboard/queries.ts`

**Interfaces:**
- Consumes: `GET /work-progress`、`GET /mentor-applications?status=2|4&pageSize=5`、`GET /messages?pageSize=5`、`GET /stats/assessments?period=<current>`。

- [ ] 四个统计卡：导师总数、待确认预约、逾期未填记录、待处理考核。
- [ ] 待办区：按角色展示“待我审核”的申请（college→status 2，sc→status 4）；无权限则隐藏。
- [ ] 导师进度表（前 10）与最近消息。
- [ ] 空态与加载骨架。
- [ ] `pnpm build` 通过。

### Task 7: 入驻审核

**Files:**
- Create: `src/features/applications/queries.ts`
- Create: `src/features/applications/ApplicationsPage.tsx`
- Create: `src/features/applications/ApplicationDetailPage.tsx`
- Create: `src/features/applications/ReviewModal.tsx`
- Create: `src/features/applications/MaterialsPanel.tsx`
- Create: `src/routes/_app.applications.index.tsx`
- Create: `src/routes/_app.applications.$id.tsx`

**Interfaces:**
- Consumes: `listApplications({page,pageSize,status?,type?})`, `getApplication(id)`, `collegeReview(id,{decision,comment})`, `scReview(...)`, `listMaterials(id)`, `previewMaterial`, `downloadMaterial`。
- Produces: 列表与详情页。

- [ ] 列表：状态/类型筛选、分页、类型标签、状态标签、提交时间、申请人 ID（可匹配导师名则补充）。
- [ ] 详情：快照 7 字段、类型、状态、两级审核记录时间线、材料列表（预览/下载）。
- [ ] 审核按钮：college 仅 `mentor-application:review-college` 且 status=2/5；sc 仅 `review-sc` 且 status=4。
- [ ] 审核弹窗：decision 单选 + comment 必填 1–500；成功后失效查询并返回列表/刷新详情；409 刷新并展示 message。
- [ ] `pnpm build` 通过。

### Task 8: 导师资源库与后台改档

**Files:**
- Create: `src/features/mentors/queries.ts`
- Create: `src/features/mentors/MentorsPage.tsx`
- Create: `src/features/mentors/MentorDetailPage.tsx`
- Create: `src/features/mentors/EditProfileModal.tsx`
- Create: `src/routes/_app.mentors.index.tsx`
- Create: `src/routes/_app.mentors.$id.tsx`

**Interfaces:**
- Consumes: `searchMentors({page,pageSize,name,mentorType,researchField,professionalTitle,deptId,keyword})`, `getMentor(id)`, `adminUpdateProfile(id, body)`, `getWorkbench(mentorId)`, `listDepts()`。

- [ ] 列表：姓名/类型/方向/职称/部门筛选；卡片或表格切换（默认表格）；显示已生效导师。
- [ ] 详情：基本信息、研究方向、简介、成果、指导经历、合作单位/社会任职（外校）、联系电话；工作台摘要（预约/评价/考核/归档）。
- [ ] 后台改档：仅 `mentor:admin-update`；7 字段增量；内校隐藏 affiliateOrg/socialRoles；成功提示“修改已留痕”。
- [ ] `pnpm build` 通过。

### Task 9: 预约管理

**Files:**
- Create: `src/features/appointments/queries.ts`
- Create: `src/features/appointments/AppointmentsPage.tsx`
- Create: `src/features/appointments/AppointmentDetailPage.tsx`
- Create: `src/features/appointments/AdjudicateModal.tsx`
- Create: `src/routes/_app.appointments.index.tsx`
- Create: `src/routes/_app.appointments.$id.tsx`

**Interfaces:**
- Consumes: `listAppointments({page,pageSize,status?,type?})`, `getAppointment(id)`, `adjudicateAppointment(id,{comment})`。

- [ ] 列表：状态/类型筛选、学生与导师姓名、主题、期望时间、方式、状态。
- [ ] 详情：预约信息、学生信息、导师信息、处理意见/拒绝原因/异议原因/复核意见、关联记录与材料（只读）。
- [ ] 复核弹窗：仅 status=5 且 `appointment:adjudicate`；意见必填 1–500；成功刷新。
- [ ] `pnpm build` 通过。

### Task 10: 考核管理

**Files:**
- Create: `src/features/assessments/queries.ts`
- Create: `src/features/assessments/AssessmentsPage.tsx`
- Create: `src/features/assessments/AssessmentDetailPage.tsx`
- Create: `src/features/assessments/CreateAssessmentModal.tsx`
- Create: `src/features/assessments/CollegeReviewModal.tsx`
- Create: `src/features/assessments/FinalReviewModal.tsx`
- Create: `src/features/assessments/AppealsPanel.tsx`
- Create: `src/routes/_app.assessments.index.tsx`
- Create: `src/routes/_app.assessments.$id.tsx`

**Interfaces:**
- Consumes: `listAssessments({page,pageSize,period?,status?,grade?})`, `getAssessment(id)`, `createAssessment({mentorId,period})`, `assessmentCollegeReview(id,{grade,comment})`, `finalReview(id,{decision,grade?,comment})`, `listAppeals(id)`, `handleAppeal(id,appealId,{decision,reply})`, `searchMentors`。

- [ ] 列表：学期（默认当前 `YYYY-S`）、状态、等级筛选；导师名通过 `/mentors` 映射；新建仅 `assessment:evaluate`。
- [ ] 新建：导师选择（已生效）、学期选择（`YYYY-1/2`）。
- [ ] 详情：指标（评价均值/次数、指导次数/时长、学生数、成果数、综合分）、权重、初评/终评记录、申诉列表。
- [ ] 初评弹窗：grade 1–3 + comment 1–1000；终评：approve 必填 grade、return 必填 comment。
- [ ] 申诉处理：accept/reject + reply；仅 `assessment:appeal-handle`。
- [ ] `pnpm build` 通过。

### Task 11: 评分规则

**Files:**
- Create: `src/features/assessments/RulesPage.tsx`
- Create: `src/routes/_app.assessments.rules.tsx`

**Interfaces:**
- Consumes: `getAssessmentRules()`, `updateAssessmentRules({weights:{review,workload,achievement},targets:{workload,achievement}})`。

- [ ] 展示当前权重与目标值、归一化提示。
- [ ] 表单校验：三项 ≥0 且和 >0；目标值 >0；保存后失效规则查询。
- [ ] 仅 `assessment:rule-manage` 可编辑，否则只读。
- [ ] `pnpm build` 通过。

### Task 12: 统计分析

**Files:**
- Create: `src/features/stats/queries.ts`
- Create: `src/features/stats/StatsPage.tsx`
- Create: `src/features/stats/StatsFilters.tsx`
- Create: `src/features/stats/DistributionBar.tsx`
- Create: `src/routes/_app.stats.tsx`
- Test: `src/features/stats/query-params.test.ts`（period 与 from/to 互斥）

**Interfaces:**
- Consumes: `statsMentors/statsAppointments/statsGuidance/statsAssessments`, `exportStats(kind, params)`。
- Produces: `buildStatsParams(state): {period?} | {from?,to?}`；四个 Tab。

- [ ] Tab：导师资源库、预约情况、指导工作、考核分布；按权限显示 Tab。
- [ ] 时间筛选二选一（Segmented：学期 / 日期区间），互斥；`sc_admin` 才显示部门筛选。
- [ ] 指标卡 + 分布条（CSS）+ 下钻列表；空数据显示 0 与空态。
- [ ] 导出按钮：blob 下载，文件名解析；失败 message。
- [ ] `pnpm test` 与 `pnpm build` 通过。

### Task 13: 归档管理

**Files:**
- Create: `src/features/archives/queries.ts`
- Create: `src/features/archives/ArchivesPage.tsx`
- Create: `src/features/archives/ArchiveDetailDrawer.tsx`
- Create: `src/features/archives/ArchiveFormModal.tsx`
- Create: `src/routes/_app.archives.index.tsx`

**Interfaces:**
- Consumes: `listArchives({page,pageSize,mentorId?,deptId?,category?,targetType?,from?,to?})`, `getArchive(id)`, `createArchive(body)`, `updateArchive(id,body)`, `deleteArchive(id)`, `purgeArchives()`。

- [ ] 列表：导师 ID、部门、类别、目标类型、时间段筛选；核心/非核心标签、保存期限。
- [ ] 详情抽屉；新建/编辑仅 `archive:manage`；取消归档二次确认；清理过期需确认并展示结果。
- [ ] `pnpm build` 通过。

### Task 14: 学生成果

**Files:**
- Create: `src/features/student-achievements/queries.ts`
- Create: `src/features/student-achievements/StudentAchievementsPage.tsx`
- Create: `src/features/student-achievements/StudentAchievementFormModal.tsx`
- Create: `src/features/student-achievements/LinkMentorModal.tsx`
- Create: `src/routes/_app.student-achievements.tsx`

**Interfaces:**
- Consumes: `listStudentAchievements({page,pageSize,studentPersonId?,mentorId?,type?,year?,linked?})`, `createStudentAchievement(body)`, `linkStudentAchievement(id,{mentorProfileId})`, `deleteStudentAchievement(id)`, `searchMentors`。

- [ ] 列表：学生 ID、导师、类型、年份、是否关联筛选。
- [ ] 登记/关联/删除仅 `student-achievement:manage`（college_admin）；sc_admin 只读。
- [ ] 关联弹窗选择已生效导师；重复关联 409 展示 message。
- [ ] `pnpm build` 通过。

### Task 15: 消息中心

**Files:**
- Create: `src/features/messages/queries.ts`
- Create: `src/features/messages/MessagesPage.tsx`
- Create: `src/routes/_app.messages.tsx`

**Interfaces:**
- Consumes: `listMessages({page,pageSize,read?,type?})`, `markMessageRead(id)`, `markAllRead()`。

- [ ] 列表/时间线：类型、标题、正文、时间、已读状态；未读高亮。
- [ ] 单条已读、全部已读；成功后失效消息与顶栏未读。
- [ ] 空态与分页。
- [ ] `pnpm build` 通过。

### Task 16: 系统管理

**Files:**
- Create: `src/features/system/queries.ts`
- Create: `src/features/system/ConfigsPage.tsx`
- Create: `src/features/system/UsersPage.tsx`
- Create: `src/features/system/RolesPage.tsx`
- Create: `src/features/system/PermissionsPage.tsx`
- Create: `src/features/system/DeptsPage.tsx`
- Create: `src/features/system/DictsPage.tsx`
- Create: `src/features/system/OpLogsPage.tsx`
- Create: `src/features/system/FilesPage.tsx`
- Create: `src/routes/_app.system.configs.tsx`（以及 users/roles/permissions/depts/dicts/oplogs/files）
- Create: `src/features/system/shared.ts`（表格列与通用弹窗）

**Interfaces:**
- Consumes: 系统域全部接口；`listDepts` 用于部门选择。

- [ ] 配置：分页/筛选、增删改、值类型（string/number/boolean/json）校验。
- [ ] 用户：分页/筛选、详情、建号（建号+绑角色）、启停、重置密码、分配角色。
- [ ] 角色：分页、增删改、启停、权限分配（Tree 勾选，全量覆盖）。
- [ ] 权限：树、增删改（DIR/MENU/BUTTON）。
- [ ] 部门：只读树。
- [ ] 字典：类型与字典项两级管理。
- [ ] 操作日志：分页/筛选、详情 Drawer（before/after JSON）。
- [ ] 文件：分页/筛选、预览/下载/删除。
- [ ] 仅超管可见 user/role/permission/dept/dict/oplog；`config:list` 可见配置；`file:list` 可见文件。
- [ ] `pnpm build` 通过。

### Task 17: 个人中心、全局打磨与验收

**Files:**
- Create: `src/features/profile/ProfilePage.tsx`
- Create: `src/routes/_app.profile.tsx`
- Modify: 全局样式、各页面细节
- Create: `docs/superpowers/specs/2026-11-03-mentor-admin-design.md`（已存在）
- Create: `README.md`（运行说明，可选）

**Interfaces:**
- Consumes: `GET /auth/profile`, `PUT /auth/password`。

- [ ] 个人中心：账号信息、权限码列表、修改密码（旧/新/确认；20105 挂原密码）。
- [ ] 全局检查：空态、loading、403、404、错误重试、键盘焦点、`prefers-reduced-motion`。
- [ ] 响应式检查：1280 / 1024 / 768。
- [ ] `pnpm test`、`pnpm build` 通过。
- [ ] 用 `sc_admin` / `cs_admin` 登录，逐页打开；用真实 API 冒烟：工作台、申请列表、导师列表、预约列表、考核列表、统计四个 Tab、归档、学生成果、消息、配置、文件。
- [ ] 记录已知缺口（申请人姓名、未生效档案查询）到 spec 第 10 节。

---

## 实现状态（2026-11-03）

Task 1–17 已全部实现。

验证结果：

- `pnpm test`：5 个测试文件、34 个用例通过。
- `pnpm build`：`tsc -b` + `vite build` 通过。
- 真实登录冒烟：`sc_admin`、`cs_admin`、`admin` 三种账号均能登录并进入工作台。
- 页面冒烟：工作台、入驻审核、导师资源库/详情、预约、考核、统计、归档、学生成果、消息、系统配置、文件、个人中心，以及超管的用户/角色/权限/部门/字典/日志页面，均通过 headless Chrome 渲染检查。
- 权限冒烟：`sc_admin` 看不到用户管理等超管菜单，直接访问显示 403；`cs_admin` 看不到系统配置与学生成果管理按钮。
- 交互冒烟：统计 Tab 切换、归档详情抽屉、导师列表、系统配置列表均正常；控制台 0 error / 0 exception。
- 已知限制见 `README.md` 与设计文档第 10 节。
