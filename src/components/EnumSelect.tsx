import { Select } from "antd";
import type { SelectProps } from "antd";

interface EnumSelectProps
  extends Omit<SelectProps<string | number>, "options"> {
  options: { value: string | number; label: string }[];
}

export function EnumSelect({
  options,
  allowClear = true,
  placeholder = "全部",
  style,
  ...rest
}: EnumSelectProps) {
  return (
    <Select<string | number>
      options={options}
      allowClear={allowClear}
      placeholder={placeholder}
      style={{ minWidth: 140, ...style }}
      {...rest}
    />
  );
}
