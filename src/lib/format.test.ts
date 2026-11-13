import { describe, expect, it } from "vitest";
import {
  currentPeriod,
  formatDate,
  formatDateTime,
  formatDuration,
  formatFileSize,
  formatRate,
  parseContentDisposition,
  periodOptions,
  toLocalDateTimeInput,
  todayDate,
} from "./format";

describe("formatDateTime", () => {
  it("空值与非法值有安全回退", () => {
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });

  it("把 ISO 时间转成本地格式", () => {
    expect(formatDateTime("2026-11-03T02:05:00.000Z")).toMatch(
      /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}$/,
    );
  });
});

describe("formatDate", () => {
  it("纯日期原样展示（斜杠分隔）", () => {
    expect(formatDate("2026-11-03")).toBe("2026/11/03");
  });

  it("空值显示破折号", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatFileSize", () => {
  it("按 B / KB / MB 换算", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10.00 MB");
  });

  it("空值显示破折号", () => {
    expect(formatFileSize(null)).toBe("—");
  });
});

describe("formatDuration", () => {
  it("分钟与小时组合", () => {
    expect(formatDuration(45)).toBe("45 分钟");
    expect(formatDuration(60)).toBe("1 小时");
    expect(formatDuration(95)).toBe("1 小时 35 分钟");
  });
});

describe("formatRate", () => {
  it("0–1 小数按百分比展示", () => {
    expect(formatRate(0.5)).toBe("50.0%");
    expect(formatRate(1)).toBe("100.0%");
  });

  it("空值显示破折号", () => {
    expect(formatRate(null)).toBe("—");
  });
});

describe("parseContentDisposition", () => {
  it("优先解析 RFC 5987 文件名", () => {
    expect(
      parseContentDisposition(
        "attachment; filename=fallback.csv; filename*=UTF-8''%E5%AF%BC%E5%B8%88.csv",
      ),
    ).toBe("导师.csv");
  });

  it("回退到普通 filename", () => {
    expect(
      parseContentDisposition('attachment; filename="mentors.csv"'),
    ).toBe("mentors.csv");
  });

  it("没有头时返回 undefined", () => {
    expect(parseContentDisposition(null)).toBeUndefined();
  });
});

describe("学期工具", () => {
  it("上半年是 YYYY-1，下半年是 YYYY-2", () => {
    expect(currentPeriod(new Date("2026-03-01T00:00:00Z"))).toBe("2026-1");
    expect(currentPeriod(new Date("2026-09-01T00:00:00Z"))).toBe("2026-2");
  });

  it("periodOptions 从当前学期向前生成", () => {
    expect(periodOptions(3)).toHaveLength(3);
    expect(periodOptions(3)[0].value).toBe(currentPeriod());
  });

  it("todayDate 使用本地日期", () => {
    expect(todayDate(new Date(2026, 10, 3))).toBe("2026-11-03");
  });

  it("toLocalDateTimeInput 输出 datetime-local 需要的本地时间", () => {
    expect(toLocalDateTimeInput(new Date(2026, 10, 5, 9, 30))).toBe(
      "2026-11-05T09:30",
    );
    expect(toLocalDateTimeInput("not-a-date")).toBe("");
  });
});
