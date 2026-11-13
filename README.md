# 长沙医学院 · 创新创业导师管理平台（mentor-web）

长沙医学院创新创业学院导师管理平台，面向**二级学院管理员**、**创新创业学院管理员**与**超级管理员**，覆盖入驻审核、导师资源库、预约管理、考核管理、统计分析、归档、学生成果、消息与系统管理。

后端：`mentor-back`（NestJS + Prisma），开发地址 `http://localhost:3001`。

## 技术栈

- React 19 + TypeScript 7 + Vite 8
- TanStack Router（文件路由）+ TanStack Query（服务端状态）
- antd 6（控件与表格）+ Tailwind CSS 4（布局与设计令牌）
- react-hook-form 7 + zod 4 + @hookform/resolvers
- Vitest（纯逻辑单测）

## 快速开始

```bash
pnpm install
pnpm dev        # http://localhost:5173
pnpm test       # 纯逻辑单测
pnpm build      # tsc -b && vite build
```

后端 CORS 白名单只允许 `http://localhost:5173`，请保持该端口。

### 环境变量

| 变量 | 开发默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE` | `/api` | 开发环境走 Vite 同源代理（`.env.development`），代理到 `http://localhost:3001`；生产未设置时回退 `http://localhost:3001` |

开发代理规则在 `vite.config.ts` 的 `server.proxy`：`/api/*` → `http://localhost:3001/*`。这样即使 5173 被其他项目占用、Vite 落到 5174，也不会触发后端 CORS 白名单限制。

### 开发测试账号

| 账号 | 密码 | 角色 |
| --- | --- | --- |
| `sc_admin` | `Mentor@2026` | 创新创业学院管理员（全校） |
| `cs_admin` / `fl_admin` | `Mentor@2026` | 二级学院管理员（本院） |
| `admin` | 见后端 `.env` 的 `SEED_ADMIN_PASSWORD` | 超级管理员 |

## 权限模型

- 登录后 `GET /auth/profile` 返回 `permissions: string[]` 与 `user.isSuperAdmin`。
- 菜单与按钮按权限码显隐；超级管理员视为拥有全部权限码，但仍受后端数据范围约束。
- 前端只负责隐藏无权限入口，最终校验始终在后端。
- 超级管理员采用「角色 + 标志」双写：`super_admin` 为内置角色，自动拥有全部权限；角色页标记「内置 · 全部权限」，不可停用 / 删除 / 改编码或数据范围。设置超管通过角色分配弹窗勾选 `super_admin`；用户页只保留「取消超管」入口；建号弹窗不提供该角色。变更后目标账号需重新登录。

主要权限码：

| 功能 | 权限码 |
| --- | --- |
| 入驻审核 | `mentor-application:list`、`mentor-application:review-college`、`mentor-application:review-sc` |
| 导师资源库 / 后台改档 | `mentor:search`、`mentor:admin-update` |
| 预约 / 异议复核 | `appointment:list`、`appointment:adjudicate` |
| 考核 / 终评 / 规则 / 申诉 | `assessment:list`、`assessment:evaluate`、`assessment:finalize`、`assessment:rule-manage`、`assessment:appeal-handle` |
| 统计 / 归档 / 学生成果 | `stats:*`、`archive:list`、`archive:manage`、`student-achievement:list`、`student-achievement:manage` |
| 系统配置 / 文件 | `config:*`、`file:list` |
| 定时同步 | `sync:manage`（查看/修改设置）、`sync:run`（手动触发） |
| 超管系统管理 | 用户、角色、权限、部门、字典、操作日志（仅超管可见） |

## 教师 / 导师角色

后端把同步来的教师拆成两个角色：

- `teacher`：教师身份。可以维护本人档案、提交/撤回入驻申请、检索导师、看消息；对应导师端 `/mentor` 的「导师申请」视图。
- `mentor`：**入驻审核通过后**追加的能力。在 `teacher` 之上增加时段管理、预约处理、评价/考核/归档/成果等。

前端判断始终看**权限码**，不看角色 code：

- 有 `mentor-application:submit` / `mentor:profile` → 显示「申请成为导师」与「申请记录」；
- 有 `mentor:slot-manage` 或 `appointment:handle` → 显示完整导师工作台；
- 审核通过后重新拉 `GET /auth/profile`（或点击教师工作台的「刷新账号权限」）即可获得新增权限码。

管理端的角色页 / 用户页会自动显示并允许分配 `teacher` 角色（角色列表来自 `GET /roles`）。

## 统一认证登录（SSO）

- 前端仍然只调用 `POST /auth/login`；`authSource = sso` 的账号由后端自动调用学校统一认证，前端**不需要**跳转 SSO 页面，也不保存 SSO token。
- 登录响应新增 `loginSource`、`ssoUnavailable`、`isDefaultPwd`：
  - `ssoUnavailable = true` → 顶部黄色提示条「统一认证暂不可用，已使用本地密码登录」；
  - `isDefaultPwd = true` → 顶部提示条「你仍在使用初始密码，请尽快到统一认证平台修改」；
  - 两条提示均可关闭，下一次登录成功后会按新响应重新计算。
- `GET /auth/profile` 的 `user.authSource`：
  - `sso` → 个人中心隐藏本系统「修改密码」表单，提示去统一认证平台改密；
  - `local` → 保留原有 `PUT /auth/password` 改密流程。
- 登录错误码 `20101`–`20113` 使用稳定中文文案，映射见 `src/lib/auth/messages.ts`。
- 窗口重新聚焦或每 5 分钟会重新拉取 `GET /auth/profile`，同步任务修改姓名 / 部门后能及时刷新。
- 定时同步管理页见下文「定时同步」。

## 导师端

导师账号登录后自动进入 `/mentor`。已实现：

> 导师 / 教师专属账号的侧边栏不再显示管理端「工作台」，只保留「导师服务 / 教师服务」分组，避免与「导师工作台」重复；管理员兼导师时两个工作台入口都会保留。

- `/mentor` 导师工作台：待确认 / 已确认 / 待学生确认、评价汇总、当前考核、最近消息、快捷入口
- `/mentor/profile` 我的专业档案：首次建档（按 `user.mentorType` 提前隐藏内校字段）、草稿编辑、草稿佐证上传、提交入驻申请、联系电话快捷维护（`PUT /mentor/profile/contact`，不走审核流）、已生效档案提交信息修改申请（可同时上传并挂接佐证材料）、申请记录
- `/mentor/applications`、`/mentor/applications/$id` 我的申请与详情、佐证材料上传 / 预览 / 下载 / 移除、撤回申请
- `/mentor/slots` 可指导时段：按周新增、编辑、开放 / 关闭、删除、重叠校验
- `/mentor/appointments`、`/mentor/appointments/$id` 预约处理：确认 / 拒绝 / 改期、填报 / 重填指导记录、预约 / 过程材料上传 / 预览 / 下载 / 移除
- `/mentor/records` 指导记录：`GET /mentor/records` 一次取列表，按时间 / 类型筛选，导出逐条台账 CSV
- `/assessments`、`/assessments/$id` 我的考核与考核申诉（复用管理端考核页面，按权限显示申诉入口；状态覆盖申诉中 / 已受理 / 已驳回，初评 / 终评 / 申诉处理均显示人员姓名）
- `/mentor/achievements` 双创成果：登记 / 编辑 / 删除、佐证上传 / 预览 / 下载（**入口已暂时隐藏**，路由保留，恢复时去掉 `nav-items.tsx` 中的 `hidden` 标记并恢复工作台快捷入口）
- `/mentor/reviews` 收到评价：四维汇总与评价明细
- `/mentor/stats` 指导统计：学期 / 日期筛选、按预约类型分布、统计表导出
- `/archives`、`/student-achievements`、`/messages` 我的归档、关联学生成果、消息中心（复用管理端页面，按数据范围过滤）

导师端接口缺口处理结果见 [`docs/导师端-接口缺口.md`](docs/导师端-接口缺口.md)：预约 / 过程材料与成果佐证的预览下载、指导记录列表与台账导出、建档 `mentorType`、草稿佐证上传、申请详情 403 均已补齐并接入。

> 导师端所有佐证 / 过程材料上传统一限制：图片或 PDF，单文件不超过 10 MB，单次最多 10 个；选择文件时即时校验，上传区会显示限制与当前已选数量。

> 开发库中 `T002` 是本地导师账号（密码 `Mentor@2026`），可直接用于导师端联调。`T001` / `T003` / `S001` / `S002` 是 `authSource=sso` 账号；当后端 `SSO_LOGIN_ENABLED=1` 时它们会走学校统一认证，`Mentor@2026` 不一定可用。

## 定时同步

`/system/sync`（`sc_admin` / 超管；`sync:manage` 查看与修改，`sync:run` 手动触发）：

- 查看 / 修改定时同步设置：启用开关、增量间隔、全量间隔、是否同步学生；
- 展示当前状态、下次触发时间、最近一次流水；
- 立即增量 / 全量同步，已有任务运行时按钮禁用并提示；
- 同步流水列表（`GET /sync/runs` 的 `rows` 字段），状态：运行中 / 成功 / 部分成功 / 失败；
- `studentsEnabled` 关闭时提示需要 SSO 应用具备 `edu:classes` 能力键；
- 进程重启遗留的 `RUNNING` 流水会显示黄色提示。

## 已实现页面

- `/login` 登录
- `/` 工作台（工作进度、待审核、快捷入口、最近消息、发送提醒）
- `/applications`、`/applications/$id` 入驻审核与详情（快照、两级审核、材料预览/下载）
- `/mentors`、`/mentors/$id` 导师资源库、详情、工作台、后台改档
- `/appointments`、`/appointments/$id` 预约列表、详情、指导记录、材料、异议复核
- `/assessments`、`/assessments/$id`、`/assessments/rules` 考核列表/新建、初评/终评/申诉（含申诉佐证上传 / 预览 / 下载）、评分规则
- `/stats` 导师资源库、预约情况、指导工作、考核分布（学期/日期筛选、CSV 导出）
- `/archives` 归档检索、新建/编辑/取消、附件上传 / 预览 / 下载、过期清理
- `/student-achievements` 学生成果登记、关联导师、删除；学生 / 导师均使用下拉选择，佐证支持上传 / 预览 / 下载
- `/messages` 消息中心：收件箱 / 已发送、按类型 / 已读状态筛选、单条/全部已读；`message:send` 可按角色+部门群发，超管还可指定用户精确发送（`recipientUserIds`）。收件箱、已发送、未读角标与首页最近消息每 5 秒自动刷新，已读操作采用乐观更新
- `/system/configs`、`/system/sync`、`/system/users`、`/system/roles`、`/system/permissions`、`/system/depts`、`/system/dicts`、`/system/oplogs`、`/system/files`
- `/profile` 个人中心、修改密码

## 目录结构

```
src/
  routes/                 文件路由（薄壳，守卫 + 页面装配）
  components/             通用组件（AppShell、DataTable、FormField、FilePreview 等）
  lib/
    api/client.ts         fetch 封装：统一外壳、令牌刷新（单飞）、错误、blob
    api/types.ts          后端 DTO 的前端类型
    api/endpoints/        按业务域拆分的类型化接口
    auth/                 令牌存储、AuthProvider、权限判断
    format.ts / enums.ts  时间、文件、状态文案
  features/               按业务域拆分的页面、查询与弹窗
docs/superpowers/         设计文档与实现计划
design-system/            UI UX Pro Max 生成的设计系统
```

## 设计系统

采用 UI UX Pro Max 的浅色 Minimalism & Swiss Style（variance 3 / density 8 / motion 2）：

- 主色 `#0F172A`，强调色 `#0369A1`，青绿 `#0D9488`，琥珀 `#D97706`，危险色 `#DC2626`
- 背景 `#F8FAFC`，卡片 `#FFFFFF`，边框 `#E2E8F0`
- 系统中文栈，不依赖外网字体；14px 基准、13px 表格
- 侧栏 232/64px，顶栏 56px，内容区 24px；1024 收起、768 抽屉

完整令牌见 `design-system/mentor-admin/MASTER.md` 与 `src/index.css`。

## 查询状态

所有列表页的筛选条件、分页、统计 Tab 与时间维度都写入 URL search params，例如：

- `/applications?page=2&status=4`
- `/mentors?keyword=张&mentorType=internal`
- `/stats?tab=appointments&period=2026-2`
- `/system/configs?page=2&pageSize=5&code=appointment.pending_ttl_hours`

刷新页面、复制链接或从浏览器前进/后退返回时，查询条件与当前页码保持不变。

## 常见问题

### 页面白屏，控制台出现 `504 (Outdated Optimize Dep)`

这是 Vite 的依赖预构建缓存过期（依赖或 `vite.config.ts` 变更后，旧开发服务器仍在运行）。处理：

```bash
# 停掉当前 dev server 后执行
pnpm dev:clean
```

`dev:clean` 等价于 `vite --force`，会重新预构建依赖。必要时再删除 `node_modules/.vite`。

### 端口被占用 / 登录请求被 CORS 拦截

开发环境通过 Vite 同源代理 `/api` 访问后端，因此不再受后端 CORS 白名单的端口限制。如果 5173 被其他项目（例如 `mentor-mobile`）占用，Vite 会自动使用 5174，直接打开对应地址即可。

生产环境建议前后端同源部署，或由网关把 `/api` 转发到后端；如果前后端分域部署，需要把前端域名加入后端 `CORS_ORIGINS`。

## 已知缺口

1. `GET /mentor-applications` 不返回申请人姓名，列表只展示 `applicantId`；能匹配到已生效导师时补姓名。
2. 没有“管理员查询全部档案（含未生效）”的接口，导师后台改档入口只从已生效导师库进入。
3. 统计接口 `deptId` 仅创新创业学院可用，学院管理员不展示该筛选项。
4. `sc_admin` 没有 `student-achievement:manage`，学生成果页对其只读。
5. 不引入图表库，分布图用 CSS 横向条形；颜色已按 dataviz 校验（等级色 `#0D9488 / #CA8A04 / #B91C1C`）。
6. `pnpm lint` 当前不可用：项目使用 TypeScript 7.0，而 `typescript-eslint@8.72` 尚不支持 TS 7（脚手架原有问题，与业务代码无关）。
7. `teacher` 账号需先由 SSO 同步补齐 `SyncPerson`，否则 `GET /mentor/profile` 仍会 403；处理方式见 [`docs/导师端-接口缺口.md`](docs/导师端-接口缺口.md) 第 3 节。
8. 手工归档暂不提供「指导记录」目标类型：后端没有管理员全局检索指导记录的接口。
9. 部分响应只返回 ID、没有名称快照（入驻申请申请人、归档目标、文件上传人、操作日志目标、预约时段）；前端已用可用映射补名称，无法补全的显示为「编号」，详见接口缺口文档。

文件与业务对象选择器的完整缺口记录见 [`docs/接口缺口-文件与选择器.md`](docs/接口缺口-文件与选择器.md)。

## 相关文档

- 设计：`docs/superpowers/specs/2026-11-03-mentor-admin-design.md`
- 计划：`docs/superpowers/plans/2026-11-03-mentor-admin-frontend.md`
- 导师端接口缺口：`docs/导师端-接口缺口.md`
- 文件上传与业务对象选择器缺口：`docs/接口缺口-文件与选择器.md`
- 后端接口：`../mentor-back/docs/openapi.json`、`../mentor-back/docs/前端对接-导师端.md`、`../mentor-back/docs/前端对接-定时任务与角色.md`
