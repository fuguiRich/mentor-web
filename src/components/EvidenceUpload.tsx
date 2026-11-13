import { useState } from "react";
import { App, Button, Modal, Upload } from "antd";
import type { UploadFile } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { formatFileSize } from "../lib/format";
import { uploadFiles } from "../lib/api/endpoints/mentor";
import type { FileRef } from "../lib/api/types";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXT,
  UPLOAD_MAX_COUNT,
  UPLOAD_MAX_SIZE_MB,
  UploadLimitHint,
  uploadFileExt,
} from "./UploadLimitHint";

const MAX_SIZE = UPLOAD_MAX_SIZE_MB * 1024 * 1024;

/**
 * 通用佐证附件上传：先上传到 /files，再把文件元数据交给调用方。
 * 归档 / 申诉等表单用 fileIds 提交，文件本体由后端按 fileId 关联。
 */
export function EvidenceUpload({
  value,
  onChange,
  title = "佐证附件",
  hint,
  maxCount = UPLOAD_MAX_COUNT,
  disabled,
}: {
  value: FileRef[];
  onChange: (next: FileRef[]) => void;
  title?: string;
  hint?: string;
  maxCount?: number;
  disabled?: boolean;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const remaining = Math.max(0, maxCount - value.length);

  async function handleUpload() {
    const files = fileList
      .map((item) => item.originFileObj)
      .filter(Boolean) as File[];
    if (!files.length) {
      message.warning("请选择要上传的文件");
      return;
    }
    if (files.length > remaining) {
      message.error(`最多还能上传 ${remaining} 个文件`);
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadFiles(files);
      onChange([
        ...value,
        ...uploaded.map((file) => ({
          id: file.id,
          originName: file.originName,
          mimeType: file.mimeType,
          size: file.size,
        })),
      ]);
      message.success(`已上传 ${uploaded.length} 个文件`);
      setFileList([]);
      setOpen(false);
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : "上传失败，请稍后重试",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-ink">{title}</span>
        <Button
          size="small"
          icon={<UploadOutlined />}
          disabled={disabled || remaining === 0}
          onClick={() => setOpen(true)}
        >
          上传附件
        </Button>
      </div>
      {hint ? (
        <p className="mt-0 mb-2 text-xs text-ink-muted">{hint}</p>
      ) : null}

      {value.length ? (
        <div className="divide-y divide-line rounded-md border border-line px-3">
          {value.map((file) => (
            <div key={file.id} className="flex items-center gap-2 py-2">
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {file.originName}
              </span>
              <span className="shrink-0 text-xs text-ink-muted">
                {formatFileSize(file.size)}
              </span>
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={disabled}
                onClick={() =>
                  onChange(value.filter((item) => item.id !== file.id))
                }
              >
                移除
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-line px-3 py-4 text-center text-xs text-ink-muted">
          暂未上传附件
        </div>
      )}

      <UploadLimitHint count={value.length} maxCount={maxCount} className="mt-1.5" />

      <Modal
        open={open}
        title="上传佐证附件"
        onCancel={() => {
          setOpen(false);
          setFileList([]);
        }}
        okText="上传"
        cancelText="取消"
        confirmLoading={uploading}
        onOk={() => void handleUpload()}
        destroyOnHidden
      >
        <UploadLimitHint count={fileList.length} maxCount={maxCount} className="mb-4" />
        <Upload
          multiple
          beforeUpload={(file) => {
            if (!UPLOAD_ALLOWED_EXT.includes(uploadFileExt(file.name))) {
              message.error(`「${file.name}」类型不支持，仅支持图片或 PDF`);
              return Upload.LIST_IGNORE;
            }
            if (file.size > MAX_SIZE) {
              message.error(`「${file.name}」超过 ${UPLOAD_MAX_SIZE_MB} MB`);
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          fileList={fileList}
          onChange={({ fileList: next }) => {
            if (next.length > remaining) {
              message.warning(
                `最多还能选择 ${remaining} 个文件，已保留前 ${remaining} 个`,
              );
              next = next.slice(0, remaining);
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
    </div>
  );
}