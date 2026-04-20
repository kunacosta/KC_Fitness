import type { WorkoutPrefillDto, WorkoutSessionDto } from "@/types/api";

export function buildWorkoutPrefill(
  workouts: WorkoutSessionDto[],
  exerciseId: string,
): WorkoutPrefillDto | null {
  const matchingWorkout = workouts.find((workout) =>
    workout.workoutExercises.some((exercise) => exercise.exerciseId === exerciseId),
  );

  if (!matchingWorkout) return null;

  const workoutExercise = matchingWorkout.workoutExercises.find(
    (exercise) => exercise.exerciseId === exerciseId,
  );

  if (!workoutExercise) return null;

  const latestSnapshot = (matchingWorkout.progressionSnapshots ?? []).find(
    (snapshot) => snapshot.exerciseId === exerciseId,
  );

  return {
    exerciseId,
    exerciseName: workoutExercise.exercise.name,
    measurementType: workoutExercise.exercise.measurementType,
    lastPerformedAt: matchingWorkout.performedAt,
    lastSets: workoutExercise.sets.map((set) => ({
      setNumber: set.setNumber,
      setType: set.setType,
      weight: set.weight,
      reps: set.reps,
      durationSeconds: set.durationSeconds ?? null,
      distanceKm: set.distanceKm ?? null,
      rir: set.rir,
    })),
    latestSnapshot: latestSnapshot ?? null,
  };
}
