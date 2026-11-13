import { useState } from "react";
import { App, Button, Card, Empty, Modal, Select, Tag, Upload } from "antd";
import type { UploadFile } from "antd";
import { DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { MATERIAL_KIND_LABELS, enumLabel } from "../../lib/enums";
import { uploadFiles } from "../../lib/api/endpoints/mentor";
import {
  UPLOAD_ACCEPT,
  UPLOAD_ALLOWED_EXT,
  UPLOAD_MAX_COUNT,
  UPLOAD_MAX_SIZE_MB,
  UploadLimitHint,
  uploadFileExt,
} from "../../components/UploadLimitHint";

const MAX_SIZE = UPLOAD_MAX_SIZE_MB * 1024 * 1024;
const MAX_COUNT = UPLOAD_MAX_COUNT;

export interface DraftMaterial {
  fileId: string;
  name: string;
  kind: number;
}

export function MentorDraftMaterials({
  staged,
  onChange,
  disabled,
  title = "草稿佐证材料",
  hint = "先上传到临时区；提交入驻申请后会自动挂到新申请。提交前不会出现在申请详情里。",
  uploadTitle = "上传草稿佐证材料",
}: {
  staged: DraftMaterial[];
  onChange: (next: DraftMaterial[]) => void;
  disabled?: boolean;
  title?: string;
  hint?: string;
  uploadTitle?: string;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [kind, setKind] = useState(1);
  const [uploading, setUploading] = useState(false);

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
      const uploaded = await uploadFiles(files);
      onChange([
        ...staged,
        ...uploaded.map((file) => ({
          fileId: file.id,
          name: file.originName,
          kind,
        })),
      ]);
      message.success(`已上传 ${uploaded.length} 个佐证材料`);
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
    <Card
      title={title}
      className="mt-4"
      extra={
        disabled ? null : (
          <Button
            type="primary"
            size="small"
            icon={<UploadOutlined />}
            onClick={() => setOpen(true)}
          >
            上传佐证
          </Button>
        )
      }
    >
      <p className="mt-0 mb-4 text-xs text-ink-muted">{hint}</p>
      {staged.length ? (
        <div className="divide-y divide-line">
          {staged.map((item) => (
            <div
              key={item.fileId}
              className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
            >
              <Tag className="m-0">
                {enumLabel(MATERIAL_KIND_LABELS, item.kind)}
              </Tag>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {item.name}
              </span>
              {disabled ? null : (
                <Button
                  type="link"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    onChange(staged.filter((f) => f.fileId !== item.fileId))
                  }
                >
                  移除
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无佐证材料"
          className="my-4!"
        />
      )}

      <Modal
        open={open}
        title={uploadTitle}
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
        <UploadLimitHint count={fileList.length} className="mb-4" />
        <div className="mb-4">
          <div className="mb-1 text-[13px] font-medium text-slate-700">
            材料类型
          </div>
          <Select
            value={kind}
            onChange={setKind}
            options={Object.entries(MATERIAL_KIND_LABELS).map(
              ([value, label]) => ({ value: Number(value), label }),
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
