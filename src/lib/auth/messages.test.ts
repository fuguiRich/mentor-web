import { describe, expect, it } from "vitest";
import { ApiError } from "../api/client";
import { changePasswordErrorMessage, loginErrorMessage } from "./messages";

function apiError(code: number, message = "backend message"): ApiError {
  return new ApiError(message, { code, httpStatus: 400 });
}

describe("loginErrorMessage", () => {
  it("按错误码返回稳定文案", () => {
    expect(loginErrorMessage(apiError(20101))).toBe("用户名或密码错误");
    expect(loginErrorMessage(apiError(20102))).toBe(
      "账号已停用，请联系管理员",
    );
    expect(loginErrorMessage(apiError(20103))).toBe(
      "尝试次数过多，请 15 分钟后再试",
    );
    expect(loginErrorMessage(apiError(20107))).toBe(
      "统一认证已通过，但本系统没有对应账号，请联系管理员",
    );
    expect(loginErrorMessage(apiError(20108))).toBe(
      "统一认证暂不可用，请稍后重试",
    );
    expect(loginErrorMessage(apiError(20109))).toBe(
      "统一认证配置异常，请联系管理员",
    );
  });

  it("未知错误码回退后端 message", () => {
    expect(loginErrorMessage(apiError(99999, "自定义错误"))).toBe(
      "自定义错误",
    );
  });

  it("普通 Error 与未知值有回退", () => {
    expect(loginErrorMessage(new Error("网络断开"))).toBe("网络断开");
    expect(loginErrorMessage(null)).toBe("登录失败，请稍后重试。");
  });
});

describe("changePasswordErrorMessage", () => {
  it("原密码错误与 SSO 账号有专门提示", () => {
    expect(changePasswordErrorMessage(apiError(20105))).toBe("原密码错误");
    expect(changePasswordErrorMessage(apiError(20112))).toBe(
      "统一认证账号请在统一认证平台修改密码",
    );
  });

  it("其他错误回退后端 message", () => {
    expect(changePasswordErrorMessage(apiError(10001, "参数错误"))).toBe(
      "参数错误",
    );
  });
});
