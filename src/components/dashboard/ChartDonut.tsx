"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

export interface ChartDonutData {
  name: string;
  value: number;
  color?: string;
}

export interface ChartDonutProps {
  data: ChartDonutData[];
  colors?: string[];
  height?: number;
  title?: string;
  className?: string;
  innerLabel?: string;
}

const defaultColors = [
  "#1e3a5f",
  "#2563eb",
  "#15803d",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#be185d",
];

export default function ChartDonut({ data, colors, height = 300, title, className, innerLabel }: ChartDonutProps) {
  const palette = colors || defaultColors;
  return (
    <div className={className}>
      {title && <h3 className="mb-3 text-base font-semibold text-text">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color || palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          {innerLabel && (
            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="text-sm font-semibold fill-text">
              {innerLabel}
            </text>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
