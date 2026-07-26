import clsx from "clsx";

export interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  keyExtractor: (row: T, index: number) => string | number;
  className?: string;
  compact?: boolean;
}

export default function DataTable<T>({
  columns,
  data,
  emptyMessage = "No hay registros",
  keyExtractor,
  className,
  compact = false,
}: DataTableProps<T>) {
  const cellPad = compact ? "px-3 py-2" : "px-3 py-3";

  return (
    <div className={clsx("overflow-x-auto", className)}>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-alt">
            {columns.map((col) => (
              <th
                key={col.key}
                className={clsx(
                  cellPad,
                  "text-xs font-medium text-text-secondary uppercase tracking-wider",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className={clsx(cellPad, "text-center text-text-muted")}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={keyExtractor(row, i)}
                className="border-b border-border last:border-0 hover:bg-surface-alt/50 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={clsx(
                      cellPad,
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
                    {col.render
                      ? col.render(row, i)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
