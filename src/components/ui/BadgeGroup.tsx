import clsx from "clsx";

export interface BadgeGroupProps {
  badges: { label: string; active: boolean; onClick: () => void }[];
  className?: string;
}

export default function BadgeGroup({ badges, className }: BadgeGroupProps) {
  return (
    <div className={clsx("flex flex-wrap gap-2", className)}>
      {badges.map((b) => (
        <button
          key={b.label}
          onClick={b.onClick}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors",
            b.active
              ? "bg-primary text-white"
              : "bg-surface-alt text-text-secondary hover:bg-border hover:text-text"
          )}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
