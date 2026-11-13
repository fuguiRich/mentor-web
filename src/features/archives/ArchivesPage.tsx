import { useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App, Button, Empty, Input, Select, Tag } from "antd";
import {
  ClearOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { StatusTag } from "../../components/StatusTag";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { useAuth } from "../../lib/auth/AuthProvider";
import { ApiError } from "../../lib/api/client";
import { useDepts } from "../../lib/hooks/useDepts";
import { useMentorOptions } from "../../lib/hooks/useMentorOptions";
import { flattenDepts } from "../../lib/tree";
import {
  ARCHIVE_CATEGORY_LABELS,
  ARCHIVE_TARGET_TYPE_LABELS,
  enumLabel,
  toOptions,
} from "../../lib/enums";
import { formatDate, formatDateTime } from "../../lib/format";
import type { ArchiveListSearch } from "../../lib/list-search";
import type { ArchiveItem } from "../../lib/api/types";
import { ArchiveDetailDrawer } from "./ArchiveDetailDrawer";
import { ArchiveFormModal } from "./ArchiveFormModal";
import {
  useArchives,
  useDeleteArchive,
  usePurgeArchives,
} from "./queries";

export function ArchivesPage() {
  const search = useSearch({ from: "/_app/archives/" });
  const navigate = useNavigate({ from: "/archives/" });
  const { can, isSuperAdmin } = useAuth();
  const { message, modal } = App.useApp();
  const depts = useDepts();
  const mentorOptions = useMentorOptions();
  const mentorNameMap = useMemo(
    () =>
      new Map(
        (mentorOptions.data?.list ?? []).map((mentor) => [
          mentor.id,
          mentor.name,
        ]),
      ),
    [mentorOptions.data],
  );
  const deleteMutation = useDeleteArchive();
  const purgeMutation = usePurgeArchives();

  const [detailId, setDetailId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<ArchiveItem | null>(null);

  const canManage = can("archive:manage");
  const schoolWide = isSuperAdmin || can("mentor-application:review-sc");
  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const rangeReady = Boolean(search.from && search.to);

  const query = useArchives({
    page,
    pageSize,
    mentorId: search.mentorId,
    deptId: schoolWide ? search.deptId : undefined,
    category: search.category,
    targetType: search.targetType,
    from: rangeReady ? search.from : undefined,
    to: rangeReady ? search.to : undefined,
  });

  function updateSearch(patch: Partial<ArchiveListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  function confirmPurge() {
    modal.confirm({
      title: "执行过期清理",
      content:
        "只会清理非核心且已过保留期的归档条目；文件对象不会被删除。此操作幂等，可重复执行。",
      okText: "执行清理",
      cancelText: "取消",
      onOk: async () => {
        try {
          const result = await purgeMutation.mutateAsync();
          message.success(`清理完成，共清理 ${result.purged} 条`);
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "清理失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  function confirmDelete(archive: ArchiveItem) {
    modal.confirm({
      title: "取消归档",
      content: `确认取消归档「${archive.title}」？条目会软删，文件对象保留。`,
      okText: "取消归档",
      okButtonProps: { danger: true },
      cancelText: "保留",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(archive.id);
          message.success("归档已取消");
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
    <PermissionGuard code="archive:list">
      <PageHeader
        title="归档管理"
        description="检索导师入驻、考核、指导记录与成果归档；核心材料长期保存。"
        extra={
          <>
            <Button
              icon={<ReloadOutlined />}
              loading={query.isFetching}
              onClick={() => void query.refetch()}
            >
              刷新
            </Button>
            {canManage ? (
              <>
                <Button
                  icon={<ClearOutlined />}
                  loading={purgeMutation.isPending}
                  onClick={confirmPurge}
                >
                  清理过期
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setEditing(null);
                    setFormMode("create");
                  }}
                >
                  新建归档
                </Button>
              </>
            ) : null}
          </>
        }
      />

      <FilterBar>
        <Select
          allowClear
          placeholder="全部分类"
          value={search.category}
          onChange={(value) => updateSearch({ category: value || undefined })}
          options={toOptions(ARCHIVE_CATEGORY_LABELS, [
            "mentor-application",
            "assessment",
            "guidance-record",
            "achievement",
            "other",
          ])}
          style={{ minWidth: 140 }}
        />
        <Select
          allowClear
          placeholder="全部目标类型"
          value={search.targetType}
          onChange={(value) => updateSearch({ targetType: value || undefined })}
          options={toOptions(ARCHIVE_TARGET_TYPE_LABELS, [
            "MentorApplication",
            "Assessment",
            "GuidanceRecord",
            "Achievement",
            "StudentAchievement",
            "Other",
          ])}
          style={{ minWidth: 150 }}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="全部导师"
          value={search.mentorId}
          onChange={(value) => updateSearch({ mentorId: value || undefined })}
          options={(mentorOptions.data?.list ?? []).map((mentor) => ({
            value: mentor.id,
            label: `${mentor.name}（${mentor.deptName}）`,
          }))}
          loading={mentorOptions.isFetching}
          style={{ minWidth: 180 }}
        />
        {schoolWide ? (
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="全部部门"
            value={search.deptId}
            onChange={(value) => updateSearch({ deptId: value || undefined })}
            options={flattenDepts(depts.data ?? [])}
            loading={depts.isLoading}
            style={{ minWidth: 150 }}
          />
        ) : null}
        <Input
          type="date"
          aria-label="归档时间起"
          value={search.from ?? ""}
          onChange={(event) =>
            updateSearch({ from: event.target.value || undefined })
          }
          style={{ width: 145 }}
        />
        <span className="text-ink-muted">至</span>
        <Input
          type="date"
          aria-label="归档时间止"
          value={search.to ?? ""}
          onChange={(event) =>
            updateSearch({ to: event.target.value || undefined })
          }
          style={{ width: 145 }}
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
        <DataTable<ArchiveItem>
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
              title: "标题",
              dataIndex: "title",
              key: "title",
              ellipsis: true,
              render: (title: string, record) => (
                <Button
                  type="link"
                  className="p-0! text-left"
                  onClick={() => setDetailId(record.id)}
                >
                  {title}
                </Button>
              ),
            },
            {
              title: "分类",
              dataIndex: "category",
              key: "category",
              width: 110,
              render: (category: string) => (
                <Tag className="m-0">
                  {enumLabel(ARCHIVE_CATEGORY_LABELS, category)}
                </Tag>
              ),
            },
            {
              title: "目标类型",
              dataIndex: "targetType",
              key: "targetType",
              width: 120,
              render: (targetType: string) =>
                enumLabel(ARCHIVE_TARGET_TYPE_LABELS, targetType),
            },
            {
              title: "附件",
              key: "files",
              width: 90,
              render: (_, record) =>
                record.files?.length ? (
                  <Tag color="success" className="m-0">
                    {record.files.length} 个
                  </Tag>
                ) : (
                  "—"
                ),
            },
            {
              title: "导师",
              dataIndex: "mentorId",
              key: "mentorId",
              width: 90,
              render: (mentorId: string | null) =>
                mentorId ? (
                  mentorNameMap.get(mentorId) ?? (
                    <span className="tabular">导师编号 #{mentorId}</span>
                  )
                ) : (
                  <span className="tabular">—</span>
                ),
            },
            {
              title: "属性",
              dataIndex: "core",
              key: "core",
              width: 90,
              render: (core: number) => <StatusTag kind="core" value={core} />,
            },
            {
              title: "归档时间",
              dataIndex: "archivedAt",
              key: "archivedAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "保留至",
              dataIndex: "retentionUntil",
              key: "retentionUntil",
              width: 120,
              render: (value: string | null) => formatDate(value),
            },
            {
              title: "操作",
              key: "actions",
              width: canManage ? 170 : 80,
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
                  {canManage ? (
                    <>
                      <Button
                        type="link"
                        size="small"
                        onClick={() => {
                          setEditing(record);
                          setFormMode("edit");
                        }}
                      >
                        编辑
                      </Button>
                      <Button
                        type="link"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => confirmDelete(record)}
                      >
                        取消
                      </Button>
                    </>
                  ) : null}
                </div>
              ),
            },
          ]}
          emptyText={
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                search.category || search.targetType || search.mentorId
                  ? "没有符合筛选条件的归档"
                  : "暂无归档"
              }
            />
          }
        />
      )}

      <ArchiveDetailDrawer
        archiveId={detailId}
        onClose={() => setDetailId(null)}
      />

      <ArchiveFormModal
        open={formMode !== null}
        mode={formMode ?? "create"}
        archive={editing}
        onClose={() => {
          setFormMode(null);
          setEditing(null);
        }}
        onSuccess={() => void query.refetch()}
      />
    </PermissionGuard>
  );
}
