import clsx from "clsx";

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-lg border border-border bg-surface shadow-sm",
        padding && "p-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={clsx("mb-3 text-base font-semibold text-text", className)}>
      {children}
    </h3>
  );
}
