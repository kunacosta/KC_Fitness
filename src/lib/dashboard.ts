import type {
  ExerciseDto,
  ProgressionSnapshotDto,
  WorkoutSessionDto,
} from "@/types/api";

export interface DashboardSummary {
  exerciseCount: number;
  workoutCount: number;
  latestSnapshot: ProgressionSnapshotDto | null;
  latestWorkout: WorkoutSessionDto | null;
  totalVolume: number;
  effectiveVolume: number;
  averageRir: number | null;
  trend: Array<{ name: string; volume: number }>;
  recentPRs: Array<{ exerciseName: string; value: string; date: string }>;
}

function toNumber(value: string | null | undefined) {
  if (!value) return 0;
  return Number(value);
}

function formatSnapshotValue(snapshot: ProgressionSnapshotDto): string {
  const mt = snapshot.exercise.measurementType;
  switch (mt) {
    case "REPS_ONLY":
      return `${snapshot.bestSetReps ?? "—"} reps`;
    case "TIME": {
      const s = snapshot.bestDurationSeconds;
      if (!s) return "—";
      const m = Math.floor(s / 60);
      return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
    }
    case "DISTANCE_TIME":
      return `${snapshot.totalDistanceKm ?? "—"} km`;
    case "WEIGHT_TIME":
      return `${snapshot.bestSetWeight ?? "—"} kg`;
    default:
      return snapshot.nextSuggestedWeight ? `${snapshot.nextSuggestedWeight} kg` : "—";
  }
}

export function buildDashboardSummary(
  exercises: ExerciseDto[],
  workouts: WorkoutSessionDto[],
): DashboardSummary {
  const latestWorkout = workouts[0] ?? null;
  const allSnapshots = workouts.flatMap((w) => w.progressionSnapshots ?? []);
  const latestSnapshot = allSnapshots[0] ?? null;

  const trend = workouts
    .slice(0, 7)
    .map((workout, index) => ({
      name: new Date(workout.performedAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" }),
      volume: workout.workoutExercises.reduce(
        (sum, ex) =>
          sum +
          ex.sets.reduce((setSum, set) => {
            // Use weight×reps for traditional lifts; total reps or duration for others
            const mt = ex.exercise.measurementType;
            if (mt === "WEIGHT_REPS" || mt === "WEIGHT_TIME") return setSum + Number(set.weight) * (set.reps || 1);
            if (mt === "REPS_ONLY") return setSum + set.reps;
            if (mt === "TIME" || mt === "DISTANCE_TIME") return setSum + (set.durationSeconds ?? 0);
            return setSum;
          }, 0),
        0,
      ),
    }))
    .reverse();

  // Recent PRs: best snapshot per exercise from last 14 days
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentPRs = allSnapshots
    .filter((s) => new Date(s.createdAt).getTime() > twoWeeksAgo)
    .filter((s) => s.nextSuggestionType === "INCREASE_WEIGHT" || s.nextSuggestionType === "INCREASE_REPS" || s.nextSuggestionType === "INCREASE_DURATION" || s.nextSuggestionType === "INCREASE_DISTANCE")
    .slice(0, 4)
    .map((s) => ({
      exerciseName: s.exercise.name,
      value: formatSnapshotValue(s),
      date: new Date(s.createdAt).toLocaleDateString("en-MY", { month: "short", day: "numeric" }),
    }));

  return {
    exerciseCount: exercises.length,
    workoutCount: workouts.length,
    latestSnapshot,
    latestWorkout,
    totalVolume: latestSnapshot ? toNumber(latestSnapshot.totalVolume) : 0,
    effectiveVolume: latestSnapshot ? toNumber(latestSnapshot.effectiveVolume) : 0,
    averageRir: latestSnapshot?.averageRir ? Number(latestSnapshot.averageRir) : null,
    trend,
    recentPRs,
  };
}
