import type { ReactNode } from "react";
import { InboxOutlined } from "@ant-design/icons";

/** 卡片内使用的紧凑空态：比 antd Empty 更矮，避免把卡片撑得过高。 */
export function CompactEmpty({
  text,
  action,
}: {
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-lg text-slate-400">
        <InboxOutlined />
      </span>
      <div className="text-[13px] text-ink-muted">{text}</div>
      {action}
    </div>
  );
}
