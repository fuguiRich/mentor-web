# 导师管理服务系统 · 管理端前端设计

> 日期：2026-11-03 ｜ 状态：已定稿（按用户「先做计划，然后自己执行」的指示直接进入实现）
> 后端：`mentor-back`（NestJS + Prisma），开发地址 `http://localhost:3001`
> 前端：`mentor-web`（Vite + React 19 + TanStack Router/Query + antd 6 + Tailwind v4 + RHF + zod）

---

## 1. 意图与背景

为高校创新创业中心提供**管理端**：二级学院管理员处理本院导师入驻审核、考核初评、预约异议复核、学生成果关联与本院统计；双创学院管理员处理全校终审、考核终评、评分规则、归档、系统配置与全校统计；超级管理员维护账号、角色、权限、部门、字典与操作日志。

后端 P1–P5 已交付并可通过 `openapi.json` / `/api-docs` 调用，管理端前端目前只有 Vite 脚手架。本设计的目的是把 60+ 个管理端接口组织成一套可长期维护、权限驱动、面向高频办公场景的后台界面。

## 2. 用户与权限

| 角色 | 数据范围 | 管理端主要动作 |
| --- | --- | --- |
| 二级学院管理员 `college_admin` | `deptAndChildren` | 本院入驻审核、考核初评、预约异议复核、学生成果登记/关联、本院统计与导出、归档检索、工作进度与提醒 |
| 双创学院管理员 `sc_admin` | `all` | 全校入驻终审、导师档案后台修改、考核终评、评分规则、申诉处理、归档管理、系统配置、全校统计与导出、工作进度与提醒 |
| 超级管理员 | 权限码全通过（数据范围不豁免） | 账号、角色、权限、部门（只读）、字典、操作日志、文件 |

**权限驱动，不硬编码角色名。** 菜单与按钮按 `GET /auth/profile` 返回的 `permissions: string[]` 显隐；`isSuperAdmin` 直接视为拥有全部权限码。后端仍做最终校验，前端只负责不展示无权限入口。

## 3. 目标 / 非目标 / 反目标

### 目标

1. 覆盖管理端全部业务：工作台、入驻审核、导师资源库、预约管理、考核管理、统计分析、归档、学生成果、消息、系统管理、个人中心。
2. 列表页统一具备筛选、分页、空态、加载态、错误重试；详情页统一具备操作区与状态解释。
3. 权限驱动导航与操作按钮；401/403/409 有统一且符合后端语义的处理。
4. 桌面优先（1280–1600 为设计基准），1024 可用，768 可浏览；表格在窄屏横向滚动。
5. 所有表单使用 RHF + zod，服务端 `10001` 的 `data.fields` 精确挂到字段。
6. 构建通过、纯逻辑单测通过、用 `sc_admin` / `cs_admin` 真实登录做页面冒烟。

### 非目标

- 不做导师端、学生端。
- 不做 SSO（保留本地账号登录）。
- 不做后端未提供的业务（例如档案冻结/移出入口、账号批量导入）。
- 不做多语言、暗色主题、离线模式。
- 不引入图表库；统计页用 antd `Progress` / `Statistic` 与 CSS 条形图，避免额外体积。

### 反目标（出现即视为失败）

- 前端硬编码角色名判断权限。
- 把申请 `snapshot` 当成导师当前档案展示而不标注。
- 401 时弹需要手动关闭的 toast 而不跳登录。
- 409 状态冲突当成普通错误弹一个红条，不刷新数据。
- 只靠颜色区分状态（必须同时有文字/图标）。
- 列表页无分页、无筛选、无空态。

## 4. 约束

- **统一外壳**：所有 JSON 接口返回 `{ code, message, data, traceId }`；`code !== 0` 即失败，即使 HTTP 200。`message` 可直接展示。
- **类型**：大整数 ID 一律字符串；时间一律 ISO 8601 UTC，展示转本地时区；`awardedAt` / 统计日期为 `YYYY-MM-DD`。
- **分页**：`page` / `pageSize`（默认 1 / 20，上限 100）。
- **文件**：单文件 ≤ 10 MB，单次 ≤ 10 个，仅 png/jpg/jpeg/gif/webp/bmp/pdf；预览/下载是字节流，需带 Authorization 用 `fetch` 取 blob。
- **CORS**：后端白名单仅 `http://localhost:5173`，开发服务器必须使用该端口。
- **依赖**：不新增运行时依赖；测试仅加 `vitest`（Node 环境，纯逻辑）。
- **文案**：中文、简洁、以后端 `message` 为准；状态文案按本文第 6 节映射。

## 5. 设计系统（UI UX Pro Max）

使用 `ui-ux-pro-max` 技能检索并对比了两套方向：

- 深色 Glassmorphism（variance 4 / density 8）：视觉强，但长时段办公、打印、表格阅读与中老年管理员的对比度风险高。
- 浅色 Minimalism & Swiss Style（variance 3 / density 8）：对比度低风险、信息密度高、适合企业/校园后台。

**采用浅色 Minimalism & Swiss Style**，保留深色导航作为品牌锚点，并从教育行业调色板引入青绿与琥珀作为业务强调色。这是对技能建议的主动取舍，理由是可读性、打印与长时间办公。

### 5.1 颜色令牌

| 令牌 | 值 | 用途 |
| --- | --- | --- |
| `--color-primary` | `#0F172A` | 侧边栏、标题、主文字 |
| `--color-accent` | `#0369A1` | 主按钮、链接、选中态 |
| `--color-accent-soft` | `#E0F2FE` | 选中背景、信息提示 |
| `--color-teal` | `#0D9488` | 创新/正向强调、已通过 |
| `--color-amber` | `#D97706` | 待处理、审核中 |
| `--color-red` | `#DC2626` | 驳回、失败、危险操作 |
| `--color-bg` | `#F8FAFC` | 页面背景 |
| `--color-card` | `#FFFFFF` | 卡片、表格、弹层 |
| `--color-border` | `#E2E8F0` | 边框、分割线 |
| `--color-muted` | `#F1F5F9` | 表头、禁用背景 |
| `--color-text` | `#0F172A` | 正文 |
| `--color-text-muted` | `#475569` | 次要文字、表头 |

对比度：正文 `#0F172A` on `#FFFFFF` ≈ 17.9:1；次要文字 `#475569` on `#FFFFFF` ≈ 7.5:1；主按钮白字 on `#0369A1` ≈ 5.9:1，均满足 WCAG AA 4.5:1。

### 5.2 字体

- 正文/标题：`-apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif`。
- 数字/ID/代码：`"Fira Code", ui-monospace, Consolas, monospace`（不联网加载，回退系统等宽）。
- 基准 14px（后台密度高于营销页），行高 1.5715（antd 默认）；表格 13px；页面标题 20px/600；分区标题 15px/600。
- 不引入 Google Fonts：校内网络与国内访问稳定性优先。

### 5.3 间距、圆角、阴影、动效

- 间距：4 / 8 / 12 / 16 / 24 / 32（density 8，紧凑但不拥挤）。
- 圆角：控件 6px，卡片 10px，标签 4px。
- 阴影：卡片 `0 1px 2px rgba(15,23,42,.06)`；浮层用 antd 默认。
- 动效：150–250ms `ease-out`；只用于 hover、展开、抽屉；尊重 `prefers-reduced-motion`。

### 5.4 布局

- 侧边栏：展开 232px / 收起 64px；深色 `#0F172A`；分组标题 12px 大写字距。
- 顶栏：56px，白底，含面包屑、消息未读、用户菜单、收起按钮。
- 内容区：`padding: 24px`；最大宽度不限制，统计页可用 12 栅格。
- 断点：`≥1280` 完整；`1024–1279` 侧栏默认收起；`768–1023` 侧栏变抽屉；`<768` 顶栏简化、表格横向滚动、筛选器纵向堆叠。

### 5.5 组件规范

- 主操作：每页最多一个主按钮（antd `type="primary"`），其余为默认/文本按钮。
- 状态标签：`Tag` + 文字，颜色语义固定；不使用纯色圆点单独表意。
- 表格：表头 `#F1F5F9`，行高 48px，操作列右固定；分页右下；空态带下一步指引。
- 表单：标签在左（窄屏在上），必填星号；错误在字段下方；提交按钮 loading。
- 反馈：成功用 `message`，需要用户决策用 `Modal.confirm`，阻塞性错误用 `Result` 或 `Alert`。
- 空态：`Empty` + 一句解释 + 主操作（若有权限）。

## 6. 信息架构与路由

| 路由 | 页面 | 权限码 |
| --- | --- | --- |
| `/login` | 登录 | 免登录 |
| `/` | 工作台 | 登录 |
| `/applications` | 入驻审核列表 | `mentor-application:list` |
| `/applications/$id` | 申请详情 / 审核 | `mentor-application:list` |
| `/mentors` | 导师资源库 | `mentor:search` |
| `/mentors/$id` | 导师详情 / 工作台 / 后台改档 | `mentor:search`（改档另需 `mentor:admin-update`） |
| `/appointments` | 预约管理 | `appointment:list` |
| `/appointments/$id` | 预约详情 / 异议复核 | `appointment:list`（复核另需 `appointment:adjudicate`） |
| `/assessments` | 考核列表 / 新建 | `assessment:list`（新建另需 `assessment:evaluate`） |
| `/assessments/$id` | 考核详情 / 初评 / 终评 / 申诉 | `assessment:list` |
| `/assessments/rules` | 评分规则 | `assessment:rule-manage` |
| `/stats` | 统计分析（四个 Tab） | 任一 `stats:*` |
| `/archives` | 归档管理 | `archive:list` |
| `/archives/$id` | 归档详情 | `archive:list` |
| `/student-achievements` | 学生成果 | `student-achievement:list` |
| `/messages` | 消息中心 | `message:list` |
| `/system/configs` | 系统配置 | `config:list` |
| `/system/users` | 用户管理 | 超管 |
| `/system/roles` | 角色权限 | 超管 |
| `/system/permissions` | 权限点 | 超管 |
| `/system/depts` | 部门（只读） | 超管 |
| `/system/dicts` | 数据字典 | 超管 |
| `/system/oplogs` | 操作日志 | 超管 |
| `/system/files` | 文件管理 | `file:list` |
| `/profile` | 个人中心 / 改密码 | 登录 |

### 状态文案映射

- 档案 `MentorProfile.status`：0 草稿 / 1 审核中 / 2 已生效 / 3 已退回 / 4 已冻结 / 5 已移除。
- 申请 `MentorApplication.status`：0 草稿 / 1 已提交 / 2 二级学院审核中 / 3 二级学院已退回 / 4 双创学院审核中 / 5 双创学院已退回 / 6 已通过 / 7 已撤回。
- 申请类型：1 入驻申请 / 2 信息修改。
- 预约 `status`：0 待确认 / 1 已确认 / 2 指导中 / 3 记录已提交 / 4 学生已确认 / 5 异议复核中 / 6 已完成 / 7 已拒绝 / 8 已取消 / 9 已过期。
- 预约类型：1 双创竞赛指导 / 2 科研项目指导 / 3 创业实践指导 / 4 论文·专利指导 / 5 其他双创指导；方式：1 线上 / 2 线下。
- 考核 `status`：0 待初评 / 1 已初评 / 2 已生效 / 3 已退回；等级 1 优秀 / 2 合格 / 3 不合格。
- 申诉 `status`：0 待处理 / 1 已受理 / 2 已驳回。
- 成果类型 1 竞赛获奖 / 2 项目立项 / 3 其他；级别 1 国家级 / 2 省级 / 3 市级 / 4 校级 / 5 院级。
- 归档 category：`mentor-application` 入驻申请 / `assessment` 考核 / `guidance-record` 指导记录 / `achievement` 成果 / `other` 其他；`core=1` 核心（长期）/ `0` 非核心。
- 消息类型：1 预约待处理 / 2 指导记录待填写 / 3 考核待处理。

## 7. 关键交互

1. **列表页**：筛选条件写入 URL search params（可分享/刷新保持）；切页/筛选触发 Query；表格 `loading` 不卸载；空态区分“无数据”和“筛选无结果”。
2. **审核弹窗**：通过/不通过都要填 1–500 字意见（后端 R57）；提交后失效列表与详情查询；409 时关闭弹窗、刷新详情、展示后端 `message`。
3. **申请详情**：明确分栏「申请时的内容（快照）」与「审核记录」；材料支持预览（图片/PDF）与下载；不把快照写成“当前档案”。
4. **导师后台改档**：仅 `mentor:admin-update` 可见；7 个字段增量提交；内校隐藏合作单位/社会任职；成功后提示“已留痕”，并提供操作日志入口（超管）。
5. **预约异议复核**：仅 `status=5` 且 `appointment:adjudicate` 显示；复核意见 1–500 字。
6. **考核**：新建选择导师（已生效导师）与学期；初评填等级+意见；终评 `approve` 需等级、`return` 需意见；规则页三权重+两目标值；申诉处理 `accept|reject` + 回复。
7. **统计**：时间维度二选一（学期或日期区间，互斥）；导出用 fetch blob，文件名取 `Content-Disposition`，失败提示。
8. **文件预览**：图片用 `<img>`，PDF 用 `<iframe>`，其他类型给下载按钮；对象 URL 在关闭时释放。
9. **错误**：`10002/20104` 清令牌跳登录；`10003` 展示 403 结果页；`10001` 映射字段；其余展示 `message` + traceId 复制。
10. **加载**：页面级 `Skeleton`；按钮级 `loading`；查询 `retry: 1`。

## 8. 技术架构

```
src/
  main.tsx                     # QueryClient + Router
  routes/                      # 文件路由，薄壳，只做守卫与页面装配
  components/                  # 跨域通用组件
    layout/AppShell.tsx        # 侧栏 + 顶栏 + 内容区
    PageHeader.tsx
    FilterBar.tsx
    DataTable.tsx              # antd Table + 分页 + 空态
    StatusTag.tsx
    EnumSelect.tsx
    FilePreview.tsx
    PermissionGuard.tsx
    StatCard.tsx
    ErrorState.tsx
  lib/
    api/client.ts              # fetch 封装、刷新、错误、blob
    api/types.ts               # 全部 DTO 类型
    api/endpoints/*.ts         # 按域拆分的类型化接口函数
    auth/token-store.ts
    auth/AuthProvider.tsx
    auth/permissions.ts
    query/keys.ts
    format.ts                  # 时间、文件大小、CSV 文件名
    enums.ts                   # 状态文案/颜色
  features/
    applications/  mentors/  appointments/  assessments/
    stats/  archives/  student-achievements/  messages/  system/
```

- **API 客户端**：单例 `apiFetch<T>(path, options)`；自动附加 Bearer；`expiresIn` 提前 60s 刷新，刷新单飞（并发请求共享一个 Promise）；解析外壳；`code!==0` 抛 `ApiError`；支持 `responseType: 'blob'`。
- **认证**：令牌存 `localStorage`（access/refresh/expiresAt）；`AuthProvider` 启动时若有 token 拉 `GET /auth/profile`，失败则清理；`useAuth()` 暴露 `user/permissions/can(code)/login/logout`。
- **路由守卫**：`_app` 布局 `beforeLoad` 检查 token；无 token `redirect({ to: '/login' })`；页面级 `PermissionGuard` 渲染 403。
- **服务端状态**：TanStack Query；key 统一 `['domain','list',params]` / `['domain','detail',id]`；变更后失效相关 key。
- **表单**：RHF + `zodResolver`；antd 输入用 `Controller`；提交时把 `ApiError.fields` 写回 `setError`。
- **样式**：Tailwind 只用于布局与少量工具类；antd 负责控件与表格；`ConfigProvider` 注入品牌 token 与中文 locale；全局 `index.css` 只保留设计令牌与 reset 补充。

## 9. 验收标准

1. `pnpm build` 通过（tsc + vite）。
2. `pnpm test` 通过（API 客户端、权限过滤、枚举/格式化纯逻辑）。
3. `sc_admin` 与 `cs_admin` 可登录；按权限看到不同菜单与按钮。
4. 工作台、申请、导师、预约、考核、统计、归档、学生成果、消息、配置页面均能加载真实数据；空数据有合理空态。
5. 401 自动跳登录；403 显示结果页；409 刷新并展示后端文案；10001 字段错误挂到输入框。
6. 文件预览/下载、四条统计导出可用。
7. 1280 / 1024 / 768 三档布局无横向溢出（表格自身可滚动）。
8. 键盘可达：侧栏、弹窗、表单焦点可见；无 emoji 图标。

## 10. 已知缺口与取舍

1. `GET /mentor-applications` 不返回申请人姓名，只有 `applicantId`。前端展示 ID，并在能匹配到已生效导师时补充姓名；这是后端契约缺口，不伪造。
2. 没有“管理员查询全部档案（含未生效）”的接口；导师后台改档入口只从已生效导师库进入。未生效档案的审核通过 `college-review/sc-review` 完成。
3. 统计接口 `deptId` 仅 `sc_admin` 可用；学院管理员不展示该筛选项。
4. `sc_admin` 没有 `student-achievement:manage`，学生成果页对其只读；登记/关联/删除仅 `college_admin` 可见。
5. 不引入图表库；统计分布用横向条形与数值，满足信息传达，后续可替换。
6. 无浏览器自动化工具；以构建、单测、真实登录 API 冒烟与人工检查代替截图验收。
