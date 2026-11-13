import { describe, expect, it } from "vitest";
import { hasAnyPermission, hasPermission } from "./permissions";

describe("hasPermission", () => {
  it("超级管理员通过任意权限码", () => {
    expect(hasPermission([], "user:list", true)).toBe(true);
    expect(hasPermission(["mentor:search"], "unknown:code", true)).toBe(true);
  });

  it("普通账号只通过已持有的权限码", () => {
    const permissions = ["mentor-application:list", "stats:mentor"];
    expect(hasPermission(permissions, "mentor-application:list", false)).toBe(
      true,
    );
    expect(hasPermission(permissions, "mentor-application:review-sc", false)).toBe(
      false,
    );
  });
});

describe("hasAnyPermission", () => {
  it("任一命中即通过", () => {
    expect(
      hasAnyPermission(
        ["stats:mentor"],
        ["stats:appointment", "stats:mentor"],
        false,
      ),
    ).toBe(true);
  });

  it("全部未命中则拒绝", () => {
    expect(
      hasAnyPermission(["stats:mentor"], ["user:list", "role:list"], false),
    ).toBe(false);
  });
});
