"use client";

import type { WorkoutSessionDto } from "@/types/api";

interface PR {
  exerciseName: string;
  measurementType: string;
  allTime: string;
  last90: string | null;
  last30: string | null;
}

function formatPR(mt: string, weight: number | null, reps: number | null, duration: number | null, distance: number | null): string {
  switch (mt) {
    case "REPS_ONLY": return reps ? `${reps} reps` : "—";
    case "TIME": return duration ? `${duration}s` : "—";
    case "DISTANCE_TIME": return distance ? `${distance} km` : "—";
    default: return weight && reps ? `${weight} kg × ${reps}` : weight ? `${weight} kg` : "—";
  }
}

function getBestFromSnapshots(
  snapshots: WorkoutSessionDto["progressionSnapshots"],
  mt: string,
  since?: Date,
) {
  const filtered = (snapshots ?? []).filter((s) =>
    since ? new Date(s.createdAt) >= since : true,
  );
  if (!filtered.length) return null;

  if (mt === "REPS_ONLY") {
    const best = filtered.reduce((a, b) => (Number(b.bestSetReps) > Number(a.bestSetReps) ? b : a));
    return formatPR(mt, null, Number(best.bestSetReps), null, null);
  }
  if (mt === "TIME") {
    const best = filtered.reduce((a, b) => (Number(b.bestDurationSeconds) > Number(a.bestDurationSeconds) ? b : a));
    return formatPR(mt, null, null, Number(best.bestDurationSeconds), null);
  }
  if (mt === "DISTANCE_TIME") {
    const best = filtered.reduce((a, b) => (Number(b.bestDistanceKm) > Number(a.bestDistanceKm) ? b : a));
    return formatPR(mt, null, null, null, Number(best.bestDistanceKm));
  }
  // WEIGHT_REPS / WEIGHT_TIME
  const best = filtered.reduce((a, b) => (Number(b.bestSetWeight) > Number(a.bestSetWeight) ? b : a));
  return formatPR(mt, Number(best.bestSetWeight), Number(best.bestSetReps), null, null);
}

export function PRTable({ workouts }: { workouts: WorkoutSessionDto[] }) {
  const now = new Date();
  const ago30 = new Date(now); ago30.setDate(now.getDate() - 30);
  const ago90 = new Date(now); ago90.setDate(now.getDate() - 90);

  // Collect snapshots per exercise
  const exerciseMap = new Map<string, { name: string; mt: string; snapshots: WorkoutSessionDto["progressionSnapshots"] }>();
  for (const workout of workouts) {
    for (const snap of workout.progressionSnapshots ?? []) {
      const entry = exerciseMap.get(snap.exerciseId);
      if (entry) {
        entry.snapshots!.push(snap);
      } else {
        exerciseMap.set(snap.exerciseId, {
          name: snap.exercise.name,
          mt: snap.exercise.measurementType,
          snapshots: [snap],
        });
      }
    }
  }

  const prs: PR[] = Array.from(exerciseMap.values()).map(({ name, mt, snapshots }) => ({
    exerciseName: name,
    measurementType: mt,
    allTime: getBestFromSnapshots(snapshots, mt) ?? "—",
    last90: getBestFromSnapshots(snapshots, mt, ago90),
    last30: getBestFromSnapshots(snapshots, mt, ago30),
  }));

  if (!prs.length) return null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.22em] text-[#bbb]">Personal records</p>
      </div>
      <div className="relative overflow-x-auto">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[#111111] to-transparent" />
        <table className="w-full min-w-[360px] text-sm">
          <thead>
            <tr className="text-left">
              <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-[0.18em] text-[#999]">Exercise</th>
              <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-[0.18em] text-[#999]">All time</th>
              <th className="pb-3 pr-4 text-xs font-medium uppercase tracking-[0.18em] text-[#999]">Last 90d</th>
              <th className="pb-3 text-xs font-medium uppercase tracking-[0.18em] text-[#999]">Last 30d</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {prs.map((pr) => (
              <tr key={pr.exerciseName}>
                <td className="py-3 pr-4 font-medium text-white">{pr.exerciseName}</td>
                <td className="py-3 pr-4 text-emerald-300">{pr.allTime}</td>
                <td className="py-3 pr-4 text-[#ccc]">{pr.last90 ?? "—"}</td>
                <td className="py-3 text-[#ccc]">{pr.last30 ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
