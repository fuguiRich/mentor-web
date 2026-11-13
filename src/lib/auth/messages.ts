import { ApiError } from "../api/client";

/**
 * 登录相关的稳定文案。后端已经不会回显 SSO 原始 msg，
 * 这里再按错误码兜底一层，避免不同网关/版本文案漂移。
 */
const LOGIN_ERROR_MESSAGES: Record<number, string> = {
  20101: "用户名或密码错误",
  20102: "账号已停用，请联系管理员",
  20103: "尝试次数过多，请 15 分钟后再试",
  20106: "统一认证未通过，请重新登录",
  20107: "统一认证已通过，但本系统没有对应账号，请联系管理员",
  20108: "统一认证暂不可用，请稍后重试",
  20109: "统一认证配置异常，请联系管理员",
  20110: "请求过于频繁，请稍后重试",
  20111: "统一认证返回异常，请稍后重试",
  20112: "统一认证账号请在统一认证平台修改密码",
  20113: "账号创建失败，请联系管理员",
};

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return LOGIN_ERROR_MESSAGES[error.code] ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "登录失败，请稍后重试。";
}

export function changePasswordErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 20105) return "原密码错误";
    if (error.code === 20112) {
      return "统一认证账号请在统一认证平台修改密码";
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "修改失败，请稍后重试。";
}
