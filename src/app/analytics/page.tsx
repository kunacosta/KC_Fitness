"use client";

import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { ExerciseHistoryChart } from "@/components/exercise-history-chart";
import { WorkoutHeatmap } from "@/components/workout-heatmap";
import { PRTable } from "@/components/pr-table";
import { ReminderSettingsCard } from "@/components/reminder-settings";
import { BackupCard } from "@/components/backup-card";
import { dbGetWorkouts } from "@/lib/db";
import { buildExerciseAnalytics } from "@/lib/exercise-analytics";
import { mapLocalWorkoutsToDto } from "@/lib/local-storage/mappers";
import type { ProgressionSnapshotDto, WorkoutSessionDto } from "@/types/api";

function formatSuggestionLabel(value?: string | null) {
  return value ? value.replaceAll("_", " ") : "—";
}

function buildSuggestionCounts(snapshots: ProgressionSnapshotDto[]) {
  return snapshots.reduce(
    (counts, snapshot) => {
      counts[snapshot.nextSuggestionType] = (counts[snapshot.nextSuggestionType] ?? 0) + 1;
      return counts;
    },
    {} as Record<string, number>,
  );
}

function formatSnapshotTarget(snapshot: ProgressionSnapshotDto): string {
  const mt = snapshot.exercise.measurementType;
  switch (mt) {
    case "REPS_ONLY":
      return snapshot.nextSuggestedRepMin
        ? `${snapshot.nextSuggestedRepMin}–${snapshot.nextSuggestedRepMax} reps`
        : "—";
    case "TIME":
      return snapshot.nextSuggestedDurationSeconds
        ? `${snapshot.nextSuggestedDurationSeconds}s`
        : "—";
    case "DISTANCE_TIME":
      return snapshot.nextSuggestedDistanceKm ? `${snapshot.nextSuggestedDistanceKm} km` : "—";
    default:
      return snapshot.nextSuggestedWeight
        ? `${snapshot.nextSuggestedWeight} kg · ${snapshot.nextSuggestedRepMin ?? "—"}-${snapshot.nextSuggestedRepMax ?? "—"}`
        : "—";
  }
}


export default function AnalyticsPage() {
  const [workouts, setWorkouts] = useState<WorkoutSessionDto[]>(() => mapLocalWorkoutsToDto(dbGetWorkouts()));

  function reload() {
    setWorkouts(mapLocalWorkoutsToDto(dbGetWorkouts()));
  }

  const allSnapshots = workouts.flatMap((s) => s.progressionSnapshots ?? []);
  const suggestionCounts = buildSuggestionCounts(allSnapshots);

  // Single pass: collect unique exercises + latest snapshot per exercise
  const exerciseMap = new Map<string, { id: string; exercise: ProgressionSnapshotDto["exercise"]; latest: ProgressionSnapshotDto }>();
  for (const snap of allSnapshots) {
    const entry = exerciseMap.get(snap.exerciseId);
    if (!entry || snap.createdAt > entry.latest.createdAt) {
      exerciseMap.set(snap.exerciseId, { id: snap.exerciseId, exercise: snap.exercise, latest: snap });
    }
  }
  const uniqueExercises = Array.from(exerciseMap.values());
  const latestSnapshots = uniqueExercises.map((e) => e.latest);

  // This-week summary (Monday start, matching the calendar)
  const weekStart = new Date();
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  weekStart.setHours(0, 0, 0, 0);
  const thisWeekWorkouts = workouts.filter((w) => new Date(w.performedAt) >= weekStart);
  const thisWeekVolume = allSnapshots
    .filter((s) => new Date(s.createdAt) >= weekStart)
    .reduce((sum, s) => sum + Number(s.totalVolume), 0);

  const workoutDates = workouts.map((w) => w.performedAt);

  return (
    <AppShell currentPath="/analytics" title="Stats">
      <div className="grid gap-6">

        {/* ── Empty state ── */}
        {workouts.length === 0 && (
          <div className="rounded-2xl border border-white/8 bg-[#161616] px-5 py-8 text-center">
            <p className="text-sm font-medium text-white">No workouts logged yet</p>
            <p className="mt-2 text-sm leading-6 text-[#999]">
              Log your first session on the Home screen. Stats, personal records, and progression trends appear here automatically.
            </p>
          </div>
        )}

        {/* ── This week strip ── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/8 bg-[#161616] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#999]">This week</p>
            <p className="mt-2 text-2xl font-semibold text-white">{thisWeekWorkouts.length}</p>
            <p className="mt-0.5 text-xs text-[#999]">sessions</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#161616] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#999]">Volume</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {thisWeekVolume > 0 ? `${Math.round(thisWeekVolume / 1000)}k` : "—"}
            </p>
            <p className="mt-0.5 text-xs text-[#999]">kg·reps</p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-[#161616] p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#999]">Exercises</p>
            <p className="mt-2 text-2xl font-semibold text-white">{uniqueExercises.length}</p>
            <p className="mt-0.5 text-xs text-[#999]">tracked</p>
          </div>
        </div>

        {/* ── Heatmap ── */}
        <Card>
          <WorkoutHeatmap workoutDates={workoutDates} />
        </Card>

        {/* ── Overview ── */}
        <Card>
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.24em] text-[#bbb]">All-time overview</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryMetric label="Total workouts" value={String(workouts.length)} />
            <SummaryMetric label="Increase weight" value={String(suggestionCounts.INCREASE_WEIGHT ?? 0)} />
            <SummaryMetric label="Increase reps" value={String(suggestionCounts.INCREASE_REPS ?? 0)} />
          </div>
        </Card>

        {/* ── PR Table ── */}
        {workouts.length > 0 && (
          <Card>
            <PRTable workouts={workouts} />
          </Card>
        )}

        {/* ── Backup ── */}
        <Card>
          <BackupCard onRestore={reload} />
        </Card>

        {/* ── Reminder settings ── */}
        <Card>
          <ReminderSettingsCard lastWorkoutDate={workouts[0]?.performedAt ?? null} />
        </Card>

        {/* ── Per-exercise progression charts ── */}
        {uniqueExercises.length > 0 && (
          <div className="grid gap-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[#bbb]">Progression trends</p>
            <div className="grid gap-6 lg:grid-cols-2">
              {uniqueExercises.map(({ id, exercise }) => {
                const analytics = buildExerciseAnalytics(workouts, id, exercise as Parameters<typeof buildExerciseAnalytics>[2]);
                const latest = analytics.latestSnapshot;
                return (
                  <Card key={id}>
                    <div className="mb-1 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-white">{exercise.name}</h3>
                        <p className="mt-0.5 text-xs text-[#999] uppercase tracking-[0.16em]">
                          {exercise.measurementType.replaceAll("_", " ")}
                        </p>
                      </div>
                      {latest && (
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${
                          latest.nextSuggestionType === "DELOAD"
                            ? "border-rose-400/20 text-rose-300"
                            : latest.nextSuggestionType === "HOLD"
                            ? "border-white/10 text-[#bbb]"
                            : "border-emerald-400/20 text-emerald-300"
                        }`}>
                          {formatSuggestionLabel(latest.nextSuggestionType)}
                        </span>
                      )}
                    </div>

                    {latest && (
                      <div className="mt-3 mb-5 rounded-2xl border border-emerald-400/12 bg-emerald-400/6 px-4 py-3">
                        <p className="text-xs text-emerald-300/80 uppercase tracking-[0.14em]">Next target</p>
                        <p className="mt-1 text-lg font-semibold text-white">
                          {formatSnapshotTarget(latest)}
                        </p>
                        {latest.rationale && (
                          <p className="mt-1 text-xs text-[#bbb] leading-5">{latest.rationale}</p>
                        )}
                      </div>
                    )}

                    <ExerciseHistoryChart
                      data={analytics.chartData}
                      primaryLabel={analytics.primaryLabel}
                      secondaryLabel={analytics.secondaryLabel}
                      measurementType={exercise.measurementType}
                    />
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Latest progression decisions ── */}
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-[#bbb]">Latest progression decisions</p>
          <p className="mt-1 text-xs text-[#999]">Auto-generated after each workout — suggests your next overload target.</p>

          <div className="mt-6 space-y-4">
            {latestSnapshots.length ? (
              latestSnapshots.map((snapshot) => (
                <article
                  key={snapshot.id}
                  className="rounded-2xl border border-white/8 bg-[#161616] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-white">
                        {snapshot.exercise.name}
                      </h3>
                      <p className="mt-1 text-xs text-[#ccc] uppercase tracking-[0.18em]">
                        {snapshot.exercise.measurementType.replaceAll("_", " ")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-[#bbb]">
                        {snapshot.rationale ?? "No rationale recorded."}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${
                      snapshot.nextSuggestionType === "DELOAD"
                        ? "border-rose-400/20 text-rose-300"
                        : snapshot.nextSuggestionType === "HOLD"
                        ? "border-white/10 text-[#ccc]"
                        : "border-emerald-400/20 text-emerald-300"
                    }`}>
                      {formatSuggestionLabel(snapshot.nextSuggestionType)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 grid-cols-2 md:grid-cols-4">
                    <MiniMetric label="Volume" value={`${snapshot.totalVolume}`} />
                    <MiniMetric label="Avg RIR" value={snapshot.averageRir ?? "—"} />
                    <MiniMetric label="e1RM" value={snapshot.estimated1RM ? `${snapshot.estimated1RM} kg` : "—"} />
                    <MiniMetric label="Next target" value={formatSnapshotTarget(snapshot)} />
                  </div>
                </article>
              ))
            ) : (
              <p className="text-sm text-[#bbb]">
                No analytics yet. Log a workout to generate your first progression snapshot.
              </p>
            )}
          </div>
        </Card>

      </div>
    </AppShell>
  );
}

function SummaryMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#161616] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-[#ccc]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="rounded-2xl bg-white/5 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[#ccc]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value ?? "—"}</p>
    </div>
  );
}
