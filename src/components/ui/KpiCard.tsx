import clsx from "clsx";

export interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  color?: "default" | "primary" | "success" | "danger" | "warning" | "info";
  className?: string;
}

const colorMap = {
  default: "text-text",
  primary: "text-primary",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

export default function KpiCard({ label, value, subtext, icon, color = "default", className }: KpiCardProps) {
  return (
    <div className={clsx("rounded-lg border border-border bg-surface p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-text-secondary">{label}</p>
          <p className={clsx("mt-1 text-2xl font-bold tracking-tight", colorMap[color])}>{value}</p>
          {subtext && <p className="mt-0.5 text-xs text-text-muted">{subtext}</p>}
        </div>
        {icon && (
          <div className="rounded-md bg-surface-alt p-2 text-text-muted">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
