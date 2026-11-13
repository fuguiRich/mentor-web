import type { ReactNode } from "react";

const TONES = {
  accent: "border-l-accent text-accent",
  teal: "border-l-teal text-teal",
  amber: "border-l-amber text-amber",
  danger: "border-l-danger text-danger",
  slate: "border-l-ink-muted text-ink-muted",
} as const;

interface StatCardProps {
  label: string;
  value: ReactNode;
  suffix?: string;
  hint?: ReactNode;
  tone?: keyof typeof TONES;
  icon?: ReactNode;
}

export function StatCard({
  label,
  value,
  suffix,
  hint,
  tone = "accent",
  icon,
}: StatCardProps) {
  return (
    <div
      className={`rounded-[10px] border border-line border-l-4 bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,.06)] ${TONES[tone]}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] text-ink-muted">{label}</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="tabular text-2xl font-medium text-ink">
              {value}
            </span>
            {suffix ? (
              <span className="text-xs text-ink-muted">{suffix}</span>
            ) : null}
          </div>
        </div>
        {icon ? <div className="text-lg opacity-70">{icon}</div> : null}
      </div>
      {hint ? <div className="mt-2 text-xs text-ink-muted">{hint}</div> : null}
    </div>
  );
}
