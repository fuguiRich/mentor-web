/**
 * 后端 DTO 的前端类型镜像。
 *
 * 约定：
 * - 大整数 ID 一律 string；
 * - 时间一律 ISO 8601 UTC 字符串，展示时用 lib/format 转本地时区；
 * - 纯日期（如成果获奖日期、统计区间）是 YYYY-MM-DD；
 * - 可空字段显式写 `| null`。
 */

// ---------- 通用外壳 ----------

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
}

export interface Page<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

// ---------- 认证 ----------

export interface LoginBody {
  username: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  /** 本次登录来源（仅 POST /auth/login 返回） */
  loginSource?: "sso" | "local" | "local-fallback";
  /** SSO 网络不可达时是否回退到本地密码 */
  ssoUnavailable?: boolean;
  /** SSO 判断是否仍在使用初始默认密码 */
  isDefaultPwd?: boolean | null;
}

export interface User {
  id: string;
  username: string;
  realName: string;
  employeeNo: string;
  mobile: string | null;
  deptId: string;
  deptName: string;
  status: number;
  isSuperAdmin: boolean;
  /** 账号来源：sso 统一认证 / local 本地账号 */
  authSource?: "sso" | "local";
  /** 源系统人员类型；查不到 SyncPerson 时为 null */
  personType?:
    | "teacher"
    | "internalMentor"
    | "externalMentor"
    | "student"
    | null;
  /** 由 personType 推导的导师类型；teacher / internalMentor → internal，externalMentor → external */
  mentorType?: "internal" | "external" | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
  roleIds?: string[];
}

export interface AuthProfile {
  user: User;
  permissions: string[];
  menus: unknown[];
}

export interface ChangePasswordBody {
  oldPassword: string;
  newPassword: string;
}

// ---------- 导师档案 / 申请 ----------

export type MentorType = "internal" | "external";

export interface MentorProfileDraft {
  mentorType: MentorType;
  researchFields: string[];
  summary: string | null;
  achievements: string | null;
  guidanceExperience: string | null;
  affiliateOrg: string | null;
  socialRoles: string | null;
  professionalTitle: string | null;
}

export interface MentorProfile extends MentorProfileDraft {
  id: string;
  personId: string;
  contactMobile: string | null;
  status: number;
}

export interface UpdateMentorProfileBody {
  researchFields?: string[];
  summary?: string | null;
  achievements?: string | null;
  guidanceExperience?: string | null;
  affiliateOrg?: string | null;
  socialRoles?: string | null;
  professionalTitle?: string | null;
}

export interface ReviewRecord {
  reviewerId: string;
  reviewerName: string;
  decision: "approve" | "reject";
  comment: string;
  at: string;
}

export interface MentorApplication {
  id: string;
  type: number;
  applicantId: string;
  snapshot: MentorProfileDraft;
  status: number;
  collegeReview: ReviewRecord | null;
  scReview: ReviewRecord | null;
  submittedAt: string;
}

export interface ReviewBody {
  decision: "approve" | "reject";
  comment: string;
}

export interface Material {
  id: string;
  applicationId: string;
  fileId: string;
  kind: number;
  originName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ApplicationQuery extends PageParams {
  status?: number;
  type?: number;
}

// ---------- 导师检索 ----------

export interface MentorSearchItem {
  id: string;
  name: string;
  mentorType: MentorType;
  deptName: string;
  professionalTitle: string | null;
  researchFields: string[];
  summary: string | null;
}

export interface MentorSearchDetail extends MentorSearchItem {
  researchAchievements: string | null;
  guidanceExperience: string | null;
  affiliateOrg: string | null;
  socialRoles: string | null;
  mobile: string | null;
}

export interface MentorSearchQuery extends PageParams {
  name?: string;
  mentorType?: MentorType;
  researchField?: string;
  professionalTitle?: string;
  weekday?: number;
  deptId?: string;
  keyword?: string;
}

// ---------- 预约 ----------

export interface AppointmentStudent {
  personId: string;
  login: string;
  realName: string;
  orgUnitName: string;
  major?: string;
  className?: string;
  mobile?: string;
}

export interface AppointmentMentor {
  mentorProfileId: string;
  realName: string;
  orgUnitName: string;
}

export interface Appointment {
  id: string;
  studentPersonId: string;
  mentorProfileId: string;
  type: number;
  status: number;
  requestedTime: string;
  proposedTime: string | null;
  topic: string;
  questions: string;
  mode: number;
  handleComment: string | null;
  rejectReason: string | null;
  disputeReason: string | null;
  adjudicateComment: string | null;
  slotId: string | null;
}

export interface AppointmentListItem extends Appointment {
  student: AppointmentStudent;
  mentor: AppointmentMentor;
}

export interface AppointmentDetail extends Appointment {
  student: AppointmentStudent;
  mentor: AppointmentMentor;
}

export interface GuidanceRecord {
  id: string;
  appointmentId: string;
  actualTime: string;
  mode: number;
  coreContent: string;
  followUp: string | null;
  submittedBy: string;
  submittedAt: string;
  student: {
    realName: string;
    login: string;
    major: string | null;
    className: string | null;
    mobile: string | null;
  };
  durationMinutes: number;
}

export interface AppointmentMaterial {
  id: string;
  source: "appointment" | "record";
  fileId: string;
  kind: number;
  originName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface AppointmentQuery extends PageParams {
  status?: number;
  type?: number;
}

// ---------- 考核 ----------

export interface AssessmentWeights {
  review: number;
  workload: number;
  achievement: number;
  normalized: boolean;
}

export interface AssessmentMetrics {
  reviewAvg: string | null;
  reviewCount: number;
  guidanceCount: number;
  guidanceMinutes: number;
  studentCount: number;
  achievementCount: number;
  compositeScore: string;
}

export interface AssessmentMentorRef {
  profileId: string;
  personId: string;
  name: string;
  deptId: string | null;
  deptName: string | null;
}

export interface AssessmentUserRef {
  userId: string;
  name: string | null;
}

export interface Assessment {
  id: string;
  mentorProfileId: string;
  mentor: AssessmentMentorRef;
  period: string;
  status: number;
  weights: AssessmentWeights;
  metrics: AssessmentMetrics;
  collegeGrade: number | null;
  collegeComment: string | null;
  collegeSubmittedAt: string | null;
  finalGrade: number | null;
  finalComment: string | null;
  finalReviewedAt: string | null;
  collegeSubmittedBy: AssessmentUserRef | null;
  finalReviewedBy: AssessmentUserRef | null;
  createdAt: string;
}

export interface AssessmentQuery extends PageParams {
  period?: string;
  status?: number;
  grade?: number;
}

export interface CreateAssessmentBody {
  mentorId: string;
  period: string;
}

export interface AssessmentCollegeReviewBody {
  grade: number;
  comment: string;
}

export interface FinalReviewBody {
  decision: "approve" | "return";
  grade?: number;
  comment: string;
}

export interface AssessmentRules {
  weights: AssessmentWeights;
  targets: { workload: number; achievement: number };
}

export interface UpdateAssessmentRulesBody {
  weights: { review: number; workload: number; achievement: number };
  targets: { workload: number; achievement: number };
}

export interface Appeal {
  id: string;
  assessmentId: string;
  assessment: {
    id: string;
    period: string;
    mentorProfileId: string;
    mentorName: string;
    status: number;
  };
  reason: string;
  status: number;
  reply: string | null;
  handledAt: string | null;
  submittedBy: AssessmentUserRef | null;
  handledBy: AssessmentUserRef | null;
  fileIds: string[];
  files: FileRef[];
  createdAt: string;
}

export interface CreateAppealBody {
  reason: string;
  fileIds?: string[];
}

export interface HandleAppealBody {
  decision: "accept" | "reject";
  reply: string;
}

// ---------- 统计 ----------

export interface StatsQuery extends PageParams {
  period?: string;
  from?: string;
  to?: string;
  deptId?: string;
  mentorType?: MentorType;
  mentorId?: string;
  type?: number;
}

export interface MentorStats {
  total: number;
  internal: number;
  external: number;
  active: number;
  inactive: number;
  byStatus: {
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    frozen: number;
    removed: number;
  };
  byResearchField: { field: string; count: number }[];
}

export interface AppointmentStats {
  total: number;
  byStatus: { status: number; count: number }[];
  acceptanceRate: number | null;
  completionRate: number | null;
  failedPairs: {
    studentPersonId: string;
    studentName: string;
    mentorProfileId: string;
    mentorName: string;
    failedCount: number;
  }[];
}

export interface GuidanceStats {
  guidanceCount: number;
  guidanceMinutes: number;
  studentCount: number;
  achievementCount: number;
  byType: { type: number; count: number; minutes: number }[];
  byMentor: {
    mentorProfileId: string;
    mentorName: string;
    guidanceCount: number;
    guidanceMinutes: number;
    studentCount: number;
    achievementCount: number;
  }[];
  byMentorTotal: number;
  page: number;
  pageSize: number;
}

export interface AssessmentStats {
  total: number;
  byGrade: { excellent: number; qualified: number; unqualified: number };
  byDept: {
    excellent: number;
    qualified: number;
    unqualified: number;
    deptId: string;
    deptName: string;
    total: number;
  }[];
  byMentorType: {
    excellent: number;
    qualified: number;
    unqualified: number;
    mentorType: string;
    total: number;
  }[];
  byResearchField: {
    excellent: number;
    qualified: number;
    unqualified: number;
    field: string;
    total: number;
  }[];
}

export type StatsKind = "mentors" | "appointments" | "guidance" | "assessments";

// ---------- 归档 ----------

export interface FileRef {
  id: string;
  originName: string;
  mimeType: string;
  size: number;
}

export interface ArchiveItem {
  id: string;
  targetType: string;
  targetId: string;
  title: string;
  mentorId: string | null;
  deptId: string | null;
  category: string;
  core: number;
  archivedAt: string;
  retentionUntil: string | null;
  summary: string | null;
  fileIds: string[];
  files: FileRef[];
  createdAt: string;
}

export interface ArchiveQuery extends PageParams {
  mentorId?: string;
  deptId?: string;
  category?: string;
  targetType?: string;
  from?: string;
  to?: string;
}

export interface CreateArchiveBody {
  targetType: string;
  targetId: string;
  title: string;
  category: string;
  mentorId?: string;
  deptId?: string;
  summary?: string;
  fileIds?: string[];
}

export interface UpdateArchiveBody {
  title?: string;
  summary?: string;
  retentionUntil?: string | null;
  fileIds?: string[];
}

// ---------- 学生成果 ----------

export interface StudentAchievement {
  id: string;
  studentPersonId: string;
  studentName: string;
  mentorProfileId: string | null;
  achievementId: string | null;
  deptId: string | null;
  type: number;
  title: string;
  level: number;
  awardedAt: string;
  proofFileId: string | null;
  linkedAt: string | null;
  createdAt: string;
}

export interface StudentAchievementQuery extends PageParams {
  studentPersonId?: string;
  mentorId?: string;
  type?: number;
  year?: number;
  linked?: number;
}

export interface StudentOption {
  id: string;
  login: string;
  realName: string;
  deptId: string | null;
  deptName: string | null;
  major: string | null;
  className: string | null;
}

export interface StudentOptionQuery extends PageParams {
  keyword?: string;
  deptId?: string;
}

export interface CreateStudentAchievementBody {
  studentPersonId: string;
  mentorProfileId?: string;
  type: number;
  title: string;
  level: number;
  awardedAt: string;
  proofFileId?: string;
}

// ---------- 消息 ----------

export interface Message {
  id: string;
  type: number;
  title: string;
  content: string;
  senderUserId: string | null;
  senderName: string | null;
  bizType: string | null;
  bizId: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface MessageList extends Page<Message> {
  unread: number;
}

export interface SentMessage extends Message {
  recipientUserId: string;
  recipientName: string | null;
}

export interface SentMessageList extends Page<SentMessage> {}

export interface MessageQuery extends PageParams {
  read?: number;
  type?: number;
}

export interface SendMessageBody {
  recipientUserIds?: string[];
  recipientRoleCodes?: string[];
  deptId?: string;
  title: string;
  content: string;
}

export interface SendMessageResult {
  sent: number;
  skipped: number;
}

// ---------- 工作进度 / 工作台 ----------

export interface WorkProgressMentor {
  mentorProfileId: string;
  mentorName: string;
  deptId: string;
  pendingAppointments: number;
  missingRecords: number;
  pendingAssessments: number;
}

export interface WorkProgress {
  totalMentors: number;
  pendingAppointments: number;
  missingRecords: number;
  pendingAssessments: number;
  mentors: WorkProgressMentor[];
}

export interface Workbench {
  pendingAppointments: number;
  confirmedAppointments: number;
  awaitingStudentConfirm: number;
  reviewSummary: {
    count: number;
    avg: number | null;
    attitudeAvg: number | null;
    expertiseAvg: number | null;
    effectAvg: number | null;
  };
  currentAssessment: {
    id: string;
    period: string;
    status: number;
    collegeGrade: number | null;
    finalGrade: number | null;
    compositeScore: string | null;
  } | null;
  archivedCount: number;
}

// ---------- 系统管理 ----------

export interface Dept {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  children: Dept[];
}

export interface Permission {
  id: string;
  parentId: string | null;
  type: "DIR" | "MENU" | "BUTTON";
  code: string | null;
  name: string;
  path: string | null;
  component: string | null;
  icon: string | null;
  sortOrder: number;
  status: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  children: Permission[];
}

export interface Role {
  id: string;
  name: string;
  code: string;
  dataScope: "all" | "deptAndChildren" | "dept" | "self";
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface RoleDetail extends Role {
  permissionIds: string[];
}

export interface RoleQuery extends PageParams {
  name?: string;
  status?: number;
}

export interface DictType {
  id: string;
  code: string;
  name: string;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface DictItem {
  id: string;
  dictTypeId: string;
  label: string;
  value: string;
  sortOrder: number;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ConfigItem {
  id: string;
  code: string;
  name: string;
  value: string;
  valueType: "string" | "number" | "boolean" | "json";
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface OpLog {
  id: string;
  module: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  operatorId: string;
  operatorName: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  status: number;
  errorCode: number;
  errorMsg: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  durationMs: number;
  createdAt: string;
}

export interface FileObject {
  id: string;
  originName: string;
  ext: string;
  mimeType: string;
  size: number;
  sha256: string;
  uploaderId: string;
  ownerType: string | null;
  ownerId: string | null;
  createdAt: string;
  previewUrl: string;
  downloadUrl: string;
}

export interface UserQuery extends PageParams {
  username?: string;
  realName?: string;
  employeeNo?: string;
  deptId?: string;
  status?: number;
  roleId?: string;
}

export interface UserDetail extends User {
  roleIds: string[];
}

export interface CreateUserAccountBody {
  username: string;
  realName: string;
  employeeNo: string;
  deptId: string;
  roleIds: string[];
  password?: string;
}

export interface CreateRoleBody {
  name: string;
  code: string;
  dataScope: Role["dataScope"];
  status?: number;
  remark?: string;
}

export interface UpdateRoleBody {
  name: string;
  code?: string;
  dataScope?: Role["dataScope"];
  status?: number;
  remark?: string;
}

export interface CreatePermissionBody {
  parentId?: string | null;
  type: Permission["type"];
  code?: string;
  name: string;
  path?: string;
  component?: string;
  icon?: string;
  sortOrder?: number;
  status?: number;
}

export interface UpdatePermissionBody extends Partial<CreatePermissionBody> {
  name: string;
}

export interface CreateDictTypeBody {
  code: string;
  name: string;
  status?: number;
  remark?: string;
}

export interface UpdateDictTypeBody {
  name: string;
  code?: string;
  status?: number;
  remark?: string;
}

export interface CreateDictItemBody {
  dictTypeId: string;
  label: string;
  value: string;
  sortOrder?: number;
  status?: number;
  remark?: string;
}

export interface UpdateDictItemBody {
  label: string;
  value?: string;
  sortOrder?: number;
  status?: number;
  remark?: string;
}

export interface CreateConfigBody {
  code: string;
  name: string;
  value: string;
  valueType: ConfigItem["valueType"];
  status?: number;
  remark?: string;
}

export interface UpdateConfigBody {
  name: string;
  value: string;
  code?: string;
  valueType?: ConfigItem["valueType"];
  status?: number;
  remark?: string;
}

export interface OpLogQuery extends PageParams {
  module?: string;
  action?: string;
  status?: number;
  operatorId?: string;
  targetType?: string;
  targetId?: string;
  startTime?: string;
  endTime?: string;
}

export interface FileQuery extends PageParams {
  originName?: string;
  uploaderId?: string;
}

export interface ReminderBody {
  type: "pending-appointments" | "record-missing" | "assessment-pending";
  mentorProfileIds?: string[];
}

export interface ReminderResult {
  sent: number;
  skipped: number;
}

// ---------- 定时同步 ----------

export interface SyncRun {
  id: string;
  source: string;
  mode: "incremental" | "full";
  status: number;
  startedAt: string;
  finishedAt: string | null;
  total: number;
  okCount: number;
  failCount: number;
}

export interface SyncSchedule {
  enabled: boolean;
  intervalSeconds: number;
  fullIntervalSeconds: number;
  studentsEnabled: boolean;
  running: boolean;
  nextRunAt: string | null;
  lastRun: SyncRun | null;
}

export interface UpdateSyncScheduleBody {
  enabled?: boolean;
  intervalSeconds?: number;
  fullIntervalSeconds?: number;
  studentsEnabled?: boolean;
}

export interface SyncRunPage {
  rows: SyncRun[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SyncRunQuery extends PageParams {
  source?: string;
}

export interface RunSyncBody {
  mode: "incremental" | "full";
}

export interface RunSyncResult {
  runId: string;
}

// ---------- 导师端：时段 / 评价 / 成果 ----------

export interface TimeSlot {
  id: string;
  mentorProfileId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  status: number;
}

export interface CreateSlotBody {
  weekday: number;
  startTime: string;
  endTime: string;
  status?: number;
}

export interface UpdateSlotBody {
  weekday: number;
  startTime: string;
  endTime: string;
  status?: number;
}

export interface Review {
  id: string;
  appointmentId: string;
  mentorProfileId: string;
  attitude: number;
  expertise: number;
  effect: number;
  overallScore: string;
  comment: string | null;
  createdAt: string;
}

export interface ReviewSummary {
  count: number;
  avg: number | null;
  attitudeAvg: number | null;
  expertiseAvg: number | null;
  effectAvg: number | null;
}

export interface ReviewList extends Page<Review> {
  summary: ReviewSummary;
}

export interface Achievement {
  id: string;
  mentorProfileId: string;
  type: number;
  title: string;
  level: number;
  awardedAt: string;
  description: string | null;
  proofFileId: string | null;
  createdAt: string;
}

export interface AchievementQuery extends PageParams {
  type?: number;
  level?: number;
  year?: number;
}

export interface CreateAchievementBody {
  type: number;
  title: string;
  level: number;
  awardedAt: string;
  description?: string;
  proofFileId?: string;
}

export interface UpdateAchievementBody {
  title?: string;
  level?: number;
  awardedAt?: string;
  description?: string;
  proofFileId?: string;
}

export interface ConfirmAppointmentBody {
  comment?: string;
}

export interface RejectAppointmentBody {
  reason: string;
}

export interface RescheduleAppointmentBody {
  proposedTime: string;
  comment?: string;
}

export interface SubmitRecordBody {
  actualTime: string;
  mode: number;
  coreContent: string;
  followUp: string;
  durationMinutes?: number;
}

export interface AttachRecordMaterialBody {
  fileId: string;
}

export interface AppealBody {
  reason: string;
}

// ---------- 导师端：指导记录台账 ----------

export interface MentorRecord {
  appointmentId: string;
  studentName: string;
  studentLogin: string;
  type: number;
  status: number;
  actualTime: string;
  mode: number;
  coreContent: string;
  followUp: string | null;
  durationMinutes: number;
}

export interface MentorRecordQuery extends PageParams {
  from?: string;
  to?: string;
  type?: number;
}
