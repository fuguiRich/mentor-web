import type { ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  back?: ReactNode;
}

export function PageHeader({
  title,
  description,
  extra,
  back,
}: PageHeaderProps) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {back ? <div className="mb-2">{back}</div> : null}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-4 w-1 shrink-0 rounded-full bg-accent"
          />
          <h1 className="m-0 text-xl font-medium tracking-tight text-ink">
            {title}
          </h1>
        </div>
        {description ? (
          <p className="mt-1 mb-0 text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {extra ? <div className="flex shrink-0 items-center gap-2">{extra}</div> : null}
    </div>
  );
}
