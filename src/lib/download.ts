import type { BlobResult } from "./api/client";
import { downloadBlob } from "./format";

/** 用带鉴权的 loader 取 blob，并按后端文件名或回退名下载。 */
export async function downloadWithAuth(
  loader: () => Promise<BlobResult>,
  fallbackName: string,
): Promise<void> {
  const { blob, filename } = await loader();
  downloadBlob(blob, filename ?? fallbackName);
}

/** 预览用：取 blob 并生成可回收的对象 URL。 */
export async function objectUrlFrom(
  loader: () => Promise<BlobResult>,
): Promise<string> {
  const { blob } = await loader();
  return URL.createObjectURL(blob);
}
