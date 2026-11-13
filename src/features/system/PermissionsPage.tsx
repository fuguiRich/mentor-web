import { useEffect, useState } from "react";
import { App, Button, Empty, Input, InputNumber, Modal, Select } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "../../components/PageHeader";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { FormField } from "../../components/FormField";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import { PERMISSION_TYPE_LABELS, toOptions } from "../../lib/enums";
import type { Permission } from "../../lib/api/types";
import {
  useCreatePermission,
  useDeletePermission,
  usePermissionTree,
  useUpdatePermission,
} from "./queries";

const schema = z.object({
  parentId: z.string().optional(),
  type: z.enum(["DIR", "MENU", "BUTTON"]),
  code: z.string().max(100).optional(),
  name: z.string().trim().min(1, "请输入权限名称").max(100),
  path: z.string().max(200).optional(),
  component: z.string().max(200).optional(),
  icon: z.string().max(100).optional(),
  sortOrder: z.number().int().min(0),
  status: z.number().int().min(0).max(1),
});

type FormValues = z.infer<typeof schema>;

function flattenPermissions(
  nodes: Permission[],
  depth = 0,
  result: { value: string; label: string }[] = [],
  excludeId?: string,
): { value: string; label: string }[] {
  for (const node of nodes) {
    if (node.id === excludeId) continue;
    result.push({
      value: node.id,
      label: `${"　".repeat(depth)}${node.name}`,
    });
    if (node.children?.length) {
      flattenPermissions(node.children, depth + 1, result, excludeId);
    }
  }
  return result;
}

function PermissionFormModal({
  open,
  editing,
  parentId,
  tree,
  onClose,
  onSuccess,
}: {
  open: boolean;
  editing: Permission | null;
  parentId?: string;
  tree: Permission[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const createMutation = useCreatePermission();
  const updateMutation = useUpdatePermission();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      parentId: undefined,
      type: "BUTTON",
      code: "",
      name: "",
      path: "",
      component: "",
      icon: "",
      sortOrder: 0,
      status: 1,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            parentId: editing.parentId ?? undefined,
            type: editing.type,
            code: editing.code ?? "",
            name: editing.name,
            path: editing.path ?? "",
            component: editing.component ?? "",
            icon: editing.icon ?? "",
            sortOrder: editing.sortOrder,
            status: editing.status,
          }
        : {
            parentId,
            type: "BUTTON",
            code: "",
            name: "",
            path: "",
            component: "",
            icon: "",
            sortOrder: 0,
            status: 1,
          },
    );
  }, [open, editing, parentId, form]);

  async function submit(values: FormValues) {
    setSubmitting(true);
    try {
      const body = {
        parentId: values.parentId || undefined,
        type: values.type,
        code: values.code?.trim() || undefined,
        name: values.name.trim(),
        path: values.path?.trim() || undefined,
        component: values.component?.trim() || undefined,
        icon: values.icon?.trim() || undefined,
        sortOrder: Number(values.sortOrder),
        status: Number(values.status),
      };
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, body });
        message.success("权限点已更新");
      } else {
        await createMutation.mutateAsync(body);
        message.success("权限点已创建");
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
      title={editing ? "编辑权限点" : "新建权限点"}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      width={640}
      destroyOnHidden
    >
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="parentId"
          label="父级权限点"
          extra="留空表示顶级节点"
        >
          {(field) => (
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              value={field.value || undefined}
              onChange={field.onChange}
              options={flattenPermissions(tree, 0, [], editing?.id)}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="type"
          label="类型"
          required
        >
          {(field) => (
            <Select
              value={field.value}
              onChange={field.onChange}
              options={toOptions(PERMISSION_TYPE_LABELS, [
                "DIR",
                "MENU",
                "BUTTON",
              ])}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
      </div>
      <FormField
        control={form.control}
        name="name"
        label="名称"
        required
      >
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={100}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField
        control={form.control}
        name="code"
        label="权限码"
        extra="例如 mentor-application:review-college；按钮类通常必填。"
      >
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={100}
            className="tabular"
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <FormField control={form.control} name="path" label="路由路径">
          {(field) => (
            <Input
              {...field}
              value={field.value ?? ""}
              maxLength={200}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField control={form.control} name="component" label="组件">
          {(field) => (
            <Input
              {...field}
              value={field.value ?? ""}
              maxLength={200}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField control={form.control} name="icon" label="图标">
          {(field) => (
            <Input
              {...field}
              value={field.value ?? ""}
              maxLength={100}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
        <FormField
          control={form.control}
          name="sortOrder"
          label="排序"
        >
          {(field) => (
            <InputNumber
              min={0}
              value={Number(field.value)}
              onChange={(value) => field.onChange(value ?? 0)}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
      </div>
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
            options={[
              { value: 1, label: "启用" },
              { value: 0, label: "停用" },
            ]}
            style={{ width: 160 }}
          />
        )}
      </FormField>
    </Modal>
  );
}

export function PermissionsPage() {
  const { message, modal } = App.useApp();
  const query = usePermissionTree();
  const deleteMutation = useDeletePermission();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [parentId, setParentId] = useState<string | undefined>();

  function confirmDelete(permission: Permission) {
    modal.confirm({
      title: "删除权限点",
      content: `确认删除「${permission.name}」？已绑定该权限的角色会失去它。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(permission.id);
          message.success("权限点已删除");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  return (
    <PermissionGuard code="permission:list">
      <PageHeader
        title="权限点"
        description="维护目录、菜单与按钮权限；权限码同时控制平台菜单与接口校验。"
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
                setParentId(undefined);
                setFormOpen(true);
              }}
            >
              新建权限点
            </Button>
          </>
        }
      />

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<Permission>
          dataSource={query.data ?? []}
          loading={query.isLoading}
          pagination={false}
          expandable={{ defaultExpandAllRows: true }}
          columns={[
            {
              title: "名称",
              dataIndex: "name",
              key: "name",
              width: 220,
            },
            {
              title: "类型",
              dataIndex: "type",
              key: "type",
              width: 90,
              render: (value: string) => PERMISSION_TYPE_LABELS[value] ?? value,
            },
            {
              title: "权限码",
              dataIndex: "code",
              key: "code",
              width: 260,
              render: (value: string | null) =>
                value ? <span className="tabular text-xs">{value}</span> : "—",
            },
            {
              title: "路径",
              dataIndex: "path",
              key: "path",
              width: 180,
              render: (value: string | null) => value || "—",
            },
            {
              title: "排序",
              dataIndex: "sortOrder",
              key: "sortOrder",
              width: 80,
              align: "right",
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 90,
              render: (value: number) => <StatusTag kind="config" value={value} />,
            },
            {
              title: "操作",
              key: "actions",
              width: 200,
              fixed: "right",
              render: (_, record) => (
                <div className="table-actions">
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditing(null);
                      setParentId(record.id);
                      setFormOpen(true);
                    }}
                  >
                    子项
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setEditing(record);
                      setParentId(undefined);
                      setFormOpen(true);
                    }}
                  >
                    编辑
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => confirmDelete(record)}
                  >
                    删除
                  </Button>
                </div>
              ),
            },
          ]}
          emptyText={<Empty description="暂无权限点" />}
        />
      )}

      <PermissionFormModal
        open={formOpen}
        editing={editing}
        parentId={parentId}
        tree={query.data ?? []}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setParentId(undefined);
        }}
        onSuccess={() => void query.refetch()}
      />
    </PermissionGuard>
  );
}
