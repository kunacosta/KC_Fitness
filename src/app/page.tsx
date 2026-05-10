"use client";

import { useMemo, useState } from "react";
import { Plus, X, ChevronDown, ChevronUp, Trash2, Dumbbell } from "lucide-react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Calendar, isSameDay, toDateKey } from "@/components/calendar";
import { DayNightHeader } from "@/components/day-night-header";
import { WorkoutForm } from "@/components/workout-form";
import { dbGetExercises, dbGetWorkouts, dbDeleteWorkout } from "@/lib/db";
import { mapLocalExercisesToDto, mapLocalWorkoutsToDto } from "@/lib/local-storage/mappers";
import type { ExerciseDto, WorkoutSessionDto } from "@/types/api";

const ONBOARDED_KEY = "kc-fitness.onboarded";

// ── helpers ─────────────────────────────────────────────────────────────────

function formatSetSummary(we: WorkoutSessionDto["workoutExercises"][number]): string {
  const mt = we.exercise.measurementType;
  return we.sets
    .map((s) => {
      if (mt === "WEIGHT_REPS") return `${s.weight}×${s.reps}`;
      if (mt === "REPS_ONLY") return `${s.reps}`;
      if (mt === "TIME") return `${s.durationSeconds}s`;
      if (mt === "DISTANCE_TIME") return `${s.distanceKm}km`;
      return `${s.weight}×${s.durationSeconds}s`;
    })
    .join("  ");
}

function buildPerformedAt(date: Date, time: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    h ?? 0,
    m ?? 0,
  ).toISOString();
}

// ── sub-components ───────────────────────────────────────────────────────────

function WorkoutSummaryCard({
  workout,
  onDelete,
}: {
  workout: WorkoutSessionDto;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const time = new Date(workout.performedAt).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-white/8 bg-[#111] overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-white">{workout.title}</p>
          <p className="mt-0.5 text-[11px] text-[#999]">
            {time} · {workout.workoutExercises.length} exercise
            {workout.workoutExercises.length !== 1 ? "s" : ""}
          </p>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-[#999]" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-[#999]" />
        )}
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-3 border-t border-white/6 px-4 pb-4 pt-3">
          {workout.workoutExercises.map((we) => (
            <div key={we.id}>
              <p className="text-xs font-semibold text-[#bbb]">{we.exercise.name}</p>
              <p className="mt-0.5 font-mono text-[11px] text-[#bbb]">
                {formatSetSummary(we)}
              </p>
            </div>
          ))}
          {workout.notes && (
            <p className="rounded-xl border border-white/6 bg-white/3 px-3 py-2 text-xs text-[#999]">
              {workout.notes}
            </p>
          )}
          <div className="pt-1">
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                className="flex items-center gap-1.5 text-[11px] text-[#999] hover:text-rose-400 transition-colors"
              >
                <Trash2 className="h-3 w-3" /> Delete workout
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#bbb]">Delete this workout?</span>
                <button
                  onClick={() => onDelete(workout.id)}
                  className="text-[11px] font-medium text-rose-400 hover:text-rose-300"
                >
                  Yes, delete
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="text-[11px] text-[#999] hover:text-white"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── main page ────────────────────────────────────────────────────────────────

export default function Home() {
  const [exercises, setExercises] = useState<ExerciseDto[]>(() => mapLocalExercisesToDto(dbGetExercises()));
  const [workouts, setWorkouts] = useState<WorkoutSessionDto[]>(() => mapLocalWorkoutsToDto(dbGetWorkouts()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [showLogForm, setShowLogForm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() =>
    typeof window === "undefined" ? false : !localStorage.getItem(ONBOARDED_KEY),
  );
  const [logTime, setLogTime] = useState<string>(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  });

  function loadData() {
    setExercises(mapLocalExercisesToDto(dbGetExercises()));
    setWorkouts(mapLocalWorkoutsToDto(dbGetWorkouts()));
  }

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    setShowOnboarding(false);
  }

  function handleDelete(workoutId: string) {
    dbDeleteWorkout(workoutId);
    loadData();
  }

  const workoutDateSet = useMemo<Set<string>>(() => {
    return new Set(workouts.map((w) => toDateKey(new Date(w.performedAt))));
  }, [workouts]);

  const dayWorkouts = useMemo(
    () => workouts.filter((w) => isSameDay(new Date(w.performedAt), selectedDate)),
    [workouts, selectedDate],
  );

  const isToday = isSameDay(selectedDate, new Date());
  const isFutureDay = selectedDate > new Date() && !isToday;

  const performedAt = buildPerformedAt(selectedDate, logTime);

  const selectedDateLabel = selectedDate.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function handleSelectDate(date: Date) {
    setSelectedDate(date);
    setShowLogForm(false);
  }

  function handleLogSuccess() {
    loadData();
    setShowLogForm(false);
  }

  return (
    <AppShell currentPath="/">
      <div className="space-y-4">
        {/* Onboarding banner — first-time users only */}
        {showOnboarding && (
          <div className="animate-slide-down flex items-start gap-3 rounded-2xl border border-white/10 bg-white/4 px-4 py-3">
            <Dumbbell className="mt-0.5 h-4 w-4 shrink-0 text-[#bbb]" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-white">Welcome to KC Fitness</p>
              <p className="mt-0.5 text-xs text-[#ccc]">
                1. Go to <Link href="/exercises" className="underline text-[#bbb]">Library</Link> to add your exercises &nbsp;·&nbsp;
                2. Come back here to log workouts &nbsp;·&nbsp;
                3. Track progress in <Link href="/analytics" className="underline text-[#bbb]">Stats</Link>
              </p>
            </div>
            <button onClick={dismissOnboarding} aria-label="Dismiss" className="flex h-10 w-10 items-center justify-center text-[#999] hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Greeting */}
        <DayNightHeader />

        {/* Calendar */}
        <Calendar
          selectedDate={selectedDate}
          workoutDates={workoutDateSet}
          onSelectDate={handleSelectDate}
        />

        {/* Selected day panel */}
        <div className="animate-slide-up">
          {/* Date label */}
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#999]">
              {isToday
                ? "Today"
                : selectedDate.toLocaleDateString("en-MY", { weekday: "long" })}
            </p>
            {!isToday && (
              <p className="text-[11px] text-[#bbb]">
                {selectedDate.toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Workouts for this day */}
          {dayWorkouts.length > 0 && (
            <div className="space-y-2">
              {dayWorkouts.map((w) => (
                <WorkoutSummaryCard key={w.id} workout={w} onDelete={handleDelete} />
              ))}
            </div>
          )}

          {/* Empty state / log button */}
          {dayWorkouts.length === 0 && !isFutureDay && (
            <div className="rounded-2xl border border-white/8 bg-[#111] overflow-hidden">
              {exercises.length === 0 ? (
                /* C1: No exercises yet */
                <div className="flex items-center gap-3 px-4 py-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/4">
                    <Dumbbell className="h-4 w-4 text-[#ccc]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#bbb]">No exercises yet</p>
                    <p className="text-[11px] text-[#bbb]">
                      <Link href="/exercises" className="underline hover:text-[#bbb]">Add exercises in Library</Link> before logging
                    </p>
                  </div>
                </div>
              ) : !showLogForm ? (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-white/3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/4">
                    <Plus className="h-4 w-4 text-[#bbb]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#bbb]">Log workout</p>
                    <p className="text-[11px] text-[#bbb]">No session recorded for this day</p>
                  </div>
                </button>
              ) : (
                <div className="animate-slide-up">
                  <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-[#ccc]">Time</label>
                      <input
                        type="time"
                        value={logTime}
                        onChange={(e) => setLogTime(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white [color-scheme:dark]"
                      />
                    </div>
                    <button
                      onClick={() => setShowLogForm(false)}
                      aria-label="Close form"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#999] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <WorkoutForm exercises={exercises} performedAt={performedAt} onSuccess={handleLogSuccess} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Future day */}
          {isFutureDay && dayWorkouts.length === 0 && (
            <div className="rounded-2xl border border-white/6 px-4 py-5">
              <p className="text-center text-sm text-[#bbb]">Select today or a past date to log a workout.</p>
            </div>
          )}

          {/* Add another session (when workouts exist for the day) */}
          {dayWorkouts.length > 0 && !isFutureDay && (
            <div className="mt-2">
              {!showLogForm ? (
                <button
                  onClick={() => setShowLogForm(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/8 py-3 text-xs text-[#bbb] transition hover:border-white/10 hover:text-[#bbb]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add another session
                </button>
              ) : (
                <div className="animate-slide-up rounded-2xl border border-white/8 bg-[#111] overflow-hidden">
                  <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-medium text-[#ccc]">Time</label>
                      <input
                        type="time"
                        value={logTime}
                        onChange={(e) => setLogTime(e.target.value)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white [color-scheme:dark]"
                      />
                    </div>
                    <button
                      onClick={() => setShowLogForm(false)}
                      aria-label="Close form"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-[#999] hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="p-4">
                    <WorkoutForm exercises={exercises} performedAt={performedAt} onSuccess={handleLogSuccess} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
