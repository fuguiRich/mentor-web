import { Empty, Tooltip } from "antd";

export interface DistributionItem {
  label: string;
  value: number;
  color?: string;
}

interface DistributionBarProps {
  items: DistributionItem[];
  total?: number;
  emptyText?: string;
}

/**
 * 单系列横向条形分布。
 * - 单一色相（默认品牌蓝）表达量级；需要状态语义时由调用方传入已验证的色值；
 * - 每行都有文字标签与数值，颜色只做辅助；
 * - 悬停给出数值与占比。
 */
export function DistributionBar({
  items,
  total,
  emptyText = "暂无数据",
}: DistributionBarProps) {
  const visible = items.filter((item) => item.value > 0);
  if (!visible.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={emptyText}
        className="my-6!"
      />
    );
  }
  const max = Math.max(...visible.map((item) => item.value), 1);
  const sum = total ?? visible.reduce((acc, item) => acc + item.value, 0);

  return (
    <div className="space-y-2.5" role="list">
      {visible.map((item) => {
        const percent = sum > 0 ? (item.value / sum) * 100 : 0;
        return (
          <Tooltip
            key={item.label}
            title={`${item.label}：${item.value}（${percent.toFixed(1)}%）`}
          >
            <div
              role="listitem"
              tabIndex={0}
              className="grid grid-cols-[minmax(84px,150px)_1fr_56px] items-center gap-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="truncate text-[13px] text-ink-muted">
                {item.label}
              </span>
              <span
                className="h-2 rounded-full bg-muted"
                aria-hidden="true"
              >
                <span
                  className="block h-2 rounded-full transition-[width] duration-300"
                  style={{
                    width: `${Math.max((item.value / max) * 100, 2)}%`,
                    background: item.color ?? "#135591",
                  }}
                />
              </span>
              <span className="tabular text-right text-[13px] text-ink">
                {item.value}
              </span>
            </div>
          </Tooltip>
        );
      })}
    </div>
  );
}
