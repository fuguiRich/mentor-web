import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import {
  App,
  Button,
  Card,
  Empty,
  Input,
  InputNumber,
  Modal,
  Select,
} from "antd";
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
import type { SystemDictListSearch } from "../../lib/list-search";
import type { DictItem, DictType } from "../../lib/api/types";
import {
  useCreateDictItem,
  useCreateDictType,
  useDeleteDictItem,
  useDeleteDictType,
  useDictItems,
  useDictTypes,
  useUpdateDictItem,
  useUpdateDictType,
} from "./queries";

const typeSchema = z.object({
  code: z.string().trim().min(1, "请输入字典编码").max(100),
  name: z.string().trim().min(1, "请输入字典名称").max(100),
  status: z.number().int().min(0).max(1),
  remark: z.string().max(255).optional(),
});

type TypeValues = z.infer<typeof typeSchema>;

function DictTypeModal({
  open,
  editing,
  onClose,
  onSuccess,
}: {
  open: boolean;
  editing: DictType | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const createMutation = useCreateDictType();
  const updateMutation = useUpdateDictType();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<TypeValues>({
    resolver: zodResolver(typeSchema),
    defaultValues: { code: "", name: "", status: 1, remark: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            code: editing.code,
            name: editing.name,
            status: editing.status,
            remark: editing.remark ?? "",
          }
        : { code: "", name: "", status: 1, remark: "" },
    );
  }, [open, editing, form]);

  async function submit(values: TypeValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            name: values.name,
            code: values.code,
            status: Number(values.status),
            remark: values.remark?.trim() || undefined,
          },
        });
        message.success("字典类型已更新");
      } else {
        await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
          status: Number(values.status),
          remark: values.remark?.trim() || undefined,
        });
        message.success("字典类型已创建");
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
      title={editing ? "编辑字典类型" : "新建字典类型"}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <FormField control={form.control} name="code" label="字典编码" required>
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
      <FormField control={form.control} name="name" label="字典名称" required>
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={100}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField control={form.control} name="status" label="状态" required>
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

const itemSchema = z.object({
  label: z.string().trim().min(1, "请输入显示名").max(100),
  value: z.string().trim().min(1, "请输入值").max(100),
  sortOrder: z.number().int().min(0),
  status: z.number().int().min(0).max(1),
  remark: z.string().max(255).optional(),
});

type ItemValues = z.infer<typeof itemSchema>;

function DictItemModal({
  open,
  dictTypeId,
  editing,
  onClose,
  onSuccess,
}: {
  open: boolean;
  dictTypeId: string;
  editing: DictItem | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { message } = App.useApp();
  const createMutation = useCreateDictItem();
  const updateMutation = useUpdateDictItem();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ItemValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: { label: "", value: "", sortOrder: 0, status: 1, remark: "" },
  });

  useEffect(() => {
    if (!open) return;
    form.reset(
      editing
        ? {
            label: editing.label,
            value: editing.value,
            sortOrder: editing.sortOrder,
            status: editing.status,
            remark: editing.remark ?? "",
          }
        : { label: "", value: "", sortOrder: 0, status: 1, remark: "" },
    );
  }, [open, editing, form]);

  async function submit(values: ItemValues) {
    setSubmitting(true);
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            label: values.label,
            value: values.value,
            sortOrder: Number(values.sortOrder),
            status: Number(values.status),
            remark: values.remark?.trim() || undefined,
          },
        });
        message.success("字典项已更新");
      } else {
        await createMutation.mutateAsync({
          dictTypeId,
          label: values.label,
          value: values.value,
          sortOrder: Number(values.sortOrder),
          status: Number(values.status),
          remark: values.remark?.trim() || undefined,
        });
        message.success("字典项已创建");
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
      title={editing ? "编辑字典项" : "新建字典项"}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onOk={() => void form.handleSubmit(submit)()}
      destroyOnHidden
    >
      <FormField control={form.control} name="label" label="显示名" required>
        {(field) => (
          <Input
            {...field}
            value={field.value ?? ""}
            maxLength={100}
            onChange={(event) => field.onChange(event.target.value)}
          />
        )}
      </FormField>
      <FormField control={form.control} name="value" label="值" required>
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
        <FormField control={form.control} name="sortOrder" label="排序">
          {(field) => (
            <InputNumber
              min={0}
              value={Number(field.value)}
              onChange={(value) => field.onChange(value ?? 0)}
              style={{ width: "100%" }}
            />
          )}
        </FormField>
        <FormField control={form.control} name="status" label="状态" required>
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

export function DictsPage() {
  const { message, modal } = App.useApp();
  const search = useSearch({ from: "/_app/system/dicts" });
  const navigate = useNavigate({ from: "/system/dicts" });

  const [typeModal, setTypeModal] = useState<{
    open: boolean;
    editing: DictType | null;
  }>({ open: false, editing: null });
  const [itemModal, setItemModal] = useState<{
    open: boolean;
    editing: DictItem | null;
  }>({ open: false, editing: null });

  const typePage = search.typePage ?? 1;
  const typePageSize = search.typePageSize ?? 20;
  const itemPage = search.itemPage ?? 1;
  const itemPageSize = search.itemPageSize ?? 20;

  const types = useDictTypes({
    page: typePage,
    pageSize: typePageSize,
    code: search.typeKeyword,
    name: search.typeKeyword,
  });
  const selectedTypeId =
    search.selectedTypeId ?? types.data?.list[0]?.id ?? null;
  const items = useDictItems({
    page: itemPage,
    pageSize: itemPageSize,
    dictTypeId: selectedTypeId ?? undefined,
    label: search.itemKeyword,
  });

  const deleteType = useDeleteDictType();
  const deleteItem = useDeleteDictItem();

  function updateSearch(patch: Partial<SystemDictListSearch>) {
    void navigate({ search: (prev) => ({ ...prev, ...patch }) });
  }

  const selectedType = types.data?.list.find(
    (item) => item.id === selectedTypeId,
  );

  function confirmDeleteType(record: DictType) {
    modal.confirm({
      title: "删除字典类型",
      content: `确认删除「${record.name}」？如仍包含字典项，将无法删除。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteType.mutateAsync(record.id);
          message.success("字典类型已删除");
          if (selectedTypeId === record.id) {
            updateSearch({ selectedTypeId: undefined });
          }
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "删除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  function confirmDeleteItem(record: DictItem) {
    modal.confirm({
      title: "删除字典项",
      content: `确认删除「${record.label}」？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteItem.mutateAsync(record.id);
          message.success("字典项已删除");
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
    <PermissionGuard code="dict:list">
      <PageHeader
        title="数据字典"
        description="维护字典类型与字典项；字典用于自由文本之外的枚举扩展。"
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={types.isFetching || items.isFetching}
            onClick={() => {
              void types.refetch();
              void items.refetch();
            }}
          >
            刷新
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
        <Card
          title="字典类型"
          extra={
            <Button
              type="link"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setTypeModal({ open: true, editing: null })}
            >
              新建
            </Button>
          }
        >
          <FilterBar>
            <Input.Search
              key={`type-keyword-${search.typeKeyword ?? ""}`}
              allowClear
              placeholder="编码 / 名称"
              defaultValue={search.typeKeyword}
              style={{ width: 200 }}
              onSearch={(value) => {
                updateSearch({
                  typeKeyword: value.trim() || undefined,
                  typePage: 1,
                });
              }}
            />
          </FilterBar>
          {types.isError ? (
            <QueryErrorState
              error={types.error}
              onRetry={() => void types.refetch()}
            />
          ) : (
            <DataTable<DictType>
              dataSource={types.data?.list ?? []}
              loading={types.isLoading}
              total={types.data?.total}
              page={typePage}
              pageSize={typePageSize}
              wrapped={false}
              onPageChange={(nextPage, nextSize) => {
                updateSearch({
                  typePage: nextPage,
                  typePageSize: nextSize,
                });
              }}
              rowClassName={(record) =>
                record.id === selectedTypeId ? "bg-accent-soft/50" : ""
              }
              onRow={(record) => ({
                onClick: () => {
                  updateSearch({ selectedTypeId: record.id, itemPage: 1 });
                },
                className: "cursor-pointer",
              })}
              columns={[
                { title: "名称", dataIndex: "name", key: "name" },
                {
                  title: "编码",
                  dataIndex: "code",
                  key: "code",
                  render: (value: string) => (
                    <span className="tabular text-xs">{value}</span>
                  ),
                },
                {
                  title: "状态",
                  dataIndex: "status",
                  key: "status",
                  width: 80,
                  render: (value: number) => (
                    <StatusTag kind="config" value={value} />
                  ),
                },
                {
                  title: "操作",
                  key: "actions",
                  width: 130,
                  render: (_, record) => (
                    <div className="table-actions" onClick={(event) => event.stopPropagation()}>
                      <Button
                        type="link"
                        size="small"
                        onClick={() =>
                          setTypeModal({ open: true, editing: record })
                        }
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        onClick={() => confirmDeleteType(record)}
                      >
                        删除
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyText={<Empty description="暂无字典类型" />}
            />
          )}
        </Card>

        <Card
          title={selectedType ? `字典项 · ${selectedType.name}` : "字典项"}
          extra={
            selectedTypeId ? (
              <Button
                type="link"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setItemModal({ open: true, editing: null })}
              >
                新建
              </Button>
            ) : null
          }
        >
          {!selectedTypeId ? (
            <Empty description="请选择左侧字典类型" />
          ) : (
            <>
              <FilterBar>
                <Input.Search
                  key={`item-keyword-${search.itemKeyword ?? ""}`}
                  allowClear
                  placeholder="显示名"
                  defaultValue={search.itemKeyword}
                  style={{ width: 200 }}
                  onSearch={(value) => {
                    updateSearch({
                      itemKeyword: value.trim() || undefined,
                      itemPage: 1,
                    });
                  }}
                />
              </FilterBar>
              {items.isError ? (
                <QueryErrorState
                  error={items.error}
                  onRetry={() => void items.refetch()}
                />
              ) : (
                <DataTable<DictItem>
                  dataSource={items.data?.list ?? []}
                  loading={items.isLoading}
                  total={items.data?.total}
                  page={itemPage}
                  pageSize={itemPageSize}
                  wrapped={false}
                  onPageChange={(nextPage, nextSize) => {
                    updateSearch({
                      itemPage: nextPage,
                      itemPageSize: nextSize,
                    });
                  }}
                  columns={[
                    { title: "显示名", dataIndex: "label", key: "label" },
                    {
                      title: "值",
                      dataIndex: "value",
                      key: "value",
                      render: (value: string) => (
                        <span className="tabular text-xs">{value}</span>
                      ),
                    },
                    {
                      title: "排序",
                      dataIndex: "sortOrder",
                      key: "sortOrder",
                      width: 70,
                      align: "right",
                    },
                    {
                      title: "状态",
                      dataIndex: "status",
                      key: "status",
                      width: 80,
                      render: (value: number) => (
                        <StatusTag kind="config" value={value} />
                      ),
                    },
                    {
                      title: "操作",
                      key: "actions",
                      width: 120,
                      render: (_, record) => (
                        <div className="table-actions">
                          <Button
                            type="link"
                            size="small"
                            onClick={() =>
                              setItemModal({ open: true, editing: record })
                            }
                          >
                            编辑
                          </Button>
                          <Button
                            type="link"
                            size="small"
                            danger
                            onClick={() => confirmDeleteItem(record)}
                          >
                            删除
                          </Button>
                        </div>
                      ),
                    },
                  ]}
                  emptyText={<Empty description="暂无字典项" />}
                />
              )}
            </>
          )}
        </Card>
      </div>

      <DictTypeModal
        open={typeModal.open}
        editing={typeModal.editing}
        onClose={() => setTypeModal({ open: false, editing: null })}
        onSuccess={() => void types.refetch()}
      />
      <DictItemModal
        open={itemModal.open}
        dictTypeId={selectedTypeId ?? ""}
        editing={itemModal.editing}
        onClose={() => setItemModal({ open: false, editing: null })}
        onSuccess={() => void items.refetch()}
      />
    </PermissionGuard>
  );
}
