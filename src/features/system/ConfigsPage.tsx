import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App, Button, Empty, Input, Modal, Select } from "antd";
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
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import { applyApiFieldErrors } from "../../lib/forms";
import {
  CONFIG_VALUE_TYPE_LABELS,
  toOptions,
} from "../../lib/enums";
import { formatDateTime } from "../../lib/format";
import type { SystemConfigListSearch } from "../../lib/list-search";
import type { ConfigItem } from "../../lib/api/types";
import {
  useConfigs,
  useCreateConfig,
  useDeleteConfig,
  useUpdateConfig,
} from "./queries";

const schema = z
  .object({
    code: z.string().trim().min(1, "请输入配置键").max(100),
    name: z.string().trim().min(1, "请输入配置名称").max(100),
    value: z.string().min(1, "请输入配置值"),
    valueType: z.enum(["string", "number", "boolean", "json"]),
    status: z.number().int().min(0).max(1),
    remark: z.string().max(255).optional(),
  })
  .superRefine((values, ctx) => {
    if (values.valueType === "number" && Number.isNaN(Number(values.value))) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "数字类型的配置值必须是合法数字",
      });
    }
    if (
      values.valueType === "boolean" &&
      !["true", "false"].includes(values.value)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "布尔类型的配置值只能是 true 或 false",
      });
    }
    if (values.valueType === "json") {
      try {
        JSON.parse(values.value);
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["value"],
          message: "JSON 类型的配置值必须是合法 JSON",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;

export function ConfigsPage() {
  const { can } = useAuth();
  const { message, modal } = App.useApp();
  const search = useSearch({ from: "/_app/system/configs" });
  const navigate = useNavigate({ from: "/system/configs" });
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const query = useConfigs({
    page,
    pageSize,
    code: search.code,
    name: search.name,
    status: search.status,
  });
  const createMutation = useCreateConfig();
  const updateMutation = useUpdateConfig();
  const deleteMutation = useDeleteConfig();

  function updateSearch(patch: Partial<SystemConfigListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: "",
      name: "",
      value: "",
      valueType: "string",
      status: 1,
      remark: "",
    },
  });

  useEffect(() => {
    if (!formOpen) return;
    form.reset(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            value: editing.value,
            valueType: editing.valueType,
            status: editing.status,
            remark: editing.remark ?? "",
          }
        : {
            code: "",
            name: "",
            value: "",
            valueType: "string",
            status: 1,
            remark: "",
          },
    );
  }, [formOpen, editing, form]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(record: ConfigItem) {
    setEditing(record);
    setFormOpen(true);
  }

  function confirmDelete(record: ConfigItem) {
    modal.confirm({
      title: "删除系统配置",
      content: `确认删除「${record.name}」（${record.code}）？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(record.id);
          message.success("配置已删除");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  async function submit(values: FormValues) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            name: values.name,
            value: values.value,
            code: values.code,
            valueType: values.valueType,
            status: Number(values.status),
            remark: values.remark?.trim() || undefined,
          },
        });
        message.success("配置已更新");
      } else {
        await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
          value: values.value,
          valueType: values.valueType,
          status: Number(values.status),
          remark: values.remark?.trim() || undefined,
        });
        message.success("配置已创建");
      }
      setFormOpen(false);
      setEditing(null);
      void query.refetch();
    } catch (error) {
      if (!applyApiFieldErrors(error, form.setError)) {
        message.error(
          error instanceof ApiError ? error.message : "保存失败，请稍后重试",
        );
      }
    }
  }

  return (
    <PermissionGuard code="config:list">
      <PageHeader
        title="系统配置"
        description="预约时效、评价窗口、考核权重与归档清理等系统参数。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            {can("config:create") ? (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                新建配置
              </Button>
            ) : null}
          </>
        }
      />

      <FilterBar>
        <Input.Search
          key={`code-${search.code ?? ""}`}
          allowClear
          placeholder="配置键"
          defaultValue={search.code}
          style={{ width: 200 }}
          onSearch={(value) => updateSearch({ code: value.trim() || undefined })}
        />
        <Input.Search
          key={`name-${search.name ?? ""}`}
          allowClear
          placeholder="配置名称"
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
          共 {query.data?.total ?? 0} 条
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<ConfigItem>
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
              title: "配置键",
              dataIndex: "code",
              key: "code",
              width: 240,
              render: (value: string) => (
                <span className="tabular text-xs">{value}</span>
              ),
            },
            { title: "名称", dataIndex: "name", key: "name", width: 200 },
            {
              title: "值",
              dataIndex: "value",
              key: "value",
              ellipsis: true,
            },
            {
              title: "类型",
              dataIndex: "valueType",
              key: "valueType",
              width: 90,
              render: (value: string) => CONFIG_VALUE_TYPE_LABELS[value] ?? value,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              width: 90,
              render: (value: number) => (
                <StatusTag kind="config" value={value} />
              ),
            },
            {
              title: "更新时间",
              dataIndex: "updatedAt",
              key: "updatedAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 130,
              fixed: "right",
              render: (_, record) => (
                <div className="table-actions">
                  {can("config:update") ? (
                    <Button
                      type="link"
                      size="small"
                      onClick={() => openEdit(record)}
                    >
                      编辑
                    </Button>
                  ) : null}
                  {can("config:delete") ? (
                    <Button
                      type="link"
                      size="small"
                      danger
                      onClick={() => confirmDelete(record)}
                    >
                      删除
                    </Button>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyText={<Empty description="暂无系统配置" />}
        />
      )}

      <Modal
        open={formOpen}
        title={editing ? "编辑系统配置" : "新建系统配置"}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        okText="保存"
        cancelText="取消"
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        onOk={() => void form.handleSubmit(submit)()}
        destroyOnHidden
      >
        <FormField
          control={form.control}
          name="code"
          label="配置键"
          required
          extra="建议使用点分命名，例如 assessment.weight.review"
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
          name="name"
          label="配置名称"
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
        <div className="grid gap-x-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="valueType"
            label="值类型"
            required
          >
            {(field) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                options={toOptions(CONFIG_VALUE_TYPE_LABELS, [
                  "string",
                  "number",
                  "boolean",
                  "json",
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
                options={[
                  { value: 1, label: "启用" },
                  { value: 0, label: "停用" },
                ]}
                style={{ width: "100%" }}
              />
            )}
          </FormField>
        </div>
        <FormField control={form.control} name="value" label="配置值" required>
          {(field) => (
            <Input.TextArea
              {...field}
              value={field.value ?? ""}
              rows={3}
              onChange={(event) => field.onChange(event.target.value)}
            />
          )}
        </FormField>
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
    </PermissionGuard>
  );
}
