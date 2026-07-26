import clsx from "clsx";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

const variants = {
  success: {
    container: "bg-green-50 border-green-200 text-green-800",
    icon: CheckCircle,
  },
  error: {
    container: "bg-red-50 border-red-200 text-red-800",
    icon: AlertCircle,
  },
  warning: {
    container: "bg-amber-50 border-amber-200 text-amber-800",
    icon: AlertTriangle,
  },
  info: {
    container: "bg-blue-50 border-blue-200 text-blue-800",
    icon: Info,
  },
};

export interface AlertProps {
  variant?: keyof typeof variants;
  children: React.ReactNode;
  className?: string;
}

export default function Alert({ variant = "info", children, className }: AlertProps) {
  const v = variants[variant];
  const Icon = v.icon;
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
        v.container,
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
