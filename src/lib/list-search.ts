import { z } from "zod";

/** 列表页通用 URL 搜索参数：页码、每页条数、状态、类型。 */
export const listSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  status: z.coerce.number().int().optional(),
  type: z.coerce.number().int().optional(),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

/** 导师资源库筛选。 */
export const mentorSearchSchema = listSearchSchema.extend({
  name: z.string().optional(),
  keyword: z.string().optional(),
  mentorType: z.enum(["internal", "external"]).optional(),
  researchField: z.string().optional(),
  professionalTitle: z.string().optional(),
  deptId: z.string().optional(),
});

export type MentorListSearch = z.infer<typeof mentorSearchSchema>;

/** 考核列表筛选。 */
export const assessmentSearchSchema = listSearchSchema.extend({
  period: z.string().optional(),
  grade: z.coerce.number().int().optional(),
});

export type AssessmentListSearch = z.infer<typeof assessmentSearchSchema>;

/** 统计筛选：学期或日期区间二选一，另含部门 / 导师类型 / 预约类型。 */
export const statsSearchSchema = z.object({
  tab: z.enum(["mentors", "appointments", "guidance", "assessments"]).optional(),
  period: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  deptId: z.string().optional(),
  mentorType: z.enum(["internal", "external"]).optional(),
  type: z.coerce.number().int().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type StatsListSearch = z.infer<typeof statsSearchSchema>;

/** 归档检索。 */
export const archiveSearchSchema = listSearchSchema.extend({
  mentorId: z.string().optional(),
  deptId: z.string().optional(),
  category: z.string().optional(),
  targetType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export type ArchiveListSearch = z.infer<typeof archiveSearchSchema>;

/** 学生成果检索。 */
export const studentAchievementSearchSchema = listSearchSchema.extend({
  studentPersonId: z.string().optional(),
  mentorId: z.string().optional(),
  year: z.coerce.number().int().optional(),
  linked: z.coerce.number().int().optional(),
});

export type StudentAchievementListSearch = z.infer<
  typeof studentAchievementSearchSchema
>;

/** 消息列表筛选。 */
export const messageSearchSchema = listSearchSchema.extend({
  read: z.coerce.number().int().optional(),
});

export type MessageListSearch = z.infer<typeof messageSearchSchema>;

// ---------- 系统管理列表 ----------

const pageSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

const enabledStatus = z.coerce.number().int().optional();

export const systemConfigSearchSchema = pageSchema.extend({
  code: z.string().optional(),
  name: z.string().optional(),
  status: enabledStatus,
});

export type SystemConfigListSearch = z.infer<typeof systemConfigSearchSchema>;

export const systemUserSearchSchema = pageSchema.extend({
  username: z.string().optional(),
  realName: z.string().optional(),
  deptId: z.string().optional(),
  roleId: z.string().optional(),
  status: enabledStatus,
});

export type SystemUserListSearch = z.infer<typeof systemUserSearchSchema>;

export const systemRoleSearchSchema = pageSchema.extend({
  name: z.string().optional(),
  status: enabledStatus,
});

export type SystemRoleListSearch = z.infer<typeof systemRoleSearchSchema>;

export const systemDictSearchSchema = z.object({
  typePage: z.coerce.number().int().min(1).optional(),
  typePageSize: z.coerce.number().int().min(1).max(100).optional(),
  typeKeyword: z.string().optional(),
  selectedTypeId: z.string().optional(),
  itemPage: z.coerce.number().int().min(1).optional(),
  itemPageSize: z.coerce.number().int().min(1).max(100).optional(),
  itemKeyword: z.string().optional(),
});

export type SystemDictListSearch = z.infer<typeof systemDictSearchSchema>;

export const systemOpLogSearchSchema = pageSchema.extend({
  module: z.string().optional(),
  action: z.string().optional(),
  status: z.coerce.number().int().optional(),
  operatorId: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export type SystemOpLogListSearch = z.infer<typeof systemOpLogSearchSchema>;

export const systemFileSearchSchema = pageSchema.extend({
  originName: z.string().optional(),
  uploaderId: z.string().optional(),
});

export type SystemFileListSearch = z.infer<typeof systemFileSearchSchema>;

/** 导师端双创成果筛选。 */
export const mentorAchievementSearchSchema = listSearchSchema.extend({
  level: z.coerce.number().int().optional(),
  year: z.coerce.number().int().optional(),
});

export type MentorAchievementListSearch = z.infer<
  typeof mentorAchievementSearchSchema
>;

/** 定时同步流水筛选。 */
export const syncSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  source: z.string().optional(),
});

export type SyncListSearch = z.infer<typeof syncSearchSchema>;

/** 导师指导记录台账筛选（from / to 为 YYYY-MM-DD）。 */
export const mentorRecordSearchSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.coerce.number().int().optional(),
});

export type MentorRecordListSearch = z.infer<
  typeof mentorRecordSearchSchema
>;
