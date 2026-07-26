import clsx from "clsx";

export interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
}

export default function Skeleton({ className, variant = "text" }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded bg-surface-alt",
        variant === "text" && "h-4 w-full",
        variant === "rect" && "h-20 w-full",
        variant === "circle" && "h-10 w-10 rounded-full",
        className
      )}
    />
  );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-border bg-surface p-4 shadow-sm space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={i === 0 ? "w-1/3" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={clsx("rounded-lg border border-border bg-surface p-4 shadow-sm", className)}>
      <div className="space-y-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
