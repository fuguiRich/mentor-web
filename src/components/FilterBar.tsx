import type { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  extra?: ReactNode;
}

/** 列表页筛选条：自动换行，窄屏纵向堆叠。 */
export function FilterBar({ children, extra }: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {children}
      {extra ? <div className="ml-auto flex items-center gap-2">{extra}</div> : null}
    </div>
  );
}
