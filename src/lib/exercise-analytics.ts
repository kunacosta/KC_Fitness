import type { ExerciseHistoryPoint } from "@/components/exercise-history-chart";
import type { ExerciseDto, ProgressionSnapshotDto, WorkoutSessionDto } from "@/types/api";

export interface ExerciseAnalyticsSummary {
  snapshots: ProgressionSnapshotDto[];
  chartData: ExerciseHistoryPoint[];
  primaryLabel: string;
  secondaryLabel: string;
  latestSnapshot: ProgressionSnapshotDto | null;
  measurementType: string;
}

function shortDate(isoString: string) {
  return new Date(isoString).toLocaleDateString("en-MY", { month: "short", day: "numeric" });
}

export function buildExerciseAnalytics(
  workouts: WorkoutSessionDto[],
  exerciseId: string,
  exercise?: ExerciseDto,
): ExerciseAnalyticsSummary {
  const measurementType = exercise?.measurementType ?? "WEIGHT_REPS";

  const snapshots = workouts
    .flatMap((workout) => workout.progressionSnapshots ?? [])
    .filter((snapshot) => snapshot.exerciseId === exerciseId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  let primaryLabel = "Volume (kg·reps)";
  let secondaryLabel = "e1RM (kg)";

  const chartData: ExerciseHistoryPoint[] = snapshots.map((snapshot, index) => {
    const date = shortDate(snapshot.createdAt);
    const sessionLabel = `S${index + 1}`;

    switch (measurementType) {
      case "REPS_ONLY": {
        primaryLabel = "Total reps";
        secondaryLabel = "";
        return {
          date,
          sessionLabel,
          primary: Number(snapshot.totalVolume),
          secondary: 0,
        };
      }
      case "TIME": {
        primaryLabel = "Best hold (s)";
        secondaryLabel = "Total (s)";
        return {
          date,
          sessionLabel,
          primary: snapshot.bestDurationSeconds ?? 0,
          secondary: snapshot.totalDurationSeconds ?? 0,
        };
      }
      case "DISTANCE_TIME": {
        primaryLabel = "Distance (km)";
        secondaryLabel = "Pace (min/km)";
        return {
          date,
          sessionLabel,
          primary: Number(snapshot.totalDistanceKm ?? 0),
          secondary: Number(snapshot.bestPaceMinPerKm ?? 0),
        };
      }
      case "WEIGHT_TIME": {
        primaryLabel = "Volume (kg·s)";
        secondaryLabel = "Best hold (s)";
        return {
          date,
          sessionLabel,
          primary: Number(snapshot.totalVolume),
          secondary: snapshot.bestDurationSeconds ?? 0,
        };
      }
      default: {
        // WEIGHT_REPS
        return {
          date,
          sessionLabel,
          primary: Number(snapshot.totalVolume),
          secondary: Number(snapshot.estimated1RM ?? 0),
        };
      }
    }
  });

  return {
    snapshots,
    chartData,
    primaryLabel,
    secondaryLabel,
    latestSnapshot: snapshots[snapshots.length - 1] ?? null,
    measurementType,
  };
}
