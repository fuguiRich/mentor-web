import { describe, expect, it } from "vitest";
import { noticeFromTokens } from "./login-notice";

describe("noticeFromTokens", () => {
  it("没有提示时返回 null", () => {
    expect(noticeFromTokens({})).toBeNull();
    expect(
      noticeFromTokens({ ssoUnavailable: false, isDefaultPwd: false }),
    ).toBeNull();
    expect(noticeFromTokens({ isDefaultPwd: null })).toBeNull();
  });

  it("SSO 回退本地密码时返回回退提示", () => {
    expect(
      noticeFromTokens({ ssoUnavailable: true, isDefaultPwd: false }),
    ).toEqual({ ssoUnavailable: true, isDefaultPwd: false });
  });

  it("仍使用初始密码时返回默认密码提示", () => {
    expect(
      noticeFromTokens({ ssoUnavailable: false, isDefaultPwd: true }),
    ).toEqual({ ssoUnavailable: false, isDefaultPwd: true });
  });

  it("两个提示可以同时存在", () => {
    expect(
      noticeFromTokens({ ssoUnavailable: true, isDefaultPwd: true }),
    ).toEqual({ ssoUnavailable: true, isDefaultPwd: true });
  });
});
