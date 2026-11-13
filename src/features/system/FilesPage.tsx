import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { App, Button, Empty, Input, Tag } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { PageHeader } from "../../components/PageHeader";
import { FilterBar } from "../../components/FilterBar";
import { DataTable } from "../../components/DataTable";
import { FilePreview } from "../../components/FilePreview";
import { QueryErrorState } from "../../components/ErrorState";
import { PermissionGuard } from "../../components/PermissionGuard";
import { ApiError } from "../../lib/api/client";
import { downloadWithAuth } from "../../lib/download";
import { formatDateTime, formatFileSize } from "../../lib/format";
import type { SystemFileListSearch } from "../../lib/list-search";
import {
  downloadFile,
  previewFile,
} from "../../lib/api/endpoints/system";
import type { FileObject } from "../../lib/api/types";
import { useDeleteFile, useFiles } from "./queries";

export function FilesPage() {
  const { message, modal } = App.useApp();
  const search = useSearch({ from: "/_app/system/files" });
  const navigate = useNavigate({ from: "/system/files" });
  const [preview, setPreview] = useState<FileObject | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const page = search.page ?? 1;
  const pageSize = search.pageSize ?? 20;
  const query = useFiles({
    page,
    pageSize,
    originName: search.originName,
    uploaderId: search.uploaderId,
  });
  const deleteMutation = useDeleteFile();

  function updateSearch(patch: Partial<SystemFileListSearch>) {
    void navigate({
      search: (prev) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });
  }

  async function handleDownload(file: FileObject) {
    setDownloading(file.id);
    try {
      await downloadWithAuth(() => downloadFile(file.id), file.originName);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  function confirmDelete(file: FileObject) {
    modal.confirm({
      title: "删除文件",
      content: `确认删除「${file.originName}」？如仍被业务数据引用，将无法删除。`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await deleteMutation.mutateAsync(file.id);
          message.success("文件已删除");
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
    <PermissionGuard code="file:list">
      <PageHeader
        title="文件管理"
        description="查看与下载业务上传的文件；文件列表不按归属过滤，仅管理员可用。"
        extra={
          <Button
            icon={<ReloadOutlined />}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            刷新
          </Button>
        }
      />

      <FilterBar>
        <Input.Search
          key={`originName-${search.originName ?? ""}`}
          allowClear
          placeholder="文件名"
          defaultValue={search.originName}
          style={{ width: 220 }}
          onSearch={(value) =>
            updateSearch({ originName: value.trim() || undefined })
          }
        />
        <Input.Search
          key={`uploaderId-${search.uploaderId ?? ""}`}
          allowClear
          placeholder="上传人 ID"
          defaultValue={search.uploaderId}
          style={{ width: 140 }}
          onSearch={(value) =>
            updateSearch({ uploaderId: value.trim() || undefined })
          }
        />
        <span className="ml-auto text-xs text-ink-muted">
          共 {query.data?.total ?? 0} 个文件
        </span>
      </FilterBar>

      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <DataTable<FileObject>
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
              title: "文件名",
              dataIndex: "originName",
              key: "originName",
              ellipsis: true,
            },
            {
              title: "类型",
              dataIndex: "ext",
              key: "ext",
              width: 80,
              render: (value: string) => (
                <Tag className="m-0">{value?.toUpperCase()}</Tag>
              ),
            },
            {
              title: "大小",
              dataIndex: "size",
              key: "size",
              width: 100,
              render: (value: number) => formatFileSize(value),
            },
            {
              title: "上传人编号",
              dataIndex: "uploaderId",
              key: "uploaderId",
              width: 100,
              render: (value: string) => (
                <span className="tabular">#{value}</span>
              ),
            },
            {
              title: "归属（类型 / 编号）",
              key: "owner",
              width: 170,
              render: (_, record) =>
                record.ownerType ? (
                  <span className="text-xs">
                    {record.ownerType} / {record.ownerId ?? "—"}
                  </span>
                ) : (
                  "—"
                ),
            },
            {
              title: "上传时间",
              dataIndex: "createdAt",
              key: "createdAt",
              width: 170,
              render: (value: string) => formatDateTime(value),
            },
            {
              title: "操作",
              key: "actions",
              width: 190,
              fixed: "right",
              render: (_, record) => (
                <div className="table-actions">
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setPreview(record)}
                  >
                    预览
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloading === record.id}
                    onClick={() => void handleDownload(record)}
                  >
                    下载
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => confirmDelete(record)}
                  >
                    删除
                  </Button>
                </div>
              ),
            },
          ]}
          emptyText={<Empty description="暂无文件" />}
        />
      )}

      <FilePreview
        open={Boolean(preview)}
        title={preview?.originName ?? "文件预览"}
        mimeType={preview?.mimeType}
        loader={preview ? () => previewFile(preview.id) : null}
        onClose={() => setPreview(null)}
      />
    </PermissionGuard>
  );
}
