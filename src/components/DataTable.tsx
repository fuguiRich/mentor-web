import { Empty, Table } from "antd";
import type { TableProps } from "antd";
import type { ReactNode } from "react";

interface DataTableProps<T> extends TableProps<T> {
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
  emptyText?: ReactNode;
  /** 默认套一层卡片边框；已在 Card 内使用时传 false。 */
  wrapped?: boolean;
}

/**
 * 统一表格：分页、横向滚动、空态、卡片外框。
 * 分页参数从 URL / 页面状态传入，表格本身不维护页码。
 */
export function DataTable<T extends object>({
  total,
  page = 1,
  pageSize = 20,
  onPageChange,
  emptyText,
  scroll,
  wrapped = true,
  ...rest
}: DataTableProps<T>) {
  const pagination =
    total === undefined || !onPageChange
      ? false
      : {
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 50, 100],
          showTotal: (count: number) => `共 ${count} 条`,
          onChange: onPageChange,
        };

  const table = (
    <Table<T>
      rowKey={(record) => {
        const row = record as Record<string, unknown>;
        return String(
          row.id ?? row.mentorProfileId ?? JSON.stringify(record),
        );
      }}
      size="middle"
      pagination={pagination}
      scroll={scroll ?? { x: "max-content" }}
      locale={{
        emptyText: emptyText ?? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无数据"
          />
        ),
      }}
      {...rest}
    />
  );

  if (!wrapped) return table;

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-card shadow-[0_1px_2px_rgba(15,23,42,.04)]">
      {table}
    </div>
  );
}
