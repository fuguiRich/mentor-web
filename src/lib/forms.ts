import type { FieldPath, FieldValues, UseFormSetError } from "react-hook-form";
import { ApiError } from "./api/client";

/**
 * 把后端 10001 的 data.fields 挂到对应表单字段。
 * 返回 true 表示至少挂上了一个字段错误。
 */
export function applyApiFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean {
  if (!(error instanceof ApiError) || !error.fields?.length) return false;
  for (const field of error.fields) {
    setError(field.field as FieldPath<T>, {
      type: "server",
      message: field.message,
    });
  }
  return true;
}
