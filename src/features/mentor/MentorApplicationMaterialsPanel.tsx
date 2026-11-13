import { useState } from "react";
import { App, Button, Card, Empty, Modal, Select, Upload } from "antd";
import type { UploadFile } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { DataTable } from "../../components/DataTable";
import { FilePreview } from "../../components/FilePreview";
import { QueryErrorState } from "../../components/ErrorState";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXT,
  UPLOAD_MAX_COUNT,
  UPLOAD_MAX_SIZE_MB,
  UploadLimitHint,
  uploadFileExt,
} from "../../components/UploadLimitHint";
import { MATERIAL_KIND_LABELS, enumLabel } from "../../lib/enums";
import { formatDateTime, formatFileSize } from "../../lib/format";
import { downloadWithAuth } from "../../lib/download";
import { uploadFiles } from "../../lib/api/endpoints/mentor";
import type { Material } from "../../lib/api/types";
import {
  downloadMyMaterial,
  previewMyMaterial,
} from "../../lib/api/endpoints/mentor";
import {
  useAttachMyMaterial,
  useMyMaterials,
  useRemoveMyMaterial,
} from "./queries";

const MAX_SIZE = UPLOAD_MAX_SIZE_MB * 1024 * 1024;
const MAX_COUNT = UPLOAD_MAX_COUNT;

interface Props {
  applicationId: string;
  canEdit: boolean;
}

export function MentorApplicationMaterialsPanel({
  applicationId,
  canEdit,
}: Props) {
  const { message, modal } = App.useApp();
  const query = useMyMaterials(applicationId);
  const attach = useAttachMyMaterial(applicationId);
  const remove = useRemoveMyMaterial(applicationId);

  const [preview, setPreview] = useState<Material | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [kind, setKind] = useState(1);
  const [uploading, setUploading] = useState(false);

  async function handleDownload(material: Material) {
    setDownloading(material.id);
    try {
      await downloadWithAuth(
        () => downloadMyMaterial(applicationId, material.id),
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

  function confirmRemove(material: Material) {
    modal.confirm({
      title: "移除佐证材料",
      content: `确认从申请中移除「${material.originName}」？文件本身仍会保留。`,
      okText: "移除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        try {
          await remove.mutateAsync(material.id);
          message.success("材料已移除");
        } catch (error) {
          message.error(
            error instanceof Error ? error.message : "移除失败，请稍后重试",
          );
          throw error;
        }
      },
    });
  }

  async function handleUpload() {
    const files = fileList
      .map((item) => item.originFileObj)
      .filter(Boolean) as File[];

    if (!files.length) {
      message.warning("请选择要上传的文件");
      return;
    }
    if (files.length > MAX_COUNT) {
      message.error(`一次最多上传 ${MAX_COUNT} 个文件`);
      return;
    }
    for (const file of files) {
      if (!UPLOAD_ALLOWED_EXT.includes(uploadFileExt(file.name))) {
        message.error(`「${file.name}」类型不支持，仅支持图片或 PDF`);
        return;
      }
      if (file.size > MAX_SIZE) {
        message.error(`「${file.name}」超过 10 MB`);
        return;
      }
    }

    setUploading(true);
    try {
      const uploaded = await uploadFiles(files, {
        ownerType: "MentorApplication",
        ownerId: applicationId,
      });
      for (const file of uploaded) {
        await attach.mutateAsync({ fileId: file.id, kind });
      }
      message.success(`已上传并挂接 ${uploaded.length} 个材料`);
      setFileList([]);
      setUploadOpen(false);
      void query.refetch();
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "上传失败，请稍后重试",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card
      title="佐证材料"
      className="mt-4"
      extra={
        canEdit ? (
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            onClick={() => setUploadOpen(true)}
          >
            上传材料
          </Button>
        ) : (
          <span className="text-xs text-ink-muted">
            仅审核中 / 已退回的申请可上传材料
          </span>
        )
      }
    >
      {query.isError ? (
        <QueryErrorState
          error={query.error}
          onRetry={() => void query.refetch()}
        />
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
              render: (value: number) => enumLabel(MATERIAL_KIND_LABELS, value),
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
              width: 100,
              render: (value: number) => formatFileSize(value),
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
                  {canEdit ? (
                    <Button
                      type="link"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => confirmRemove(material)}
                    >
                      移除
                    </Button>
                  ) : null}
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
            ? () => previewMyMaterial(applicationId, preview.id)
            : null
        }
        onClose={() => setPreview(null)}
      />

      <Modal
        open={uploadOpen}
        title="上传佐证材料"
        onCancel={() => {
          setUploadOpen(false);
          setFileList([]);
        }}
        okText="上传并挂接"
        cancelText="取消"
        confirmLoading={uploading}
        onOk={() => void handleUpload()}
        destroyOnHidden
      >
        <UploadLimitHint count={fileList.length} className="mb-4" />
        <div className="mb-4">
          <div className="mb-1 text-[13px] font-medium text-slate-700">
            材料类型
          </div>
          <Select
            value={kind}
            onChange={setKind}
            options={Object.entries(MATERIAL_KIND_LABELS).map(
              ([value, label]) => ({
                value: Number(value),
                label,
              }),
            )}
            style={{ width: "100%" }}
          />
        </div>
        <Upload
          multiple
          beforeUpload={(file) => {
            if (!UPLOAD_ALLOWED_EXT.includes(uploadFileExt(file.name))) {
              message.error(`「${file.name}」类型不支持，仅支持图片或 PDF`);
              return Upload.LIST_IGNORE;
            }
            if (file.size > MAX_SIZE) {
              message.error(`「${file.name}」超过 10 MB`);
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          fileList={fileList}
          onChange={({ fileList: next }) => {
            if (next.length > MAX_COUNT) {
              message.warning(
                `一次最多选择 ${MAX_COUNT} 个文件，已保留前 ${MAX_COUNT} 个`,
              );
              next = next.slice(0, MAX_COUNT);
            }
            setFileList(next);
          }}
          onRemove={(file) => {
            setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
          }}
          accept={UPLOAD_ACCEPT}
        >
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      </Modal>
    </Card>
  );
}
