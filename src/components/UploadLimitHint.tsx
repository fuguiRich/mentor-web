import { InfoCircleOutlined } from "@ant-design/icons";

export const UPLOAD_MAX_SIZE_MB = 10;
export const UPLOAD_MAX_COUNT = 10;
export const UPLOAD_ALLOWED_EXT = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "pdf",
];
export const UPLOAD_ACCEPT = ".png,.jpg,.jpeg,.gif,.webp,.bmp,.pdf";

export function uploadFileExt(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

/**
 * 上传限制提示：文件类型、单文件大小、单次数量，以及当前已选数量。
 * 放在文件选择区附近，让用户在选文件前就能看到限制。
 */
export function UploadLimitHint({
  count,
  maxCount = UPLOAD_MAX_COUNT,
  maxSizeMb = UPLOAD_MAX_SIZE_MB,
  className = "",
}: {
  count?: number;
  maxCount?: number;
  maxSizeMb?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-start gap-1.5 text-xs leading-5 text-ink-muted ${className}`}
    >
      <InfoCircleOutlined className="mt-0.5 shrink-0 text-accent" />
      <span>
        支持 png / jpg / jpeg / gif / webp / bmp / pdf，单个文件不超过{" "}
        {maxSizeMb} MB
        {maxCount > 1 ? `，一次最多 ${maxCount} 个` : ""}
        {typeof count === "number" ? `（已选 ${count}/${maxCount}）` : ""}。
      </span>
    </div>
  );
}
