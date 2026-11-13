import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App, Alert, Button, Empty, Input, Modal, Select, Tag, Tree } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { FormField } from "../../components/FormField";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { ROLE_DATA_SCOPE_LABELS, toOptions } from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { SystemRoleListSearch } from "../../lib/list-search";
import type { Permission, Role } from "../../lib/api/types";
import {
  useAssignRolePermissions,
  useCreateRole,
  useDeleteRole,
  usePermissionTree,
  useRole,
  useRoles,
  useUpdateRole,
  useUpdateRoleStatus,
} from "./queries";

const roleSchema = z.object({
  name: z.string().trim().min(1, "请输入角色名称").max(50),
  code: z.string().trim().min(1, "请输入角色编码").max(50),
  dataScope: z.enum(["all", "deptAndChildren", "dept", "self"]),
  status: z.number().int().min(0).max(1),
  remark: z.string().max(255).optional(),
});

type RoleValues = z.infer<typeof roleSchema>;

function RoleFormModal({
  open,
  role,
  onClose,
  onSuccess,
}: {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const [submitting, setSubmitting] = useState(false);
  const builtIn = role?.code === "super_admin";

  const form = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: "",
      code: "",
      dataScope: "self",
      status: 1,
      remark: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      role
        ? {
            name: role.name,
            code: role.code,
            dataScope: role.dataScope,
            status: role.status,
            remark: role.remark ?? "",
          }
        : { name: "", code: "", dataScope: "self", status: 1, remark: "" },
    );
  }, [open, role, form]);

  async function submit(values: RoleValues) {
    setSubmitting(true);
    try {
      if (role) {
        await updateMutation.mutateAsync({
          id: role.id,
          body: {
            name: values.name,
            remark: values.remark?.trim() || undefined,
            ...(builtIn
              ? {}
              : {
                  code: values.code,
                  dataScope: values.dataScope,
                  status: Number(values.status),
                }),
          },
        });
        message.success("角色已更新");
      } else {
        await createMutation.mutateAsync({
          name: values.name,
          code: values.code,
          dataScope: values.dataScope,
          status: Number(values.status),
          remark: values.remark?.trim() || undefined,
        });
        message.success("角色已创建");
      }
      onSuccess();
      onClose();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "保存失败，请稍后重试",
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={role ? "编辑角色" : "新建角色"}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      {builtIn ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          title="内置角色"
          description="超级管理员固定为 super_admin / 全校 / 启用，不可修改编码、数据范围或停用；仅可维护名称与备注。"
        />
      ) : null}
      <FormField control={form.control} name="name" label="角色名称" required>
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={50}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="code"
        label="角色编码"
        required
        extra="例如 college_admin / sc_admin；编码用于系统绑定。"
      >
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={50}
            disabled={builtIn}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="dataScope"
          label="数据范围"
          required
        >
          {(field) => (
            <Select
              value={field.value}
              onChange={field.onChange}
              disabled={builtIn}
              options={toOptions(ROLE_DATA_SCOPE_LABELS, [
                "all",
                "deptAndChildren",
                "dept",
                "self",
              ])}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="status"
          label="状态"
          required
        >
          {(field) => (
            <Select
              value={Number(field.value)}
              onChange={field.onChange}
              disabled={builtIn}
              options={[
                { value: 1, label: "启用" },
                { value: 0, label: "停用" },
              ]}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
      </div>
      <FormField control={form.control} name="remark" label="备注">
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={255}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
    </Modal>
  );
}

function toTreeData(nodes: Permission[]): {
  key: string;
  title: string;
  children: ReturnType<typeof toTreeData>;
}[] {
  return nodes.map((node) => ({
    key: node.id,
    title: `${node.name}${node.code ? `（${node.code}）` : ""}`,
    children: toTreeData(node.children ?? []),
  }));
}

function PermissionAssignModal({
  open,
  roleId,
  onClose,
  onSuccess,
}: {
  open: boolean;
  roleId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const permissions = usePermissionTree();
  const role = useRole(open ? roleId : null);
  const mutation = useAssignRolePermissions();
  const [checked, setChecked] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && role.data) setChecked(role.data.permissionIds);
  }, [open, role.data]);

  async function submit() {
    if (!roleId) return;
    setSubmitting(true);
    try {
      await mutation.mutateAsync({ id: roleId, permissionIds: checked });
      message.success("权限分配已保存");
      onSuccess();
      onClose();
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "保存失败，请稍后重试",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      title={
        role.data ? `分配权限 · ${role.data.name}` : "分配权限"
      }
      onCancel={onClose}
      okText="保存权限"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void submit()}
      width={640}
      destroyOnHidden
    >
      {permissions.isError ? (
        <QueryErrorState
          error={permissions.error}
          onRetry={() => void permissions.refetch()}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-muted">
            勾选后全量覆盖该角色的权限；父节点与子节点会一起保存。
          </p>
          <div className="max-h-[55vh] overflow-auto rounded-md border border-line p-3">
            <Tree
              checkable
              defaultExpandAll
              treeData={toTreeData(permissions.data ?? [])}
              checkedKeys={checked}
              onCheck={(keys) =>
                setChecked(
                  Array.isArray(keys)
                    ? (keys as string[])
                    : (keys.checked as string[]),
                )
              }
            />
          </div>
        </>
      )}
    </Modal>
  );
}

export function RolesPage() {
  const { message, modal } = App.useApp();
  const search = useSearch({ from: "/_app/system/roles" });
  const navigate = useNavigate({ from: "/system/roles" });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const query = useRoles({
    page,
    pageSize,
    name: search.name,
    status: search.status,
  });
  const deleteMutation = useDeleteRole();
  const statusMutation = useUpdateRoleStatus();

  function updateSearch(patch: Partial<SystemRoleListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  function confirmDelete(role: Role) {
    modal.confirm({
      title: "删除角色",
      content: `确认删除角色「${role.name}」？已绑定该角色的账号会失去对应权限。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(role.id);
          message.success("角色已删除");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  async function toggleStatus(role: Role) {
    const next = role.status === 1 ? 0 : 1;
    try {
      await statusMutation.mutateAsync({ id: role.id, status: next });
      message.success(next === 1 ? "角色已启用" : "角色已停用");
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "操作失败，请稍后重试",
      );
    }
  }

  return (
    <PermissionGuard code="role:list">
      <PageHeader
        title="角色权限"
        description="维护角色、数据范围与权限点绑定；super_admin 为内置角色，自动拥有全部权限。"
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
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              新建角色
            </Button>
          </>
        }
      />

      <FilterBar>
        <Input.Search
          key={`name-${search.name ?? ""}`}
          allowClear
          placeholder="角色名称"
          defaultValue={search.name}
          style={{ width: 180 }}
          onSearch={(value) => updateSearch({ name: value.trim() || undefined })}
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
          共 {query.data?.total ?? 0} 个角色
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<Role>
          dataSource={query.data?.list ?? []}
          loading={query.isLoading}
          total={query.data?.total}
          page={page}
          pageSize={pageSize}
          onPageChange={(nextPage, nextSize) =>
            updateSearch({ page: nextPage, pageSize: nextSize })
          }
          columns={[
            { title: "角色名称", dataIndex: "name", key: "name", width: 160 },
            {
              title: "编码",
              dataIndex: "code",
              key: "code",
              width: 160,
              render: (value: string) => (
                <span className="tabular text-xs">{value}</span>
              ),
            },
            {
              title: "数据范围",
              dataIndex: "dataScope",
              key: "dataScope",
              width: 140,
              render: (value: string) =>
                ROLE_DATA_SCOPE_LABELS[value] ?? value,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 90,
              render: (value: number) => <StatusTag kind="role" value={value} />,
            },
            {
              title: "备注",
              dataIndex: "remark",
              key: "remark",
              ellipsis: true,
              render: (value: string | null) => value || "—",
            },
            {
              title: "创建时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 230,
              fixed: "right",
              render: (_, record) => (
                <div className="table-actions">
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setEditing(record);
                      setFormOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                  {record.code === "super_admin" ? (
                    <Tag color="gold" className="m-0">
                      内置 · 全部权限
                    </Tag>
                  ) : (
                    <>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => setPermissionsFor(record.id)}
                      >
                        权限
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => void toggleStatus(record)}
                      >
                        {record.status === 1 ? "停用" : "启用"}
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => confirmDelete(record)}
                      >
                        删除
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
          emptyText={<Empty description="暂无角色" />}
        />
      )}

      <RoleFormModal
        open={formOpen}
        role={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={() => void query.refetch()}
      />
      <PermissionAssignModal
        open={Boolean(permissionsFor)}
        roleId={permissionsFor}
        onClose={() => setPermissionsFor(null)}
        onSuccess={() => void query.refetch()}
      />
    </PermissionGuard>
  );
}
