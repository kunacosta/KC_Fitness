"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { ExerciseHistoryChart } from "@/components/exercise-history-chart";
import { buildExerciseAnalytics } from "@/lib/exercise-analytics";
import { dbGetExercises, dbGetWorkouts } from "@/lib/db";
import { mapLocalExercisesToDto, mapLocalWorkoutsToDto } from "@/lib/local-storage/mappers";
import type { ExerciseDto, WorkoutSessionDto } from "@/types/api";

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

function formatPace(minPerKm: string | null) {
  if (!minPerKm) return "—";
  const v = Number(minPerKm);
  const m = Math.floor(v);
  const s = Math.round((v - m) * 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

export function ExerciseDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const [exercises, setExercises] = useState<ExerciseDto[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutSessionDto[]>([]);

  useEffect(() => {
    setExercises(mapLocalExercisesToDto(dbGetExercises()));
    setWorkouts(mapLocalWorkoutsToDto(dbGetWorkouts()));
  }, []);

  const exercise = exercises.find((item) => item.id === id);

  if (exercises.length > 0 && !exercise) {
    return (
      <AppShell currentPath="/exercises" title="Not Found">
        <p className="text-[#999]">Exercise not found.</p>
      </AppShell>
    );
  }

  if (!exercise) {
    return (
      <AppShell currentPath="/exercises">
        <div className="text-[#999] text-sm">Loading…</div>
      </AppShell>
    );
  }

  const analytics = buildExerciseAnalytics(workouts, exercise.id, exercise);
  const mt = exercise.measurementType;
  const latest = analytics.latestSnapshot;

  const profileMetrics = (() => {
    switch (mt) {
      case "REPS_ONLY":
        return [
          { label: "Rep target", value: `${exercise.repTargetMin}–${exercise.repTargetMax}` },
          { label: "Category", value: exercise.category.replaceAll("_", " ") },
          { label: "Equipment", value: exercise.equipment.replaceAll("_", " ") },
        ];
      case "TIME":
        return [
          { label: "Duration target", value: formatDuration(exercise.durationTargetSeconds) },
          { label: "Category", value: exercise.category.replaceAll("_", " ") },
          { label: "Equipment", value: exercise.equipment.replaceAll("_", " ") },
        ];
      case "DISTANCE_TIME":
        return [
          { label: "Distance target", value: exercise.distanceTargetKm ? `${exercise.distanceTargetKm} km` : "—" },
          { label: "Category", value: exercise.category.replaceAll("_", " ") },
          { label: "Equipment", value: exercise.equipment.replaceAll("_", " ") },
        ];
      case "WEIGHT_TIME":
        return [
          { label: "Duration target", value: formatDuration(exercise.durationTargetSeconds) },
          { label: "Increment", value: `${exercise.incrementStep} kg` },
          { label: "Equipment", value: exercise.equipment.replaceAll("_", " ") },
        ];
      default:
        return [
          { label: "Rep target", value: `${exercise.repTargetMin}–${exercise.repTargetMax}` },
          { label: "Increment", value: `${exercise.incrementStep} kg` },
          { label: "Target RIR", value: `${exercise.targetRirMin ?? "0"}–${exercise.targetRirMax ?? "2"}` },
        ];
    }
  })();

  const suggestionDisplay = (() => {
    if (!latest) return { primary: "—", secondary: null, label: "No suggestion yet" };
    const type = latest.nextSuggestionType;
    switch (mt) {
      case "REPS_ONLY":
        return {
          label: type.replaceAll("_", " "),
          primary: latest.nextSuggestedRepMin ? `${latest.nextSuggestedRepMin}–${latest.nextSuggestedRepMax} reps` : "—",
          secondary: `Best: ${latest.bestSetReps ?? "—"} reps`,
        };
      case "TIME":
        return {
          label: type.replaceAll("_", " "),
          primary: formatDuration(latest.nextSuggestedDurationSeconds),
          secondary: `Best hold: ${formatDuration(latest.bestDurationSeconds)}`,
        };
      case "DISTANCE_TIME":
        return {
          label: type.replaceAll("_", " "),
          primary: latest.nextSuggestedDistanceKm ? `${latest.nextSuggestedDistanceKm} km` : "—",
          secondary: `Pace: ${formatPace(latest.bestPaceMinPerKm)}`,
        };
      case "WEIGHT_TIME":
        return {
          label: type.replaceAll("_", " "),
          primary: latest.nextSuggestedWeight ? `${latest.nextSuggestedWeight} kg` : "—",
          secondary: `Hold: ${formatDuration(latest.nextSuggestedDurationSeconds)}`,
        };
      default:
        return {
          label: type.replaceAll("_", " "),
          primary: latest.nextSuggestedWeight ? `${latest.nextSuggestedWeight} kg` : "—",
          secondary: latest.nextSuggestedRepMin ? `${latest.nextSuggestedRepMin}–${latest.nextSuggestedRepMax} reps` : null,
        };
    }
  })();

  return (
    <AppShell currentPath="/exercises" title={exercise.name}>
      <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <Card>
          <div className="grid gap-3 md:grid-cols-3">
            {profileMetrics.map((m) => (
              <Metric key={m.label} label={m.label} value={m.value} />
            ))}
          </div>

          <div className="mt-5 rounded-[24px] border border-white/8 bg-[#161616] p-4">
            <p className="text-xs text-[#bbb]">
              Primary: {exercise.primaryMuscle ?? "—"} &nbsp;·&nbsp;
              Secondary: {exercise.secondaryMuscles ?? "—"} &nbsp;·&nbsp;
              {exercise.measurementType.replaceAll("_", " ")}
            </p>
            {exercise.notes && (
              <p className="mt-2 text-sm text-[#ccc]">{exercise.notes}</p>
            )}
          </div>

          <div className="mt-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#ccc]">Progression trend</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {analytics.primaryLabel}
              </h2>
            </div>
            <ExerciseHistoryChart
              data={analytics.chartData}
              primaryLabel={analytics.primaryLabel}
              secondaryLabel={analytics.secondaryLabel}
              measurementType={mt}
            />
          </div>
        </Card>

        <Card>
          <p className="text-xs uppercase tracking-[0.22em] text-[#ccc]">Latest recommendation</p>

          <div className="mt-4 rounded-[24px] border border-emerald-400/15 bg-emerald-400/8 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-300">
              {suggestionDisplay.label}
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-white">
              {suggestionDisplay.primary}
            </p>
            {suggestionDisplay.secondary && (
              <p className="mt-2 text-sm text-emerald-100/80">{suggestionDisplay.secondary}</p>
            )}
          </div>

          <div className="mt-4 rounded-[24px] border border-white/8 bg-[#161616] p-4 text-sm leading-7 text-[#ccc]">
            {latest?.rationale ?? "Log this exercise in a workout to generate progression guidance."}
          </div>

          <div className="mt-6 space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#ccc]">Session history</p>
            {analytics.snapshots.length ? (
              analytics.snapshots
                .slice()
                .reverse()
                .slice(0, 8)
                .map((snapshot) => (
                  <article
                    key={snapshot.id}
                    className="rounded-2xl border border-white/8 bg-[#161616] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {new Date(snapshot.createdAt).toLocaleDateString("en-MY", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                        <p className="mt-1 text-xs text-[#bbb]">
                          {mt === "WEIGHT_REPS" && `Vol ${snapshot.totalVolume} · e1RM ${snapshot.estimated1RM ?? "—"} kg`}
                          {mt === "REPS_ONLY" && `Total reps: ${snapshot.totalVolume}`}
                          {mt === "TIME" && `Best: ${formatDuration(snapshot.bestDurationSeconds)}`}
                          {mt === "DISTANCE_TIME" && `${snapshot.totalDistanceKm ?? "—"} km · ${formatPace(snapshot.bestPaceMinPerKm)}`}
                          {mt === "WEIGHT_TIME" && `${snapshot.bestSetWeight ?? "—"} kg × ${formatDuration(snapshot.bestDurationSeconds)}`}
                        </p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-1 text-xs ${
                        snapshot.nextSuggestionType === "DELOAD"
                          ? "border-rose-400/20 text-rose-300"
                          : snapshot.nextSuggestionType === "HOLD"
                          ? "border-white/10 text-[#bbb]"
                          : "border-emerald-400/20 text-emerald-300"
                      }`}>
                        {snapshot.nextSuggestionType.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {mt === "WEIGHT_REPS" && (
                        <>
                          <Metric label="Avg RIR" value={snapshot.averageRir ?? "—"} compact />
                          <Metric label="Vol Δ%" value={snapshot.volumeDeltaPct != null ? `${snapshot.volumeDeltaPct}%` : "—"} compact />
                          <Metric label="Next" value={snapshot.nextSuggestedWeight ? `${snapshot.nextSuggestedWeight} kg` : "—"} compact />
                        </>
                      )}
                      {mt === "REPS_ONLY" && (
                        <>
                          <Metric label="Best" value={`${snapshot.bestSetReps ?? "—"} reps`} compact />
                          <Metric label="Δ%" value={snapshot.volumeDeltaPct != null ? `${snapshot.volumeDeltaPct}%` : "—"} compact />
                          <Metric label="Next" value={snapshot.nextSuggestedRepMin ? `${snapshot.nextSuggestedRepMin}–${snapshot.nextSuggestedRepMax}` : "—"} compact />
                        </>
                      )}
                      {mt === "TIME" && (
                        <>
                          <Metric label="Best" value={formatDuration(snapshot.bestDurationSeconds)} compact />
                          <Metric label="Total" value={formatDuration(snapshot.totalDurationSeconds)} compact />
                          <Metric label="Next" value={formatDuration(snapshot.nextSuggestedDurationSeconds)} compact />
                        </>
                      )}
                      {mt === "DISTANCE_TIME" && (
                        <>
                          <Metric label="Distance" value={`${snapshot.totalDistanceKm ?? "—"} km`} compact />
                          <Metric label="Pace" value={formatPace(snapshot.bestPaceMinPerKm)} compact />
                          <Metric label="Next" value={snapshot.nextSuggestedDistanceKm ? `${snapshot.nextSuggestedDistanceKm} km` : "—"} compact />
                        </>
                      )}
                      {mt === "WEIGHT_TIME" && (
                        <>
                          <Metric label="Weight" value={snapshot.bestSetWeight ? `${snapshot.bestSetWeight} kg` : "—"} compact />
                          <Metric label="Hold" value={formatDuration(snapshot.bestDurationSeconds)} compact />
                          <Metric label="Next" value={formatDuration(snapshot.nextSuggestedDurationSeconds)} compact />
                        </>
                      )}
                    </div>
                  </article>
                ))
            ) : (
              <p className="text-sm text-[#bbb]">
                No history yet. Log a session to start tracking progression.
              </p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string | number | null;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-2xl bg-white/5 ${compact ? "px-3 py-3" : "px-4 py-4"}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-[#ccc]">{label}</p>
      <p className={`mt-1.5 font-semibold text-white ${compact ? "text-xs" : "text-sm"}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}
