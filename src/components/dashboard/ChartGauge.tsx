"use client";

interface ChartGaugeProps {
  value: number;
  size?: number;
  className?: string;
  label?: string;
}

export default function ChartGauge({ value, size = 160, className, label }: ChartGaugeProps) {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  const color = value >= 90 ? "#16a34a" : value >= 70 ? "#d97706" : "#dc2626";

  return (
    <div className={`flex flex-col items-center justify-center ${className || ""}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="24"
          fontWeight="700"
          fill={color}
        >
          {Math.round(value)}%
        </text>
      </svg>
      {label && <span className="mt-1 text-sm text-text-secondary">{label}</span>}
    </div>
  );
}
