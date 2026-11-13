import { describe, expect, it } from "vitest";
import {
  enumLabel,
  statusMeta,
  statusOptions,
  toOptions,
} from "./enums";

describe("statusMeta", () => {
  it("返回已知状态的文案与颜色", () => {
    expect(statusMeta("application", 6)).toEqual({
      label: "已通过",
      color: "success",
    });
    expect(statusMeta("appointment", 5).label).toBe("异议复核中");
    expect(statusMeta("assessment", 0).label).toBe("待初评");
  });

  it("空值与未知值有安全回退", () => {
    expect(statusMeta("application", null)).toEqual({
      label: "—",
      color: "default",
    });
    expect(statusMeta("application", 99).label).toBe("未知(99)");
  });

  it("同步流水状态", () => {
    expect(statusMeta("sync", 0)).toEqual({
      label: "运行中",
      color: "processing",
    });
    expect(statusMeta("sync", 1).label).toBe("成功");
    expect(statusMeta("sync", 2).label).toBe("部分成功");
    expect(statusMeta("sync", 3).label).toBe("失败");
  });
});

describe("statusOptions", () => {
  it("把状态表转换成下拉选项", () => {
    const options = statusOptions("appeal");
    expect(options).toEqual([
      { value: 0, label: "待处理" },
      { value: 1, label: "已受理" },
      { value: 2, label: "已驳回" },
    ]);
  });
});

describe("enumLabel", () => {
  it("空值显示破折号，未知值回退原始值", () => {
    expect(enumLabel({ 1: "一" }, null)).toBe("—");
    expect(enumLabel({ 1: "一" }, 1)).toBe("一");
    expect(enumLabel({ 1: "一" }, 2)).toBe("2");
  });
});

describe("toOptions", () => {
  it("按给定顺序生成选项", () => {
    expect(
      toOptions({ 1: "竞赛", 2: "项目", 3: "其他" }, [3, 1]),
    ).toEqual([
      { value: 3, label: "其他" },
      { value: 1, label: "竞赛" },
    ]);
  });
});
