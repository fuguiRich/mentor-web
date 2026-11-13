import { describe, expect, it } from "vitest";
import { buildNavItems } from "./nav-items";

interface Item {
  key?: string;
  label?: string;
  children?: Item[];
}

function collectKeys(items: unknown): string[] {
  const list = (items ?? []) as Item[];
  return list.flatMap((item) => [
    ...(item.key ? [item.key] : []),
    ...collectKeys(item.children),
  ]);
}

function findLabel(items: unknown, key: string): string | undefined {
  const list = (items ?? []) as Item[];
  for (const item of list) {
    if (item.key === key && item.label) return item.label;
    const nested = findLabel(item.children, key);
    if (nested) return nested;
  }
  return undefined;
}

const TEACHER_PERMS = [
  "mentor:profile",
  "mentor:profile-update",
  "mentor-application:submit",
  "mentor-application:withdraw",
  "mentor-application:list",
  "mentor:search",
  "message:list",
  "file:create",
];

const MENTOR_PERMS = [
  "mentor:profile",
  "mentor:profile-update",
  "mentor:slot-manage",
  "mentor:search",
  "mentor-application:submit",
  "mentor-application:withdraw",
  "mentor-application:list",
  "appointment:list",
  "appointment:handle",
  "review:list",
  "achievement:list",
  "achievement:manage",
  "assessment:list",
  "assessment:appeal",
  "stats:guidance",
  "archive:list",
  "student-achievement:list",
  "message:list",
];

const ADMIN_PERMS = [
  "mentor-application:list",
  "mentor-application:review-college",
  "mentor:search",
  "appointment:list",
  "appointment:adjudicate",
  "assessment:list",
  "assessment:evaluate",
  "stats:mentor",
  "stats:appointment",
  "stats:guidance",
  "stats:assessment",
  "archive:list",
  "student-achievement:list",
  "student-achievement:manage",
  "message:list",
  "work:progress",
  "file:list",
];

describe("buildNavItems", () => {
  it("导师账号只显示导师服务组、消息，不显示管理端工作台", () => {
    const items = buildNavItems(MENTOR_PERMS, false);
    const keys = collectKeys(items);

    expect(keys).toContain("group-导师服务");
    expect(keys).toContain("/mentor");
    expect(keys).toContain("/mentor/profile");
    expect(keys).toContain("/mentor/appointments");
    expect(keys).toContain("/mentor/records");
    expect(keys).toContain("/assessments");
    expect(keys).toContain("/messages");
    expect(findLabel(items, "/mentor")).toBe("导师工作台");
    expect(findLabel(items, "/mentor/profile")).toBe("我的档案");

    expect(keys).not.toContain("/");
    expect(keys).not.toContain("/mentor/achievements");
    expect(keys).not.toContain("group-导师工作台");
    expect(keys).not.toContain("/applications");
    expect(keys).not.toContain("/mentors");
    expect(keys).not.toContain("/stats");
    expect(keys).not.toContain("/system/users");
  });

  it("教师账号显示教师服务组和申请成为导师入口，不显示管理端工作台", () => {
    const items = buildNavItems(TEACHER_PERMS, false);
    const keys = collectKeys(items);

    expect(keys).toContain("group-教师服务");
    expect(keys).toContain("/mentor");
    expect(keys).toContain("/mentor/profile");
    expect(keys).toContain("/mentor/applications");
    expect(keys).toContain("/messages");
    expect(findLabel(items, "/mentor/profile")).toBe("申请成为导师");
    expect(findLabel(items, "/mentor")).toBe("导师申请");

    expect(keys).not.toContain("/");
    expect(keys).not.toContain("group-导师申请");
    expect(keys).not.toContain("/mentor/slots");
    expect(keys).not.toContain("/mentor/appointments");
    expect(keys).not.toContain("/mentor/records");
    expect(keys).not.toContain("/mentor/achievements");
    expect(keys).not.toContain("/assessments");
    expect(keys).not.toContain("/archives");
    expect(keys).not.toContain("/student-achievements");
    expect(keys).not.toContain("/stats");
    expect(keys).not.toContain("/system/users");
  });

  it("学院管理员显示管理端工作台与业务组，不显示导师服务组", () => {
    const keys = collectKeys(buildNavItems(ADMIN_PERMS, false));

    expect(keys).toContain("/");
    expect(keys).toContain("/applications");
    expect(keys).toContain("/mentors");
    expect(keys).toContain("/appointments");
    expect(keys).toContain("/assessments");
    expect(keys).toContain("/stats");
    expect(keys).toContain("/archives");
    expect(keys).toContain("/student-achievements");

    expect(keys).not.toContain("group-导师服务");
    expect(keys).not.toContain("/mentor/profile");
  });

  it("管理员兼导师时保留两个入口，且名称可区分", () => {
    const items = buildNavItems([...ADMIN_PERMS, ...MENTOR_PERMS], false);
    const keys = collectKeys(items);

    expect(keys).toContain("/");
    expect(keys).toContain("group-导师服务");
    expect(keys).toContain("/mentor");
    expect(findLabel(items, "/")).toBe("工作台");
    expect(findLabel(items, "/mentor")).toBe("导师工作台");
  });

  it("超级管理员显示系统管理，但不显示导师服务组", () => {
    const keys = collectKeys(buildNavItems([], true));

    expect(keys).toContain("/system/users");
    expect(keys).toContain("/system/roles");
    expect(keys).toContain("/system/oplogs");
    expect(keys).not.toContain("group-导师服务");
  });

  it("没有权限的账号只看到工作台", () => {
    const keys = collectKeys(buildNavItems([], false));
    expect(keys).toContain("/");
    expect(keys).not.toContain("group-导师服务");
    expect(keys).not.toContain("/messages");
  });
});
