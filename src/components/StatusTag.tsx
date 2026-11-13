import { Tag } from "antd";
import type { StatusKind } from "../lib/enums";
import { statusMeta } from "../lib/enums";

interface StatusTagProps {
  kind: StatusKind;
  value: number | null | undefined;
}

export function StatusTag({ kind, value }: StatusTagProps) {
  const meta = statusMeta(kind, value);
  return (
    <Tag color={meta.color} className="m-0">
      {meta.label}
    </Tag>
  );
}
