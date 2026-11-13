import type { ReactNode } from "react";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  CalendarOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  KeyOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  SettingOutlined,
  SolutionOutlined,
  StarOutlined,
  SyncOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { MenuProps } from "antd";
import { hasAnyPermission, hasPermission } from "../../lib/auth/permissions";

type NavItem = NonNullable<MenuProps["items"]>[number];

interface Entry {
  key: string;
  label: string;
  icon?: ReactNode;
  /** 任一权限码满足即可见 */
  permissions?: string[];
  /** 至少具备其中一个权限才显示（用于已审核导师专属入口） */
  requiresAny?: string[];
  /** 具备任一权限则隐藏（用于教师专属入口） */
  hiddenIfAny?: string[];
  /** 教师（未审核通过）时显示的标签 */
  teacherLabel?: string;
  /** 仅超级管理员可见 */
  superOnly?: boolean;
  /** 暂时隐藏（保留入口定义，恢复时去掉该标记） */
  hidden?: boolean;
}

interface Group {
  title: string;
  entries: Entry[];
  /** 整组可见所需的任一权限（用于把导师端与管理端分组隔开） */
  requiresAny?: string[];
  /** 教师（未审核通过）时显示的组标题 */
  teacherLabel?: string;
  /** 超管不显示该组，避免与管理端重复 */
  hideForSuperAdmin?: boolean;
  /** 导师 / 教师专属账号不显示该组（他们的首页就是导师工作台） */
  hideWhenMentorLanding?: boolean;
}

/** 审核通过后才有的导师能力；没有这些权限说明还是 teacher 身份 */
const MENTOR_CAPABILITIES = ["mentor:slot-manage", "appointment:handle"];

const MENTOR_PERMISSIONS = ["mentor:profile", ...MENTOR_CAPABILITIES];

/** 能进入管理端工作台的权限；与 `/` 的落地逻辑保持一致。 */
const ADMIN_LANDING_PERMISSIONS = [
  "mentor-application:review-college",
  "mentor-application:review-sc",
  "work:progress",
  "stats:mentor",
];

export function isAdminLanding(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  return (
    isSuperAdmin ||
    hasAnyPermission(permissions, ADMIN_LANDING_PERMISSIONS, isSuperAdmin)
  );
}

/** 首页应落到 `/mentor` 的账号（导师 / 教师，且没有管理端工作台）。 */
export function isMentorLanding(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (isAdminLanding(permissions, isSuperAdmin)) return false;
  return hasAnyPermission(permissions, MENTOR_PERMISSIONS, isSuperAdmin);
}

const GROUPS: Group[] = [
  {
    title: "概览",
    hideWhenMentorLanding: true,
    entries: [
      {
        key: "/",
        label: "工作台",
        icon: <DashboardOutlined />,
      },
    ],
  },
  {
    title: "导师服务",
    teacherLabel: "教师服务",
    requiresAny: MENTOR_PERMISSIONS,
    hideForSuperAdmin: true,
    entries: [
      {
        key: "/mentor",
        label: "导师工作台",
        teacherLabel: "导师申请",
        icon: <DashboardOutlined />,
        permissions: MENTOR_PERMISSIONS,
      },
      {
        key: "/mentor/profile",
        label: "我的档案",
        icon: <UserOutlined />,
        permissions: ["mentor:profile"],
        requiresAny: MENTOR_CAPABILITIES,
      },
      {
        key: "/mentor/profile",
        label: "申请成为导师",
        icon: <UserOutlined />,
        permissions: ["mentor-application:submit"],
        hiddenIfAny: MENTOR_CAPABILITIES,
      },
      {
        key: "/mentor/applications",
        label: "申请记录",
        icon: <AuditOutlined />,
        permissions: ["mentor-application:list"],
      },
      {
        key: "/mentor/slots",
        label: "可指导时段",
        icon: <ScheduleOutlined />,
        permissions: ["mentor:slot-manage"],
      },
      {
        key: "/mentor/appointments",
        label: "预约处理",
        icon: <CalendarOutlined />,
        permissions: ["appointment:list"],
      },
      {
        key: "/mentor/records",
        label: "指导记录",
        icon: <FileTextOutlined />,
        permissions: ["appointment:list"],
      },
      {
        key: "/assessments",
        label: "我的考核",
        icon: <SafetyCertificateOutlined />,
        permissions: ["assessment:list"],
      },
      {
        key: "/mentor/achievements",
        label: "双创成果",
        icon: <TrophyOutlined />,
        permissions: ["achievement:list"],
        // 暂时隐藏：导师成果与「学生成果」的职责边界尚未定稿
        hidden: true,
      },
      {
        key: "/mentor/reviews",
        label: "收到评价",
        icon: <StarOutlined />,
        permissions: ["review:list"],
      },
      {
        key: "/mentor/stats",
        label: "指导统计",
        icon: <BarChartOutlined />,
        permissions: ["stats:guidance"],
      },
      {
        key: "/archives",
        label: "我的归档",
        icon: <FolderOpenOutlined />,
        permissions: ["archive:list"],
      },
      {
        key: "/student-achievements",
        label: "学生成果",
        icon: <TeamOutlined />,
        permissions: ["student-achievement:list"],
      },
    ],
  },
  {
    title: "业务",
    entries: [
      {
        key: "/applications",
        label: "入驻审核",
        icon: <AuditOutlined />,
        permissions: [
          "mentor-application:review-college",
          "mentor-application:review-sc",
        ],
      },
      {
        key: "/mentors",
        label: "导师资源库",
        icon: <SolutionOutlined />,
        permissions: [
          "mentor:admin-update",
          "mentor-application:review-college",
          "mentor-application:review-sc",
        ],
      },
      {
        key: "/appointments",
        label: "预约管理",
        icon: <CalendarOutlined />,
        permissions: ["appointment:adjudicate"],
      },
      {
        key: "/assessments",
        label: "考核管理",
        icon: <SafetyCertificateOutlined />,
        permissions: [
          "assessment:evaluate",
          "assessment:finalize",
          "assessment:rule-manage",
        ],
      },
    ],
  },
  {
    title: "分析",
    entries: [
      {
        key: "/stats",
        label: "统计分析",
        icon: <BarChartOutlined />,
        permissions: [
          "stats:mentor",
          "stats:appointment",
          "stats:assessment",
        ],
      },
      {
        key: "/archives",
        label: "归档管理",
        icon: <FolderOpenOutlined />,
        permissions: ["work:progress"],
      },
      {
        key: "/student-achievements",
        label: "学生成果",
        icon: <TrophyOutlined />,
        permissions: ["work:progress"],
      },
    ],
  },
  {
    title: "协同",
    entries: [
      {
        key: "/messages",
        label: "消息中心",
        icon: <MessageOutlined />,
        permissions: ["message:list"],
      },
    ],
  },
  {
    title: "系统",
    entries: [
      {
        key: "/system/configs",
        label: "系统配置",
        icon: <SettingOutlined />,
        permissions: ["config:list"],
      },
      {
        key: "/system/sync",
        label: "定时同步",
        icon: <SyncOutlined />,
        permissions: ["sync:manage", "sync:run"],
      },
      {
        key: "/system/users",
        label: "用户管理",
        icon: <UserOutlined />,
        superOnly: true,
      },
      {
        key: "/system/roles",
        label: "角色权限",
        icon: <TeamOutlined />,
        superOnly: true,
      },
      {
        key: "/system/permissions",
        label: "权限点",
        icon: <KeyOutlined />,
        superOnly: true,
      },
      {
        key: "/system/depts",
        label: "部门",
        icon: <ApartmentOutlined />,
        superOnly: true,
      },
      {
        key: "/system/dicts",
        label: "数据字典",
        icon: <AppstoreOutlined />,
        superOnly: true,
      },
      {
        key: "/system/oplogs",
        label: "操作日志",
        icon: <FileSearchOutlined />,
        superOnly: true,
      },
      {
        key: "/system/files",
        label: "文件管理",
        icon: <FolderOpenOutlined />,
        permissions: ["file:list"],
      },
    ],
  },
];

function visible(
  entry: Entry,
  permissions: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  if (entry.hidden) return false;
  if (entry.superOnly) return isSuperAdmin;
  if (
    entry.hiddenIfAny?.length &&
    hasAnyPermission(permissions, entry.hiddenIfAny, isSuperAdmin)
  ) {
    return false;
  }
  if (
    entry.requiresAny?.length &&
    !hasAnyPermission(permissions, entry.requiresAny, isSuperAdmin)
  ) {
    return false;
  }
  if (!entry.permissions?.length) return true;
  return hasAnyPermission(permissions, entry.permissions, isSuperAdmin);
}

export function buildNavItems(
  permissions: readonly string[],
  isSuperAdmin: boolean,
): MenuProps["items"] {
  const items: NavItem[] = [];
  const isApprovedMentor = hasAnyPermission(
    permissions,
    MENTOR_CAPABILITIES,
    isSuperAdmin,
  );
  const mentorLanding = isMentorLanding(permissions, isSuperAdmin);

  for (const group of GROUPS) {
    if (group.hideForSuperAdmin && isSuperAdmin) continue;
    if (group.hideWhenMentorLanding && mentorLanding) continue;
    if (
      group.requiresAny &&
      !hasAnyPermission(permissions, group.requiresAny, isSuperAdmin)
    ) {
      continue;
    }
    const children = group.entries
      .filter((entry) => visible(entry, permissions, isSuperAdmin))
      .map((entry) => ({
        key: entry.key,
        label:
          !isApprovedMentor && entry.teacherLabel
            ? entry.teacherLabel
            : entry.label,
        icon: entry.icon,
      }));
    if (children.length) {
      const label =
        !isApprovedMentor && group.teacherLabel
          ? group.teacherLabel
          : group.title;
      items.push({
        key: `group-${label}`,
        type: "group",
        label,
        children,
      });
    }
  }
  return items;
}

export const ROUTE_LABELS: Record<string, string> = {
  "/": "工作台",
  "/mentor": "导师工作台",
  "/mentor/profile": "我的档案",
  "/mentor/applications": "申请记录",
  "/mentor/slots": "可指导时段",
  "/mentor/appointments": "预约处理",
  "/mentor/records": "指导记录",
  "/mentor/achievements": "双创成果",
  "/mentor/reviews": "收到评价",
  "/mentor/stats": "指导统计",
  "/applications": "入驻审核",
  "/mentors": "导师资源库",
  "/appointments": "预约管理",
  "/assessments": "考核管理",
  "/assessments/rules": "评分规则",
  "/stats": "统计分析",
  "/archives": "归档管理",
  "/student-achievements": "学生成果",
  "/messages": "消息中心",
  "/system/configs": "系统配置",
  "/system/sync": "定时同步",
  "/system/users": "用户管理",
  "/system/roles": "角色权限",
  "/system/permissions": "权限点",
  "/system/depts": "部门",
  "/system/dicts": "数据字典",
  "/system/oplogs": "操作日志",
  "/system/files": "文件管理",
  "/profile": "个人中心",
};

/** 当前路径命中的菜单 key：取最长前缀。 */
export function selectedMenuKey(pathname: string): string {
  const keys = Object.keys(ROUTE_LABELS).filter((key) => key !== "/");
  const matched = keys
    .filter((key) => pathname === key || pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];
  return matched ?? "/";
}

export function canSeeNav(
  permissions: readonly string[],
  code: string,
  isSuperAdmin: boolean,
): boolean {
  return hasPermission(permissions, code, isSuperAdmin);
}
