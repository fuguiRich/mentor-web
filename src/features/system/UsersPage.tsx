import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  App,
  Button,
  Drawer,
  Empty,
  Input,
  Select,
  Skeleton,
  Tag,
} from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { Descriptions } from "antd";
import { ApiError } from "../../lib/api/client";
import { useAuth } from "../../lib/auth/AuthProvider";
import { useDepts } from "../../lib/hooks/useDepts";
import { flattenDepts } from "../../lib/tree";
import { formatDateTime } from "../../lib/format";
import type { SystemUserListSearch } from "../../lib/list-search";
import type { User } from "../../lib/api/types";
import {
  useAllRoles,
  useUpdateUserStatus,
  useUpdateUserSuperAdmin,
  useUser,
  useUsers,
} from "./queries";
import {
  AssignRolesModal,
  CreateUserModal,
  ResetPasswordModal,
} from "./user-modals";

export function UsersPage() {
  const { message, modal } = App.useApp();
  const { user: currentUser, isSuperAdmin } = useAuth();
  const depts = useDepts();
  const roles = useAllRoles();
  const statusMutation = useUpdateUserStatus();
  const superAdminMutation = useUpdateUserSuperAdmin();
  const search = useSearch({ from: "/_app/system/users" });
  const navigate = useNavigate({ from: "/system/users" });

  const [creating, setCreating] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [rolesFor, setRolesFor] = useState<string | null>(null);
  const [passwordFor, setPasswordFor] = useState<User | null>(null);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const query = useUsers({
    page,
    pageSize,
    username: search.username,
    realName: search.realName,
    deptId: search.deptId,
    roleId: search.roleId,
    status: search.status,
  });
  const detail = useUser(detailId);

  function updateSearch(patch: Partial<SystemUserListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  function confirmCancelSuperAdmin(record: User) {
    modal.confirm({
      title: "取消超级管理员",
      content: `确认取消「${record.realName}」的超级管理员身份？该账号将退回角色权限，变更后需要重新登录。`,
      okText: "取消超管",
      okButtonProps: { danger: true },
      cancelText: "保留",
      onOk: async () => {
        try {
          await superAdminMutation.mutateAsync({
            id: record.id,
            isSuperAdmin: false,
          });
          message.success("已取消超级管理员");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "操作失败，请稍后重试",
          );
        }
      },
    });
  }

  function confirmToggle(record: User) {
    const next = record.status === 1 ? 0 : 1;
    modal.confirm({
      title: next === 1 ? "启用账号" : "停用账号",
      content:
        next === 1
          ? `确认启用「${record.realName}」？`
          : `确认停用「${record.realName}」？停用后该账号将无法登录。`,
      okText: next === 1 ? "启用" : "停用",
      okButtonProps: next === 0 ? { danger: true } : undefined,
      cancelText: "取消",
      onOk: async () => {
        try {
          await statusMutation.mutateAsync({ id: record.id, status: next });
          message.success(next === 1 ? "账号已启用" : "账号已停用");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "操作失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  return (
    <PermissionGuard code="user:list">
      <PageHeader
        title="用户管理"
        description="查看账号、绑定角色、启停账号与重置密码；人员数据由外部同步，超级管理员账号不可停用。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreating(true)}
            >
              新建账号
            </Button>
          </>
        }
      />

      <FilterBar>
        <Input.Search
          key={`username-${search.username ?? ""}`}
          allowClear
          placeholder="用户名"
          defaultValue={search.username}
          style={{ width: 150 }}
          onSearch={(value) =>
            updateSearch({ username: value.trim() || undefined })
          }
        />
        <Input.Search
          key={`realName-${search.realName ?? ""}`}
          allowClear
          placeholder="真实姓名"
          defaultValue={search.realName}
          style={{ width: 150 }}
          onSearch={(value) =>
            updateSearch({ realName: value.trim() || undefined })
          }
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="全部部门"
          value={search.deptId}
          onChange={(value) => updateSearch({ deptId: value || undefined })}
          options={flattenDepts(depts.data ?? [])}
          loading={depts.isLoading}
          style={{ minWidth: 160 }}
        />
        <Select
          allowClear
          placeholder="全部角色"
          value={search.roleId}
          onChange={(value) => updateSearch({ roleId: value || undefined })}
          options={(roles.data?.list ?? []).map((role) => ({
            value: role.id,
            label: role.name,
          }))}
          style={{ minWidth: 150 }}
        />
        <Select
          allowClear
          placeholder="全部状态"
          value={search.status}
          onChange={(value) => updateSearch({ status: value })}
          options={[
            { value: 1, label: "启用" },
            { value: 0, label: "停用" },
          ]}
          style={{ minWidth: 120 }}
        />
        <span className="ml-auto text-xs text-ink-muted">
          共 {query.data?.total ?? 0} 个账号
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<User>
          dataSource={query.data?.list ?? []}
          loading={query.isLoading}
          total={query.data?.total}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage, nextSize) =>
            updateSearch({ page: nextPage, pageSize: nextSize })
          }
          columns={[
            {
              title: "用户名",
              dataIndex: "username",
              key: "username",
              width: 130,
              render: (value: string) => (
                <span className="tabular text-xs">{value}</span>
              ),
            },
            { title: "姓名", dataIndex: "realName", key: "realName", width: 120 },
            {
              title: "工号",
              dataIndex: "employeeNo",
              key: "employeeNo",
              width: 130,
              render: (value: string) => (
                <span className="tabular text-xs">{value}</span>
              ),
            },
            { title: "部门", dataIndex: "deptName", key: "deptName", width: 140 },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 90,
              render: (value: number) => <StatusTag kind="user" value={value} />,
            },
            {
              title: "超管",
              dataIndex: "isSuperAdmin",
              key: "isSuperAdmin",
              width: 80,
              render: (value: boolean) => (value ? "是" : "—"),
            },
            {
              title: "账号来源",
              dataIndex: "authSource",
              key: "authSource",
              width: 110,
              render: (value: string | undefined) =>
                value === "sso" ? (
                  <Tag color="blue" className="m-0">
                    统一认证
                  </Tag>
                ) : (
                  <Tag className="m-0">本地</Tag>
                ),
            },
            {
              title: "最后登录",
              dataIndex: "lastLoginAt",
              key: "lastLoginAt",
              width: 170,
              render: (value: string | null) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 250,
              fixed: "right",
              render: (_, record) => (
                <div className="table-actions">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setDetailId(record.id)}
                  >
                    详情
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setRolesFor(record.id)}
                  >
                    角色
                  </Button>
                  {isSuperAdmin &&
                  record.id !== currentUser?.id &&
                  record.isSuperAdmin ? (
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => confirmCancelSuperAdmin(record)}
                    >
                      取消超管
                    </Button>
                  ) : null}
                  {isSuperAdmin || !record.isSuperAdmin ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setPasswordFor(record)}
                    >
                      重置密码
                    </Button>
                  ) : null}
                  {record.isSuperAdmin ? null : (
                    <Button
                      type="link"
                      size="small"
                      danger={record.status === 1}
                      onClick={() => confirmToggle(record)}
                    >
                      {record.status === 1 ? "停用" : "启用"}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          emptyText={<Empty description="暂无账号" />}
        />
      )}

      <Drawer
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="账号详情"
        size={560}
      >
        {detail.isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : detail.isError ? (
          <QueryErrorState
            error={detail.error}
            onRetry={() => void detail.refetch()}
          />
        ) : detail.data ? (
          <Descriptions
            column={1}
            size="small"
            items={[
              { key: "id", label: "账号 ID", children: <span className="tabular">{detail.data.id}</span> },
              { key: "username", label: "用户名", children: <span className="tabular">{detail.data.username}</span> },
              { key: "realName", label: "姓名", children: detail.data.realName },
              { key: "employeeNo", label: "工号", children: <span className="tabular">{detail.data.employeeNo}</span> },
              { key: "mobile", label: "手机号", children: detail.data.mobile ?? "—" },
              { key: "dept", label: "部门", children: detail.data.deptName },
              {
                key: "status",
                label: "状态",
                children: <StatusTag kind="user" value={detail.data.status} />,
              },
              {
                key: "super",
                label: "超级管理员",
                children: detail.data.isSuperAdmin ? "是" : "否",
              },
              {
                key: "authSource",
                label: "账号来源",
                children:
                  detail.data.authSource === "sso" ? "统一认证" : "本地账号",
              },
              {
                key: "roles",
                label: "角色",
                children: detail.data.roleIds?.length
                  ? detail.data.roleIds
                      .map(
                        (roleId) =>
                          roles.data?.list.find(
                            (role) => role.id === roleId,
                          )?.name ?? `#${roleId}`,
                      )
                      .join("、")
                  : "—",
              },
              {
                key: "lastLogin",
                label: "最后登录",
                children: formatDateTime(detail.data.lastLoginAt),
              },
              {
                key: "createdAt",
                label: "创建时间",
                children: formatDateTime(detail.data.createdAt),
              },
            ]}
          />
        ) : null}
      </Drawer>

      <CreateUserModal
        open={creating}
        onClose={() => setCreating(false)}
        onSuccess={() => void query.refetch()}
      />
      <AssignRolesModal
        open={Boolean(rolesFor)}
        userId={rolesFor}
        onClose={() => setRolesFor(null)}
        onSuccess={() => void query.refetch()}
      />
      <ResetPasswordModal
        open={Boolean(passwordFor)}
        user={passwordFor}
        onClose={() => setPasswordFor(null)}
      />
    </PermissionGuard>
  );
}
