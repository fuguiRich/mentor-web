import type { ReactNode } from "react";
import { Controller } from "react-hook-form";
import type {
  Control,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";

interface FormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label: ReactNode;
  required?: boolean;
  extra?: ReactNode;
  children: (field: ControllerRenderProps<T, FieldPath<T>>) => ReactNode;
}

/**
 * RHF Controller 的轻量字段包装：标签、必填、错误、帮助文本。
 * 不依赖 antd Form 上下文，因此可直接放在 Modal / Drawer 内。
 */
export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  required,
  extra,
  children,
}: FormFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="mb-4">
          <label className="mb-1 block text-[13px] font-medium text-slate-700">
            {label}
            {required ? <span className="ml-0.5 text-danger">*</span> : null}
          </label>
          {children(field)}
          {fieldState.error?.message ? (
            <div className="mt-1 text-xs text-danger">
              {fieldState.error.message}
            </div>
          ) : null}
          {extra ? (
            <div className="mt-1 text-xs text-ink-muted">{extra}</div>
          ) : null}
        </div>
      )}
    />
  );
}
