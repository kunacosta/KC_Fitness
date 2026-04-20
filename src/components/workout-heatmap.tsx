"use client";

interface WorkoutHeatmapProps {
  workoutDates: string[]; // ISO date strings
}

function getWeeksGrid(weeksBack = 26) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Align to Sunday of current week
  const startOfGrid = new Date(today);
  startOfGrid.setDate(today.getDate() - today.getDay() - (weeksBack - 1) * 7);

  const days: Date[] = [];
  for (let i = 0; i < weeksBack * 7; i++) {
    const d = new Date(startOfGrid);
    d.setDate(startOfGrid.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function WorkoutHeatmap({ workoutDates }: WorkoutHeatmapProps) {
  const dateSet = new Set(workoutDates.map((d) => d.slice(0, 10)));
  const days = getWeeksGrid(26);
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Month labels: find weeks where month changes
  const monthMarkers: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) {
      monthMarkers.push({ weekIndex: wi, label: MONTH_LABELS[m] });
      lastMonth = m;
    }
  });

  const totalSessions = dateSet.size;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-[#bbb]">Training consistency</p>
        <p className="text-xs text-[#999]">{totalSessions} sessions in 6 months</p>
      </div>

      {/* Month labels */}
      <div className="relative mb-1 flex" style={{ paddingLeft: 0 }}>
        {weeks.map((_, wi) => {
          const marker = monthMarkers.find((m) => m.weekIndex === wi);
          return (
            <div key={wi} className="flex-1">
              {marker && (
                <span className="text-[10px] text-[#888]">{marker.label}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-[3px]">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-1 flex-col gap-[3px]">
            {week.map((day) => {
              const key = toDateKey(day);
              const isToday = key === toDateKey(new Date());
              const hasWorkout = dateSet.has(key);
              const isFuture = day > new Date();

              return (
                <div
                  key={key}
                  title={`${key}${hasWorkout ? " · Trained" : ""}`}
                  className={`aspect-square w-full rounded-[3px] transition-colors ${
                    isFuture
                      ? "bg-white/3"
                      : hasWorkout
                      ? "bg-emerald-400"
                      : "bg-white/8"
                  } ${isToday ? "ring-1 ring-white/40 ring-offset-0" : ""}`}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <span className="text-[10px] text-[#888]">Less</span>
        <div className="h-3 w-3 rounded-[3px] bg-white/8" />
        <div className="h-3 w-3 rounded-[3px] bg-emerald-400/50" />
        <div className="h-3 w-3 rounded-[3px] bg-emerald-400" />
        <span className="text-[10px] text-[#888]">More</span>
      </div>
    </div>
  );
}
