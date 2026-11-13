const dateTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** ISO 8601 UTC → 本地时区 "YYYY/MM/DD HH:mm"；空值显示 "—"。 */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFormatter.format(date);
}

/** 纯日期（YYYY-MM-DD）原样展示；ISO 时间转本地日期。 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replace(/-/g, "/");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateFormatter.format(date);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/** 分钟 → "X 小时 Y 分钟" / "Y 分钟"。 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) {
    return "—";
  }
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分钟`;
}

/** 后端比率字段可能是 0–1 小数或 0–100 百分数，统一按 0–1 处理。 */
export function formatRate(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const percent = value <= 1 ? value * 100 : value;
  return `${percent.toFixed(1)}%`;
}

export function parseContentDisposition(
  header: string | null | undefined,
): string | undefined {
  if (!header) return undefined;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain?.[1];
}

/** 触发浏览器下载；调用方负责传入文件名。 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** ISO / Date → datetime-local 输入框需要的本地时间字符串（YYYY-MM-DDTHH:mm）。 */
export function toLocalDateTimeInput(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/** 当前本地日期 YYYY-MM-DD（用于日期输入默认值）。 */
export function todayDate(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 当前学期：上半年 YYYY-1，下半年 YYYY-2。 */
export function currentPeriod(now = new Date()): string {
  const year = now.getFullYear();
  return now.getMonth() + 1 <= 6 ? `${year}-1` : `${year}-2`;
}

export function periodOptions(count = 6): { label: string; value: string }[] {
  const [yearText, termText] = currentPeriod().split("-");
  let year = Number(yearText);
  let term = Number(termText);
  const options: { label: string; value: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    options.push({
      label: `${year} 年${term === 1 ? "上半年" : "下半年"}`,
      value: `${year}-${term}`,
    });
    if (term === 2) {
      year -= 1;
      term = 1;
    } else {
      term = 2;
    }
  }
  return options;
}
