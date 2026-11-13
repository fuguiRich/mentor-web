import { useEffect, useRef, useState } from "react";
import { Alert, Button, Modal, Spin } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import type { BlobResult } from "../lib/api/client";
import { downloadBlob } from "../lib/format";

interface FilePreviewProps {
  open: boolean;
  title: string;
  mimeType?: string | null;
  loader: (() => Promise<BlobResult>) | null;
  onClose: () => void;
}

/** 受鉴权保护的图片 / PDF 在线预览；其他类型提供下载。 */
export function FilePreview({
  open,
  title,
  mimeType,
  loader,
  onClose,
}: FilePreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    async function load() {
      const current = loaderRef.current;
      if (!current) return;
      setLoading(true);
      setError(null);
      setUrl(null);
      setBlob(null);
      try {
        const result = await current();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(result.blob);
        setBlob(result.blob);
        setUrl(objectUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "文件加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
      setBlob(null);
    };
  }, [open]);

  const resolvedType = blob?.type || mimeType || "";
  const isImage = resolvedType.startsWith("image/");
  const isPdf = resolvedType === "application/pdf";

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onClose}
      width={900}
      footer={
        <div className="flex justify-end gap-2">
          {blob ? (
            <Button
              icon={<DownloadOutlined />}
              onClick={() => downloadBlob(blob, title)}
            >
              下载
            </Button>
          ) : null}
          <Button type="primary" onClick={onClose}>
            关闭
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spin description="正在加载文件…" />
        </div>
      ) : error ? (
        <Alert type="error" showIcon title={error} />
      ) : isImage && url ? (
        <img
          src={url}
          alt={title}
          className="mx-auto max-h-[70vh] max-w-full object-contain"
        />
      ) : isPdf && url ? (
        <iframe
          src={url}
          title={title}
          className="h-[70vh] w-full border-0"
        />
      ) : url ? (
        <Alert
          type="info"
          showIcon
          title="该文件类型不支持在线预览，请下载后查看。"
        />
      ) : null}
    </Modal>
  );
}
