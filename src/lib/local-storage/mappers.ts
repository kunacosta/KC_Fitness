import type {
  ExerciseDto,
  ExerciseSetDto,
  ProgressionSnapshotDto,
  WorkoutExerciseDto,
  WorkoutPrefillDto,
  WorkoutSessionDto,
} from "@/types/api";
import type {
  LocalExercise,
  LocalExerciseSet,
  LocalProgressionSnapshot,
  LocalWorkoutExercise,
  LocalWorkoutSession,
} from "@/types/local-db";
import type { PrefillResult } from "@/lib/db";

function numToStr(value: number | null | undefined): string | null {
  return value != null ? String(value) : null;
}

export function mapLocalExerciseToDto(exercise: LocalExercise): ExerciseDto {
  return {
    ...exercise,
    incrementStep: String(exercise.incrementStep),
    targetRirMin: numToStr(exercise.targetRirMin),
    targetRirMax: numToStr(exercise.targetRirMax),
    distanceTargetKm: numToStr(exercise.distanceTargetKm),
  };
}

export function mapLocalSetToDto(set: LocalExerciseSet): ExerciseSetDto {
  return {
    ...set,
    weight: String(set.weight),
    rir: numToStr(set.rir),
    distanceKm: numToStr(set.distanceKm),
  };
}

export function mapLocalWorkoutExerciseToDto(exercise: LocalWorkoutExercise): WorkoutExerciseDto {
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    orderIndex: exercise.orderIndex,
    notes: exercise.notes,
    exercise: mapLocalExerciseToDto(exercise.exercise),
    sets: exercise.sets.map(mapLocalSetToDto),
  };
}

export function mapLocalSnapshotToDto(snapshot: LocalProgressionSnapshot): ProgressionSnapshotDto {
  return {
    ...snapshot,
    totalVolume: String(snapshot.totalVolume),
    effectiveVolume: String(snapshot.effectiveVolume),
    averageRir: numToStr(snapshot.averageRir),
    bestSetWeight: numToStr(snapshot.bestSetWeight),
    estimated1RM: numToStr(snapshot.estimated1RM),
    bestDistanceKm: numToStr(snapshot.bestDistanceKm),
    totalDistanceKm: numToStr(snapshot.totalDistanceKm),
    bestPaceMinPerKm: numToStr(snapshot.bestPaceMinPerKm),
    volumeDeltaPct: numToStr(snapshot.volumeDeltaPct),
    performanceScore: numToStr(snapshot.performanceScore),
    nextSuggestedWeight: numToStr(snapshot.nextSuggestedWeight),
    nextSuggestedDistanceKm: numToStr(snapshot.nextSuggestedDistanceKm),
    exercise: mapLocalExerciseToDto(snapshot.exercise),
  };
}

export function mapLocalWorkoutToDto(workout: LocalWorkoutSession): WorkoutSessionDto {
  return {
    ...workout,
    workoutExercises: workout.workoutExercises.map(mapLocalWorkoutExerciseToDto),
    progressionSnapshots: (workout.progressionSnapshots ?? []).map(mapLocalSnapshotToDto),
  };
}

export function mapLocalWorkoutsToDto(workouts: LocalWorkoutSession[]): WorkoutSessionDto[] {
  return workouts.map(mapLocalWorkoutToDto);
}

export function mapLocalExercisesToDto(exercises: LocalExercise[]): ExerciseDto[] {
  return exercises.map(mapLocalExerciseToDto);
}

export function mapLocalPrefillToDto(result: PrefillResult): WorkoutPrefillDto {
  return {
    exerciseId: result.exerciseId,
    exerciseName: result.exerciseName,
    measurementType: result.measurementType,
    lastPerformedAt: result.lastPerformedAt,
    lastSets: result.lastSets.map((set) => ({
      setNumber: set.setNumber,
      setType: set.setType,
      weight: String(set.weight),
      reps: set.reps,
      durationSeconds: set.durationSeconds ?? null,
      distanceKm: typeof set.distanceKm === "number" ? String(set.distanceKm) : null,
      rir: typeof set.rir === "number" ? String(set.rir) : null,
    })),
    latestSnapshot: result.latestSnapshot ? mapLocalSnapshotToDto(result.latestSnapshot) : null,
  };
}
