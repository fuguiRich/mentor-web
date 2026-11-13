export interface EnumMeta {
  label: string;
  color: string;
}

export type StatusKind =
  | "profile"
  | "application"
  | "appointment"
  | "assessment"
  | "appeal"
  | "user"
  | "role"
  | "config"
  | "core"
  | "linked"
  | "sync";

const PROFILE_STATUS: Record<number, EnumMeta> = {
  0: { label: "草稿", color: "default" },
  1: { label: "审核中", color: "processing" },
  2: { label: "已生效", color: "success" },
  3: { label: "已退回", color: "error" },
  4: { label: "已冻结", color: "warning" },
  5: { label: "已移除", color: "default" },
};

const APPLICATION_STATUS: Record<number, EnumMeta> = {
  0: { label: "草稿", color: "default" },
  1: { label: "已提交", color: "processing" },
  2: { label: "二级学院审核中", color: "processing" },
  3: { label: "二级学院已退回", color: "error" },
  4: { label: "创新创业学院审核中", color: "geekblue" },
  5: { label: "创新创业学院已退回", color: "error" },
  6: { label: "已通过", color: "success" },
  7: { label: "已撤回", color: "default" },
};

const APPOINTMENT_STATUS: Record<number, EnumMeta> = {
  0: { label: "待确认", color: "warning" },
  1: { label: "已确认", color: "processing" },
  2: { label: "指导中", color: "processing" },
  3: { label: "记录已提交", color: "geekblue" },
  4: { label: "学生已确认", color: "cyan" },
  5: { label: "异议复核中", color: "volcano" },
  6: { label: "已完成", color: "success" },
  7: { label: "已拒绝", color: "error" },
  8: { label: "已取消", color: "default" },
  9: { label: "已过期", color: "default" },
};

const ASSESSMENT_STATUS: Record<number, EnumMeta> = {
  0: { label: "待初评", color: "warning" },
  1: { label: "待终评", color: "processing" },
  2: { label: "已生效", color: "success" },
  3: { label: "已退回", color: "error" },
  4: { label: "申诉中", color: "volcano" },
  5: { label: "申诉已受理", color: "cyan" },
  6: { label: "申诉已驳回", color: "error" },
};

const APPEAL_STATUS: Record<number, EnumMeta> = {
  0: { label: "待处理", color: "warning" },
  1: { label: "已受理", color: "success" },
  2: { label: "已驳回", color: "error" },
};

const ENABLED_STATUS: Record<number, EnumMeta> = {
  1: { label: "启用", color: "success" },
  0: { label: "停用", color: "default" },
};

const CORE_STATUS: Record<number, EnumMeta> = {
  1: { label: "核心", color: "gold" },
  0: { label: "非核心", color: "default" },
};

const LINKED_STATUS: Record<number, EnumMeta> = {
  1: { label: "已关联", color: "success" },
  0: { label: "未关联", color: "warning" },
};

const SYNC_STATUS: Record<number, EnumMeta> = {
  0: { label: "运行中", color: "processing" },
  1: { label: "成功", color: "success" },
  2: { label: "部分成功", color: "warning" },
  3: { label: "失败", color: "error" },
};

const STATUS_MAPS: Record<StatusKind, Record<number, EnumMeta>> = {
  profile: PROFILE_STATUS,
  application: APPLICATION_STATUS,
  appointment: APPOINTMENT_STATUS,
  assessment: ASSESSMENT_STATUS,
  appeal: APPEAL_STATUS,
  user: ENABLED_STATUS,
  role: ENABLED_STATUS,
  config: ENABLED_STATUS,
  core: CORE_STATUS,
  linked: LINKED_STATUS,
  sync: SYNC_STATUS,
};

export function statusMeta(
  kind: StatusKind,
  value: number | null | undefined,
): EnumMeta {
  if (value === null || value === undefined) {
    return { label: "—", color: "default" };
  }
  return STATUS_MAPS[kind][value] ?? { label: `未知(${value})`, color: "default" };
}

export function statusOptions(
  kind: StatusKind,
): { value: number; label: string }[] {
  return Object.entries(STATUS_MAPS[kind]).map(([value, meta]) => ({
    value: Number(value),
    label: meta.label,
  }));
}

// ---------- 非状态枚举 ----------

export const MENTOR_TYPE_LABELS: Record<string, string> = {
  internal: "校内",
  external: "校外",
};

export const APPLICATION_TYPE_LABELS: Record<number, string> = {
  1: "入驻申请",
  2: "信息修改",
};

export const APPOINTMENT_TYPE_LABELS: Record<number, string> = {
  1: "双创竞赛指导",
  2: "科研项目指导",
  3: "创业实践指导",
  4: "论文 / 专利指导",
  5: "其他双创指导",
};

export const APPOINTMENT_MODE_LABELS: Record<number, string> = {
  1: "线上",
  2: "线下",
};

export const MATERIAL_KIND_LABELS: Record<number, string> = {
  1: "职称证书",
  2: "行业资质",
  3: "其他",
};

export const APPOINTMENT_MATERIAL_KIND_LABELS: Record<number, string> = {
  1: "项目计划书",
  2: "竞赛备赛资料",
  3: "其他",
};

export const ASSESSMENT_GRADE_LABELS: Record<number, string> = {
  1: "优秀",
  2: "合格",
  3: "不合格",
};

export const ACHIEVEMENT_TYPE_LABELS: Record<number, string> = {
  1: "竞赛获奖",
  2: "项目立项",
  3: "其他",
};

export const ACHIEVEMENT_LEVEL_LABELS: Record<number, string> = {
  1: "国家级",
  2: "省级",
  3: "市级",
  4: "校级",
  5: "院级",
};

export const ARCHIVE_CATEGORY_LABELS: Record<string, string> = {
  "mentor-application": "入驻申请",
  assessment: "考核",
  "guidance-record": "指导记录",
  achievement: "成果",
  other: "其他",
};

export const ARCHIVE_TARGET_TYPE_LABELS: Record<string, string> = {
  MentorApplication: "入驻申请",
  Assessment: "考核",
  GuidanceRecord: "指导记录",
  Achievement: "导师成果",
  StudentAchievement: "学生成果",
  Other: "其他",
};

export const MESSAGE_TYPE_LABELS: Record<number, string> = {
  1: "预约待处理",
  2: "指导记录待填写",
  3: "考核待处理",
  4: "系统通知",
};

export const ROLE_DATA_SCOPE_LABELS: Record<string, string> = {
  all: "全校",
  deptAndChildren: "本部门及下级",
  dept: "本部门",
  self: "仅本人",
};

export const PERMISSION_TYPE_LABELS: Record<string, string> = {
  DIR: "目录",
  MENU: "菜单",
  BUTTON: "按钮",
};

export const CONFIG_VALUE_TYPE_LABELS: Record<string, string> = {
  string: "字符串",
  number: "数字",
  boolean: "布尔",
  json: "JSON",
};

export const REMINDER_TYPE_LABELS: Record<string, string> = {
  "pending-appointments": "预约待处理",
  "record-missing": "指导记录未填",
  "assessment-pending": "考核待处理",
};

export const SYNC_MODE_LABELS: Record<string, string> = {
  incremental: "增量",
  full: "全量",
};

export function enumLabel(
  map: Record<string | number, string>,
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "—";
  return map[value] ?? String(value);
}

export function toOptions<T extends string | number>(
  map: Record<string, string>,
  order?: readonly T[],
): { value: T; label: string }[] {
  const values = order ?? (Object.keys(map) as T[]);
  return values.map((value) => ({
    value,
    label: map[String(value)] ?? String(value),
  }));
}
