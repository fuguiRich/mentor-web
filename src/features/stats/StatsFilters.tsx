import { Button, Input, Segmented, Select } from "antd";
import { EnumSelect } from "../../components/EnumSelect";
import { useDepts } from "../../lib/hooks/useDepts";
import { flattenDepts } from "../../lib/tree";
import {
  APPOINTMENT_TYPE_LABELS,
  toOptions,
} from "../../lib/enums";
import { currentPeriod, periodOptions } from "../../lib/format";

export interface StatsFilterState {
  mode: "period" | "range";
  period?: string;
  from?: string;
  to?: string;
  deptId?: string;
  mentorType?: "internal" | "external";
  type?: number;
}

interface StatsFiltersProps {
  state: StatsFilterState;
  onChange: (patch: Partial<StatsFilterState>) => void;
  showDept: boolean;
}

export function StatsFilters({
  state,
  onChange,
  showDept,
}: StatsFiltersProps) {
  const depts = useDepts();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Segmented
        value={state.mode}
        onChange={(value) => {
          if (value === "period") {
            onChange({
              mode: "period",
              period: state.period ?? currentPeriod(),
              from: undefined,
              to: undefined,
            });
          } else {
            onChange({
              mode: "range",
              period: undefined,
              from: state.from,
              to: state.to,
            });
          }
        }}
        options={[
          { label: "按学期", value: "period" },
          { label: "按日期", value: "range" },
        ]}
      />

      {state.mode === "period" ? (
        <Select
          value={state.period ?? currentPeriod()}
          onChange={(value) => onChange({ period: value })}
          options={periodOptions(8)}
          style={{ minWidth: 150 }}
        />
      ) : (
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            aria-label="起始日期"
            value={state.from ?? ""}
            onChange={(event) => onChange({ from: event.target.value || undefined })}
            style={{ width: 150 }}
          />
          <span className="text-ink-muted">至</span>
          <Input
            type="date"
            aria-label="结束日期"
            value={state.to ?? ""}
            onChange={(event) => onChange({ to: event.target.value || undefined })}
            style={{ width: 150 }}
          />
        </div>
      )}

      {showDept ? (
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="全部部门"
          value={state.deptId}
          onChange={(value) => onChange({ deptId: value || undefined })}
          options={flattenDepts(depts.data ?? [])}
          loading={depts.isLoading}
          style={{ minWidth: 150 }}
        />
      ) : null}

      <EnumSelect
        options={[
          { value: "internal", label: "校内导师" },
          { value: "external", label: "校外导师" },
        ]}
        value={state.mentorType}
        placeholder="全部导师类型"
        style={{ minWidth: 140 }}
        onChange={(value) =>
          onChange({
            mentorType:
              value === "internal" || value === "external" ? value : undefined,
          })
        }
      />

      <EnumSelect
        options={toOptions(APPOINTMENT_TYPE_LABELS, [1, 2, 3, 4, 5])}
        value={state.type}
        placeholder="全部预约类型"
        style={{ minWidth: 160 }}
        onChange={(value) =>
          onChange({
            type: value === undefined ? undefined : Number(value),
          })
        }
      />

      <Button
        type="link"
        onClick={() =>
          onChange({
            mode: "period",
            period: currentPeriod(),
            from: undefined,
            to: undefined,
            deptId: undefined,
            mentorType: undefined,
            type: undefined,
          })
        }
      >
        重置筛选
      </Button>
    </div>
  );
}
