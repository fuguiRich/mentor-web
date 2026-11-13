import type { ReactNode } from "react";
import { Button, Result } from "antd";
import { Link } from "@tanstack/react-router";
import { ApiError } from "../lib/api/client";

export function ForbiddenState({ message }: { message?: string }) {
  return (
    <Result
      status="403"
      title="无权限访问"
      subTitle={message ?? "当前账号没有该功能的权限，请联系管理员。"}
      extra={
        <Link to="/">
          <Button type="primary">返回工作台</Button>
        </Link>
      }
    />
  );
}

export function NotFoundState({ message }: { message?: string }) {
  return (
    <Result
      status="404"
      title="未找到"
      subTitle={message ?? "资源不存在或已被删除。"}
      extra={
        <Link to="/">
          <Button type="primary">返回工作台</Button>
        </Link>
      }
    />
  );
}

export function QueryErrorState({
  error,
  onRetry,
  extra,
}: {
  error: unknown;
  onRetry?: () => void;
  extra?: ReactNode;
}) {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : "加载失败，请稍后重试。";
  const traceId = error instanceof ApiError ? error.traceId : undefined;

  return (
    <Result
      status="error"
      title="加载失败"
      subTitle={
        <span>
          {message}
          {traceId ? (
            <span className="mt-1 block text-xs text-ink-muted">
              traceId：{traceId}
            </span>
          ) : null}
        </span>
      }
      extra={
        <div className="flex items-center justify-center gap-2">
          {onRetry ? (
            <Button type="primary" onClick={onRetry}>
              重试
            </Button>
          ) : null}
          {extra}
        </div>
      }
    />
  );
}
