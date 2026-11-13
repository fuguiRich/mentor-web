import { useState } from "react";
import { App, Button, Card, Empty } from "antd";
import { DownloadOutlined, EyeOutlined } from "@ant-design/icons";
import { DataTable } from "../../components/DataTable";
import { FilePreview } from "../../components/FilePreview";
import { QueryErrorState } from "../../components/ErrorState";
import { MATERIAL_KIND_LABELS, enumLabel } from "../../lib/enums";
import { formatDateTime, formatFileSize } from "../../lib/format";
import { downloadWithAuth } from "../../lib/download";
import {
  downloadMaterial,
  previewMaterial,
} from "../../lib/api/endpoints/applications";
import type { Material } from "../../lib/api/types";
import { useMaterials } from "./queries";

export function MaterialsPanel({ applicationId }: { applicationId: string }) {
  const { message } = App.useApp();
  const query = useMaterials(applicationId);
  const [preview, setPreview] = useState<Material | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleDownload(material: Material) {
    setDownloading(material.id);
    try {
      await downloadWithAuth(
        () => downloadMaterial(applicationId, material.id),
        material.originName,
      );
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "下载失败，请稍后重试",
      );
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Card title="佐证材料" className="mt-4">
      {query.isError ? (
        <QueryErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <DataTable<Material>
          dataSource={query.data?.list ?? []}
          loading={query.isLoading}
          pagination={false}
          wrapped={false}
          columns={[
            {
              title: "材料类型",
              dataIndex: "kind",
              key: "kind",
              width: 120,
              render: (kind: number) => enumLabel(MATERIAL_KIND_LABELS, kind),
            },
            {
              title: "文件名",
              dataIndex: "originName",
              key: "originName",
              ellipsis: true,
            },
            {
              title: "大小",
              dataIndex: "size",
              key: "size",
              width: 110,
              render: (size: number) => formatFileSize(size),
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
              width: 150,
              render: (_, material) => (
                <div className="table-actions">
                  <Button
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => setPreview(material)}
                  >
                    预览
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    loading={downloading === material.id}
                    onClick={() => void handleDownload(material)}
                  >
                    下载
                  </Button>
                </div>
              ),
            },
          ]}
          emptyText={<Empty description="暂无佐证材料" />}
        />
      )}

      <FilePreview
        open={Boolean(preview)}
        title={preview?.originName ?? "材料预览"}
        mimeType={preview?.mimeType}
        loader={
          preview
            ? () => previewMaterial(applicationId, preview.id)
            : null
        }
        onClose={() => setPreview(null)}
      />
    </Card>
  );
}
