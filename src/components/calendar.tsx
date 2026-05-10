"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function toDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

interface CalendarProps {
  selectedDate: Date;
  workoutDates: Set<string>;
  onSelectDate: (date: Date) => void;
}

export function Calendar({ selectedDate, workoutDates, onSelectDate }: CalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getMonth());

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayRaw = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDayRaw + 6) % 7; // Mon = 0

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111111] overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
        <button
          onClick={prevMonth}
          aria-label="Previous month"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#999] transition hover:text-white active:scale-90"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {MONTHS[viewMonth]} {viewYear}
          </span>
          {(viewMonth !== today.getMonth() || viewYear !== today.getFullYear()) && (
            <button
              onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
              className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-medium text-[#bbb] transition hover:border-white/20 hover:text-white"
            >
              Today
            </button>
          )}
        </div>
        <button
          onClick={nextMonth}
          aria-label="Next month"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-[#999] transition hover:text-white active:scale-90"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 border-b border-white/6">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-[#bbb]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (!day) {
            return <div key={`e-${i}`} className="border-r border-b border-white/6 py-3" />;
          }

          const date = new Date(viewYear, viewMonth, day);
          const dateKey = toDateKey(date);
          const isSelected = isSameDay(date, selectedDate);
          const isToday = isSameDay(date, today);
          const hasWorkout = workoutDates.has(dateKey);
          const isFuture = date > today && !isToday;
          const col = i % 7;
          const isLastCol = col === 6;

          return (
            <button
              key={`${viewYear}-${viewMonth}-${day}`}
              onClick={() => onSelectDate(date)}
              aria-label={`${day} ${MONTHS[viewMonth]} ${viewYear}${hasWorkout ? ", has workout" : ""}`}
              aria-pressed={isSelected}
              className={[
                "relative flex flex-col items-center justify-center py-3.5 transition-all duration-100 active:scale-90",
                "border-b border-white/6",
                isLastCol ? "" : "border-r border-white/6",
                isSelected
                  ? "bg-white"
                  : isToday
                  ? "bg-white/8"
                  : isFuture
                  ? "hover:bg-white/4"
                  : "hover:bg-white/4",
              ].join(" ")}
            >
              <span
                className={[
                  "text-sm font-medium leading-none",
                  isSelected
                    ? "text-black"
                    : isToday
                    ? "text-white"
                    : isFuture
                    ? "text-[#bbb]"
                    : "text-[#ccc]",
                ].join(" ")}
              >
                {day}
              </span>
              {hasWorkout && (
                <span
                  className={[
                    "mt-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-black/40" : "bg-white/50",
                  ].join(" ")}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
