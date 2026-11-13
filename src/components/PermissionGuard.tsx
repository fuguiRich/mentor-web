import type { ReactNode } from "react";
import { useAuth } from "../lib/auth/AuthProvider";
import { ForbiddenState } from "./ErrorState";

interface PermissionGuardProps {
  code: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({
  code,
  children,
  fallback,
}: PermissionGuardProps) {
  const { can } = useAuth();
  if (!can(code)) return fallback ?? <ForbiddenState />;
  return children;
}

/** 按钮级权限：无权限时不渲染。 */
export function Can({
  code,
  children,
}: {
  code: string;
  children: ReactNode;
}) {
  const { can } = useAuth();
  return can(code) ? children : null;
}
