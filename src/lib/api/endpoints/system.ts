import { apiBlob, apiFetch } from "../client";
import type {
  ConfigItem,
  CreateConfigBody,
  CreateDictItemBody,
  CreateDictTypeBody,
  CreatePermissionBody,
  CreateRoleBody,
  CreateUserAccountBody,
  Dept,
  DictItem,
  DictType,
  FileObject,
  FileQuery,
  OpLog,
  OpLogQuery,
  Page,
  PageParams,
  Permission,
  ReminderBody,
  ReminderResult,
  Role,
  RoleDetail,
  RoleQuery,
  RunSyncBody,
  RunSyncResult,
  SyncRunPage,
  SyncRunQuery,
  SyncSchedule,
  UpdateConfigBody,
  UpdateDictItemBody,
  UpdateDictTypeBody,
  UpdatePermissionBody,
  UpdateRoleBody,
  UpdateSyncScheduleBody,
  User,
  UserDetail,
  UserQuery,
  WorkProgress,
} from "../types";

// ---------- 部门（只读） ----------

export function listDepts(name?: string): Promise<Dept[]> {
  return apiFetch<Dept[]>("/depts/tree", { query: { name } });
}

export function getDept(id: string): Promise<Dept> {
  return apiFetch<Dept>(`/depts/${id}`);
}

// ---------- 权限点 ----------

export function listPermissionTree(): Promise<Permission[]> {
  return apiFetch<Permission[]>("/permissions/tree");
}

export function getPermission(id: string): Promise<Permission> {
  return apiFetch<Permission>(`/permissions/${id}`);
}

export function createPermission(
  body: CreatePermissionBody,
): Promise<Permission> {
  return apiFetch<Permission>("/permissions", { method: "POST", body });
}

export function updatePermission(
  id: string,
  body: UpdatePermissionBody,
): Promise<Permission> {
  return apiFetch<Permission>(`/permissions/${id}`, { method: "PUT", body });
}

export function deletePermission(id: string): Promise<void> {
  return apiFetch<void>(`/permissions/${id}`, { method: "DELETE" });
}

// ---------- 角色 ----------

export function listRoles(query: RoleQuery = {}): Promise<Page<Role>> {
  return apiFetch<Page<Role>>("/roles", { query });
}

export function getRole(id: string): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(`/roles/${id}`);
}

export function createRole(body: CreateRoleBody): Promise<Role> {
  return apiFetch<Role>("/roles", { method: "POST", body });
}

export function updateRole(id: string, body: UpdateRoleBody): Promise<Role> {
  return apiFetch<Role>(`/roles/${id}`, { method: "PUT", body });
}

export function deleteRole(id: string): Promise<void> {
  return apiFetch<void>(`/roles/${id}`, { method: "DELETE" });
}

export function updateRoleStatus(id: string, status: number): Promise<Role> {
  return apiFetch<Role>(`/roles/${id}/status`, {
    method: "PUT",
    body: { status },
  });
}

export function assignRolePermissions(
  id: string,
  permissionIds: string[],
): Promise<RoleDetail> {
  return apiFetch<RoleDetail>(`/roles/${id}/permissions`, {
    method: "PUT",
    body: { permissionIds },
  });
}

// ---------- 用户 ----------

export function listUsers(query: UserQuery = {}): Promise<Page<User>> {
  return apiFetch<Page<User>>("/users", { query });
}

export function getUser(id: string): Promise<UserDetail> {
  return apiFetch<UserDetail>(`/users/${id}`);
}

export function createUserAccount(
  body: CreateUserAccountBody,
): Promise<UserDetail> {
  return apiFetch<UserDetail>("/users/account", { method: "POST", body });
}

export function updateUserStatus(id: string, status: number): Promise<User> {
  return apiFetch<User>(`/users/${id}/status`, {
    method: "PUT",
    body: { status },
  });
}

export function updateUserSuperAdmin(
  id: string,
  isSuperAdmin: boolean,
): Promise<User> {
  return apiFetch<User>(`/users/${id}/super-admin`, {
    method: "PUT",
    body: { isSuperAdmin },
  });
}

export function resetUserPassword(
  id: string,
  password: string,
): Promise<User> {
  return apiFetch<User>(`/users/${id}/password`, {
    method: "PUT",
    body: { password },
  });
}

export function assignUserRoles(
  id: string,
  roleIds: string[],
): Promise<UserDetail> {
  return apiFetch<UserDetail>(`/users/${id}/roles`, {
    method: "PUT",
    body: { roleIds },
  });
}

// ---------- 字典 ----------

export function listDictTypes(
  query: PageParams & { code?: string; name?: string; status?: number } = {},
): Promise<Page<DictType>> {
  return apiFetch<Page<DictType>>("/dict-types", { query });
}

export function createDictType(body: CreateDictTypeBody): Promise<DictType> {
  return apiFetch<DictType>("/dict-types", { method: "POST", body });
}

export function updateDictType(
  id: string,
  body: UpdateDictTypeBody,
): Promise<DictType> {
  return apiFetch<DictType>(`/dict-types/${id}`, { method: "PUT", body });
}

export function deleteDictType(id: string): Promise<void> {
  return apiFetch<void>(`/dict-types/${id}`, { method: "DELETE" });
}

export function listDictItems(
  query: PageParams & {
    dictTypeId?: string;
    dictTypeCode?: string;
    label?: string;
    status?: number;
  } = {},
): Promise<Page<DictItem>> {
  return apiFetch<Page<DictItem>>("/dict-items", { query });
}

export function createDictItem(body: CreateDictItemBody): Promise<DictItem> {
  return apiFetch<DictItem>("/dict-items", { method: "POST", body });
}

export function updateDictItem(
  id: string,
  body: UpdateDictItemBody,
): Promise<DictItem> {
  return apiFetch<DictItem>(`/dict-items/${id}`, { method: "PUT", body });
}

export function deleteDictItem(id: string): Promise<void> {
  return apiFetch<void>(`/dict-items/${id}`, { method: "DELETE" });
}

// ---------- 系统配置 ----------

export function listConfigs(
  query: PageParams & { code?: string; name?: string; status?: number } = {},
): Promise<Page<ConfigItem>> {
  return apiFetch<Page<ConfigItem>>("/configs", { query });
}

export function createConfig(body: CreateConfigBody): Promise<ConfigItem> {
  return apiFetch<ConfigItem>("/configs", { method: "POST", body });
}

export function updateConfig(
  id: string,
  body: UpdateConfigBody,
): Promise<ConfigItem> {
  return apiFetch<ConfigItem>(`/configs/${id}`, { method: "PUT", body });
}

export function deleteConfig(id: string): Promise<void> {
  return apiFetch<void>(`/configs/${id}`, { method: "DELETE" });
}

// ---------- 操作日志 ----------

export function listOpLogs(query: OpLogQuery = {}): Promise<Page<OpLog>> {
  return apiFetch<Page<OpLog>>("/op-logs", { query });
}

export function getOpLog(id: string): Promise<OpLog> {
  return apiFetch<OpLog>(`/op-logs/${id}`);
}

// ---------- 文件 ----------

export function listFiles(query: FileQuery = {}): Promise<Page<FileObject>> {
  return apiFetch<Page<FileObject>>("/files", { query });
}

export function previewFile(id: string) {
  return apiBlob(`/files/${id}/preview`);
}

export function downloadFile(id: string) {
  return apiBlob(`/files/${id}/download`);
}

export function deleteFile(id: string): Promise<void> {
  return apiFetch<void>(`/files/${id}`, { method: "DELETE" });
}

// ---------- 工作进度 / 提醒 ----------

export function getWorkProgress(): Promise<WorkProgress> {
  return apiFetch<WorkProgress>("/work-progress");
}

export function sendReminder(body: ReminderBody): Promise<ReminderResult> {
  return apiFetch<ReminderResult>("/reminders", { method: "POST", body });
}

// ---------- 定时同步 ----------

export function getSyncSchedule(): Promise<SyncSchedule> {
  return apiFetch<SyncSchedule>("/sync/schedule");
}

export function updateSyncSchedule(
  body: UpdateSyncScheduleBody,
): Promise<SyncSchedule> {
  return apiFetch<SyncSchedule>("/sync/schedule", { method: "PUT", body });
}

export function runSync(body: RunSyncBody): Promise<RunSyncResult> {
  return apiFetch<RunSyncResult>("/sync/sso/run", { method: "POST", body });
}

export function listSyncRuns(
  query: SyncRunQuery = {},
): Promise<SyncRunPage> {
  return apiFetch<SyncRunPage>("/sync/runs", { query });
}
