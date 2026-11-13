import { useEffect, useState } from "react";
import { App, Button, Descriptions, Drawer, Skeleton, Tag } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { QueryErrorState } from "../../components/ErrorState";
import { FilePreview } from "../../components/FilePreview";
import { StatusTag } from "../../components/StatusTag";
import { ApiError } from "../../lib/api/client";
import { useDepts } from "../../lib/hooks/useDepts";
import { flattenDepts } from "../../lib/tree";
import { downloadWithAuth } from "../../lib/download";
import {
  downloadArchiveFile,
  previewArchiveFile,
} from "../../lib/api/endpoints/archives";
import {
  ARCHIVE_CATEGORY_LABELS,
  ARCHIVE_TARGET_TYPE_LABELS,
  enumLabel,
} from "../../lib/enums";
import { formatDate, formatDateTime, formatFileSize } from "../../lib/format";
import type { FileRef } from "../../lib/api/types";
import { useMentorNameMap } from "../assessments/queries";
import { useArchive, useUpdateArchiveCore } from "./queries";

interface ArchiveDetailDrawerProps {
  archiveId: string | null;
  onClose: () => void;
}

export function ArchiveDetailDrawer({
  archiveId,
  onClose,
}: ArchiveDetailDrawerProps) {
  const query = useArchive(archiveId);
  const coreMutation = useUpdateArchiveCore();
  const { message, modal } = App.useApp();
  const depts = useDepts();
  const mentorNames = useMentorNameMap();
  const deptOptions = flattenDepts(depts.data ?? []);
  const [preview, setPreview] = useState<FileRef | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (!archiveId) {
      setPreview(null);
      setDownloading(null);
    }
  }, [archiveId]);

  async function handleDownload(file: FileRef) {
    if (!archiveId) return;
    setDownloading(file.id);
    try {
      await downloadWithAuth(
        () => downloadArchiveFile(archiveId, file.id),
        file.originName,
      );
    } catch (error) {
      message.error(
        error instanceof ApiError ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  const archive = query.data;

  function confirmCore() {
    if (!archive) return;
    const next = archive.core === 1 ? 0 : 1;
    modal.confirm({
      title: next === 1 ? "设为核心材料" : "设为非核心材料",
      content:
        next === 1
          ? "核心材料永久保存，保留截止日会被清空。"
          : "非核心材料会按当前配置重新计算保留期，到期后自动清理。",
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        try {
          await coreMutation.mutateAsync({ id: archive.id, core: next });
          message.success(next === 1 ? "已设为核心" : "已设为非核心");
        } catch (error) {
          message.error(
            error instanceof ApiError ? error.message : "操作失败，请稍后重试",
          );
        }
      },
    });
  }
  const deptName = archive?.deptId
    ? deptOptions.find((dept) => dept.value === archive.deptId)?.label.trim() ??
      `学院编号 #${archive.deptId}`
    : "—";
  const mentorName = archive?.mentorId
    ? mentorNames.map.get(archive.mentorId) ??
      `导师编号 #${archive.mentorId}`
    : "—";

  const filesNode = archive?.files?.length ? (
    <div className="space-y-1.5">
      {archive.files.map((file) => (
        <div key={file.id} className="flex flex-wrap items-center gap-1.5">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            className="p-0!"
            onClick={() => setPreview(file)}
          >
            {file.originName}
          </Button>
          <span className="text-xs text-ink-muted">
            {formatFileSize(file.size)}
          </span>
          <Button
            type="link"
            size="small"
            icon={<DownloadOutlined />}
            loading={downloading === file.id}
            onClick={() => void handleDownload(file)}
          >
            下载
          </Button>
        </div>
      ))}
    </div>
  ) : (
    <span className="text-xs text-ink-muted">暂无附件</span>
  );

  return (
    <Drawer
      open={Boolean(archiveId)}
      onClose={onClose}
      title="归档详情"
      size={560}
      extra={
        archive ? (
          <Button loading={coreMutation.isPending} onClick={confirmCore}>
            {archive.core === 1 ? "设为非核心" : "设为核心"}
          </Button>
        ) : null
      }
    >
      {query.isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
      ) : query.data ? (
        <Descriptions
          column={1}
          size="small"
          items={[
            {
              key: "title",
              label: "标题",
              children: query.data.title,
            },
            {
              key: "files",
              label: "附件",
              children: filesNode,
            },
            {
              key: "category",
              label: "分类",
              children: (
                <Tag className="m-0">
                  {enumLabel(ARCHIVE_CATEGORY_LABELS, query.data.category)}
                </Tag>
              ),
            },
            {
              key: "targetType",
              label: "目标类型",
              children: enumLabel(
                ARCHIVE_TARGET_TYPE_LABELS,
                query.data.targetType,
              ),
            },
            {
              key: "targetId",
              label: "目标编号",
              children: (
                <span className="tabular">{query.data.targetId}</span>
              ),
            },
            {
              key: "mentorId",
              label: "导师",
              children: mentorName,
            },
            {
              key: "deptId",
              label: "归属学院",
              children: deptName,
            },
            {
              key: "core",
              label: "材料属性",
              children: <StatusTag kind="core" value={query.data.core} />,
            },
            {
              key: "archivedAt",
              label: "归档时间",
              children: formatDateTime(query.data.archivedAt),
            },
            {
              key: "retentionUntil",
              label: "保留截止日",
              children: formatDate(query.data.retentionUntil),
            },
            {
              key: "summary",
              label: "摘要",
              children: query.data.summary || "—",
            },
            {
              key: "createdAt",
              label: "创建时间",
              children: formatDateTime(query.data.createdAt),
            },
          ]}
        />
      ) : null}

      <FilePreview
        open={Boolean(preview)}
        title={preview?.originName ?? "附件预览"}
        mimeType={preview?.mimeType}
        loader={
          preview && archiveId
            ? () => previewArchiveFile(archiveId, preview.id)
            : null
        }
        onClose={() => setPreview(null)}
      />
    </Drawer>
  );
}
