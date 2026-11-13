import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  assignRolePermissions,
  assignUserRoles,
  createConfig,
  createDictItem,
  createDictType,
  createPermission,
  createRole,
  createUserAccount,
  deleteConfig,
  deleteDictItem,
  deleteDictType,
  deleteFile,
  deletePermission,
  deleteRole,
  getOpLog,
  getRole,
  getSyncSchedule,
  getUser,
  listConfigs,
  listDictItems,
  listDictTypes,
  listFiles,
  listOpLogs,
  listPermissionTree,
  listRoles,
  listSyncRuns,
  listUsers,
  resetUserPassword,
  runSync,
  updateConfig,
  updateDictItem,
  updateDictType,
  updatePermission,
  updateRole,
  updateRoleStatus,
  updateSyncSchedule,
  updateUserStatus,
  updateUserSuperAdmin,
} from "../../lib/api/endpoints/system";
import type {
  CreateConfigBody,
  CreateDictItemBody,
  CreateDictTypeBody,
  CreatePermissionBody,
  CreateRoleBody,
  CreateUserAccountBody,
  FileQuery,
  OpLogQuery,
  PageParams,
  RoleQuery,
  RunSyncBody,
  SyncRunQuery,
  UpdateConfigBody,
  UpdateDictItemBody,
  UpdateDictTypeBody,
  UpdatePermissionBody,
  UpdateRoleBody,
  UpdateSyncScheduleBody,
  UserQuery,
} from "../../lib/api/types";

function useInvalidate(keys: string[][]) {
  const queryClient = useQueryClient();
  return () => {
    for (const key of keys) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };
}

// ---------- 配置 ----------

export function useConfigs(
  params: PageParams & { code?: string; name?: string; status?: number },
) {
  return useQuery({
    queryKey: ["system", "configs", params],
    queryFn: () => listConfigs(params),
  });
}

export function useCreateConfig() {
  const invalidate = useInvalidate([["system", "configs"]]);
  return useMutation({
    mutationFn: (body: CreateConfigBody) => createConfig(body),
    onSuccess: invalidate,
  });
}

export function useUpdateConfig() {
  const invalidate = useInvalidate([["system", "configs"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateConfigBody }) =>
      updateConfig(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteConfig() {
  const invalidate = useInvalidate([["system", "configs"]]);
  return useMutation({
    mutationFn: (id: string) => deleteConfig(id),
    onSuccess: invalidate,
  });
}

// ---------- 用户 ----------

export function useUsers(params: UserQuery) {
  return useQuery({
    queryKey: ["system", "users", params],
    queryFn: () => listUsers(params),
  });
}

export function useUser(id: string | null) {
  return useQuery({
    queryKey: ["system", "users", "detail", id],
    queryFn: () => getUser(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateUserAccount() {
  const invalidate = useInvalidate([["system", "users"]]);
  return useMutation({
    mutationFn: (body: CreateUserAccountBody) => createUserAccount(body),
    onSuccess: invalidate,
  });
}

export function useUpdateUserStatus() {
  const invalidate = useInvalidate([["system", "users"]]);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      updateUserStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      resetUserPassword(id, password),
  });
}

export function useUpdateUserSuperAdmin() {
  const invalidate = useInvalidate([["system", "users"]]);
  return useMutation({
    mutationFn: ({
      id,
      isSuperAdmin,
    }: {
      id: string;
      isSuperAdmin: boolean;
    }) => updateUserSuperAdmin(id, isSuperAdmin),
    onSuccess: invalidate,
  });
}

export function useAssignUserRoles() {
  const invalidate = useInvalidate([["system", "users"]]);
  return useMutation({
    mutationFn: ({ id, roleIds }: { id: string; roleIds: string[] }) =>
      assignUserRoles(id, roleIds),
    onSuccess: invalidate,
  });
}

// ---------- 角色 ----------

export function useRoles(params: RoleQuery) {
  return useQuery({
    queryKey: ["system", "roles", params],
    queryFn: () => listRoles(params),
  });
}

export function useAllRoles() {
  return useQuery({
    queryKey: ["system", "roles", "all"],
    queryFn: () => listRoles({ page: 1, pageSize: 100 }),
    staleTime: 60_000,
  });
}

export function useRole(id: string | null) {
  return useQuery({
    queryKey: ["system", "roles", "detail", id],
    queryFn: () => getRole(id as string),
    enabled: Boolean(id),
  });
}

export function useCreateRole() {
  const invalidate = useInvalidate([["system", "roles"]]);
  return useMutation({
    mutationFn: (body: CreateRoleBody) => createRole(body),
    onSuccess: invalidate,
  });
}

export function useUpdateRole() {
  const invalidate = useInvalidate([["system", "roles"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleBody }) =>
      updateRole(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidate([["system", "roles"]]);
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: invalidate,
  });
}

export function useUpdateRoleStatus() {
  const invalidate = useInvalidate([["system", "roles"]]);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: number }) =>
      updateRoleStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useAssignRolePermissions() {
  const invalidate = useInvalidate([["system", "roles"]]);
  return useMutation({
    mutationFn: ({
      id,
      permissionIds,
    }: {
      id: string;
      permissionIds: string[];
    }) => assignRolePermissions(id, permissionIds),
    onSuccess: invalidate,
  });
}

// ---------- 权限点 ----------

export function usePermissionTree() {
  return useQuery({
    queryKey: ["system", "permissions", "tree"],
    queryFn: listPermissionTree,
    staleTime: 60_000,
  });
}

export function useCreatePermission() {
  const invalidate = useInvalidate([["system", "permissions"]]);
  return useMutation({
    mutationFn: (body: CreatePermissionBody) => createPermission(body),
    onSuccess: invalidate,
  });
}

export function useUpdatePermission() {
  const invalidate = useInvalidate([["system", "permissions"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdatePermissionBody }) =>
      updatePermission(id, body),
    onSuccess: invalidate,
  });
}

export function useDeletePermission() {
  const invalidate = useInvalidate([["system", "permissions"]]);
  return useMutation({
    mutationFn: (id: string) => deletePermission(id),
    onSuccess: invalidate,
  });
}

// ---------- 字典 ----------

export function useDictTypes(
  params: PageParams & { code?: string; name?: string; status?: number },
) {
  return useQuery({
    queryKey: ["system", "dict-types", params],
    queryFn: () => listDictTypes(params),
  });
}

export function useDictItems(
  params: PageParams & {
    dictTypeId?: string;
    dictTypeCode?: string;
    label?: string;
    status?: number;
  },
) {
  return useQuery({
    queryKey: ["system", "dict-items", params],
    queryFn: () => listDictItems(params),
  });
}

export function useCreateDictType() {
  const invalidate = useInvalidate([["system", "dict-types"]]);
  return useMutation({
    mutationFn: (body: CreateDictTypeBody) => createDictType(body),
    onSuccess: invalidate,
  });
}

export function useUpdateDictType() {
  const invalidate = useInvalidate([["system", "dict-types"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDictTypeBody }) =>
      updateDictType(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteDictType() {
  const invalidate = useInvalidate([["system", "dict-types"]]);
  return useMutation({
    mutationFn: (id: string) => deleteDictType(id),
    onSuccess: invalidate,
  });
}

export function useCreateDictItem() {
  const invalidate = useInvalidate([["system", "dict-items"]]);
  return useMutation({
    mutationFn: (body: CreateDictItemBody) => createDictItem(body),
    onSuccess: invalidate,
  });
}

export function useUpdateDictItem() {
  const invalidate = useInvalidate([["system", "dict-items"]]);
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDictItemBody }) =>
      updateDictItem(id, body),
    onSuccess: invalidate,
  });
}

export function useDeleteDictItem() {
  const invalidate = useInvalidate([["system", "dict-items"]]);
  return useMutation({
    mutationFn: (id: string) => deleteDictItem(id),
    onSuccess: invalidate,
  });
}

// ---------- 操作日志 ----------

export function useOpLogs(params: OpLogQuery) {
  return useQuery({
    queryKey: ["system", "oplogs", params],
    queryFn: () => listOpLogs(params),
  });
}

export function useOpLog(id: string | null) {
  return useQuery({
    queryKey: ["system", "oplogs", "detail", id],
    queryFn: () => getOpLog(id as string),
    enabled: Boolean(id),
  });
}

// ---------- 文件 ----------

export function useFiles(params: FileQuery) {
  return useQuery({
    queryKey: ["system", "files", params],
    queryFn: () => listFiles(params),
  });
}

export function useDeleteFile() {
  const invalidate = useInvalidate([["system", "files"]]);
  return useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: invalidate,
  });
}

// ---------- 定时同步 ----------

export function useSyncSchedule() {
  return useQuery({
    queryKey: ["system", "sync", "schedule"],
    queryFn: getSyncSchedule,
    refetchInterval: (query) =>
      query.state.data?.running ? 5_000 : 30_000,
  });
}

export function useUpdateSyncSchedule() {
  const invalidate = useInvalidate([["system", "sync", "schedule"]]);
  return useMutation({
    mutationFn: (body: UpdateSyncScheduleBody) => updateSyncSchedule(body),
    onSuccess: invalidate,
  });
}

export function useRunSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: RunSyncBody) => runSync(body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["system", "sync"] });
    },
  });
}

export function useSyncRuns(params: SyncRunQuery) {
  return useQuery({
    queryKey: ["system", "sync", "runs", params],
    queryFn: () => listSyncRuns(params),
    refetchInterval: 10_000,
  });
}
