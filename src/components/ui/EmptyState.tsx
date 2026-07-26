import { Inbox } from "lucide-react";
import clsx from "clsx";

export interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function EmptyState({
  message = "No hay registros",
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx("flex flex-col items-center justify-center py-12 text-center", className)}>
      <div className="rounded-full bg-surface-alt p-4 text-text-muted mb-3">
        {icon || <Inbox className="h-8 w-8" />}
      </div>
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
