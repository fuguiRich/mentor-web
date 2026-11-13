import type { AuthTokens } from "../api/types";

export interface LoginNotice {
  ssoUnavailable: boolean;
  isDefaultPwd: boolean;
}

/**
 * 登录响应 → 需要展示的提示。
 * - ssoUnavailable：SSO 网络不可达，已回退本地密码
 * - isDefaultPwd：SSO 判断仍在使用初始密码
 */
export function noticeFromTokens(
  tokens: Pick<AuthTokens, "ssoUnavailable" | "isDefaultPwd">,
): LoginNotice | null {
  const ssoUnavailable = tokens.ssoUnavailable === true;
  const isDefaultPwd = tokens.isDefaultPwd === true;
  if (!ssoUnavailable && !isDefaultPwd) return null;
  return { ssoUnavailable, isDefaultPwd };
}
