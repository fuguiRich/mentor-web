import { describe, expect, it, vi } from "vitest";
import { applyApiFieldErrors } from "./forms";
import { ApiError } from "./api/client";

describe("applyApiFieldErrors", () => {
  it("把 ApiError.fields 逐个写回表单", () => {
    const setError = vi.fn();
    const error = new ApiError("参数校验失败", {
      code: 10001,
      httpStatus: 400,
      fields: [
        { field: "summary", message: "长度超限" },
        { field: "professionalTitle", message: "不能超过 100 字" },
      ],
    });

    const applied = applyApiFieldErrors(error, setError);

    expect(applied).toBe(true);
    expect(setError).toHaveBeenCalledTimes(2);
    expect(setError).toHaveBeenCalledWith("summary", {
      type: "server",
      message: "长度超限",
    });
    expect(setError).toHaveBeenCalledWith("professionalTitle", {
      type: "server",
      message: "不能超过 100 字",
    });
  });

  it("非 ApiError 或没有字段时不写回", () => {
    const setError = vi.fn();
    expect(applyApiFieldErrors(new Error("boom"), setError)).toBe(false);
    expect(
      applyApiFieldErrors(
        new ApiError("失败", { code: 10003, httpStatus: 403 }),
        setError,
      ),
    ).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });
});
