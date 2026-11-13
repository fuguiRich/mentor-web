import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch, filenameFromDisposition } from "./client";
import { clearTokens, getTokens, setTokens } from "../auth/token-store";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const ok = (data: unknown) =>
  json({ code: 0, message: "ok", data, traceId: "trace-1" });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  clearTokens();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  clearTokens();
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("成功时返回 data", async () => {
    fetchMock.mockResolvedValue(ok({ value: 1 }));

    const data = await apiFetch<{ value: number }>("/x");

    expect(data).toEqual({ value: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3001/x");
  });

  it("HTTP 200 但 code 非 0 也按失败处理", async () => {
    fetchMock.mockResolvedValue(
      json({
        code: 10003,
        message: "无权限",
        data: null,
        traceId: "trace-2",
      }),
    );

    await expect(apiFetch("/x")).rejects.toMatchObject({
      name: "ApiError",
      code: 10003,
      message: "无权限",
      traceId: "trace-2",
    });
  });

  it("把 data.fields 带进 ApiError", async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          code: 10001,
          message: "参数校验失败",
          data: { fields: [{ field: "summary", message: "长度超限" }] },
        },
        400,
      ),
    );

    try {
      await apiFetch("/x", { method: "POST", body: { summary: "x" } });
      expect.unreachable("应当抛出 ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).fields).toEqual([
        { field: "summary", message: "长度超限" },
      ]);
      expect((error as ApiError).httpStatus).toBe(400);
    }
  });

  it("请求前发现令牌将过期时先刷新，且并发只刷新一次", async () => {
    setTokens({ accessToken: "old", refreshToken: "r1", expiresIn: 0 });
    let refreshCalls = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return ok({
          accessToken: "new",
          refreshToken: "r2",
          expiresIn: 3600,
        });
      }
      return ok({ ok: true });
    });

    await Promise.all([apiFetch("/a"), apiFetch("/b")]);

    expect(refreshCalls).toBe(1);
    expect(getTokens()?.accessToken).toBe("new");
  });

  it("401 时刷新后重试一次", async () => {
    setTokens({ accessToken: "old", refreshToken: "r1", expiresIn: 3600 });
    let businessCalls = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/auth/refresh")) {
        return ok({
          accessToken: "new",
          refreshToken: "r2",
          expiresIn: 3600,
        });
      }
      businessCalls += 1;
      if (businessCalls === 1) {
        return json(
          { code: 10002, message: "登录已过期", data: null },
          401,
        );
      }
      return ok({ ok: true });
    });

    const result = await apiFetch<{ ok: boolean }>("/x");

    expect(result).toEqual({ ok: true });
    expect(businessCalls).toBe(2);
    expect(getTokens()?.accessToken).toBe("new");
  });

  it("刷新失败时清空令牌并抛出 10002", async () => {
    setTokens({ accessToken: "old", refreshToken: "r1", expiresIn: 3600 });

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/auth/refresh")) {
        return json({ code: 20104, message: "refresh 无效", data: null }, 401);
      }
      return json({ code: 10002, message: "登录已过期", data: null }, 401);
    });

    await expect(apiFetch("/x")).rejects.toMatchObject({ code: 10002 });
    expect(getTokens()).toBeNull();
  });

  it("账号停用 20102 时直接清空令牌，不尝试刷新", async () => {
    setTokens({ accessToken: "old", refreshToken: "r1", expiresIn: 3600 });
    let refreshCalls = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      if (String(input).includes("/auth/refresh")) {
        refreshCalls += 1;
        return ok({
          accessToken: "new",
          refreshToken: "r2",
          expiresIn: 3600,
        });
      }
      return json(
        { code: 20102, message: "账号已停用", data: null },
        401,
      );
    });

    await expect(apiFetch("/x")).rejects.toMatchObject({ code: 20102 });
    expect(refreshCalls).toBe(0);
    expect(getTokens()).toBeNull();
  });
});

describe("filenameFromDisposition", () => {
  it("解析 RFC 5987 编码的文件名", () => {
    expect(
      filenameFromDisposition(
        "attachment; filename*=UTF-8''%E5%AF%BC%E5%B8%88.csv",
      ),
    ).toBe("导师.csv");
  });

  it("回退到普通文件名", () => {
    expect(
      filenameFromDisposition('attachment; filename="mentors.csv"'),
    ).toBe("mentors.csv");
  });
});
