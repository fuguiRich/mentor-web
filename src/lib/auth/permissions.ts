export function hasPermission(
  permissions: readonly string[],
  code: string,
  isSuperAdmin: boolean,
): boolean {
  return isSuperAdmin || permissions.includes(code);
}

export function hasAnyPermission(
  permissions: readonly string[],
  codes: readonly string[],
  isSuperAdmin: boolean,
): boolean {
  return isSuperAdmin || codes.some((code) => permissions.includes(code));
}
