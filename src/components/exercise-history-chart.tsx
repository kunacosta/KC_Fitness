"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface ExerciseHistoryPoint {
  date: string;       // formatted date label
  primary: number;    // main metric (volume, reps, duration, distance, pace)
  secondary: number;  // secondary metric (e1RM, or 0)
  sessionLabel: string;
}

interface ExerciseHistoryChartProps {
  data: ExerciseHistoryPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  measurementType: string;
}

function formatTooltipValue(value: number, name: string, measurementType: string) {
  if (name === "primary") {
    switch (measurementType) {
      case "TIME": return [`${value}s`, "Duration"];
      case "DISTANCE_TIME": return [`${value} km`, "Distance"];
      case "REPS_ONLY": return [`${value} reps`, "Total reps"];
      default: return [`${value} kg·reps`, "Volume"];
    }
  }
  if (name === "secondary" && value > 0) {
    return [`${value} kg`, "e1RM"];
  }
  return [value, name];
}

export function ExerciseHistoryChart({
  data,
  primaryLabel,
  secondaryLabel,
  measurementType,
}: ExerciseHistoryChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-white/8 bg-[#161616]">
        <p className="text-sm text-[#ccc]">No data yet — log a session to see your trend.</p>
      </div>
    );
  }

  const hasSecondary = secondaryLabel && data.some((d) => d.secondary > 0);

  return (
    <div>
      <div className="mb-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-white/80" />
          <span className="text-xs text-[#bbb]">{primaryLabel}</span>
        </div>
        {hasSecondary && (
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="text-xs text-[#bbb]">{secondaryLabel}</span>
          </div>
        )}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#555", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#555", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={{
                background: "#161616",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14,
                color: "#fff",
                fontSize: 12,
              }}
              formatter={(value, name) =>
                formatTooltipValue(Number(value), String(name), measurementType)
              }
              labelFormatter={(label) => `Session: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="primary"
              name="primary"
              stroke="#f1f5f9"
              strokeWidth={2.5}
              dot={{ fill: "#f1f5f9", strokeWidth: 0, r: 4 }}
              activeDot={{ r: 5, fill: "#fff" }}
            />
            {hasSecondary && (
              <Line
                type="monotone"
                dataKey="secondary"
                name="secondary"
                stroke="#34d399"
                strokeWidth={2}
                dot={{ fill: "#34d399", strokeWidth: 0, r: 3 }}
                activeDot={{ r: 4, fill: "#34d399" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
