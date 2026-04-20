import { DEFAULT_EXERCISES, DEFAULT_USER_ID } from "@/lib/constants";
import type { LocalAppState, LocalExercise } from "@/types/local-db";

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string, value: string) {
  return `${prefix}-${value}`;
}

export function buildSeedExercises(): LocalExercise[] {
  const timestamp = nowIso();

  return DEFAULT_EXERCISES.map((exercise) => ({
    id: makeId("exercise", exercise.slug),
    userId: DEFAULT_USER_ID,
    name: exercise.name,
    slug: exercise.slug,
    category: exercise.category,
    movementPattern: exercise.movementPattern,
    equipment: exercise.equipment,
    measurementType: exercise.measurementType,
    primaryMuscle: exercise.primaryMuscle,
    secondaryMuscles: exercise.secondaryMuscles,
    notes: null,
    isCustom: exercise.isCustom,
    incrementStep: exercise.incrementStep,
    repTargetMin: exercise.repTargetMin,
    repTargetMax: exercise.repTargetMax,
    targetRirMin: exercise.targetRirMin,
    targetRirMax: exercise.targetRirMax,
    durationTargetSeconds: exercise.durationTargetSeconds ?? null,
    distanceTargetKm: exercise.distanceTargetKm ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function buildInitialLocalAppState(): LocalAppState {
  return {
    exercises: buildSeedExercises(),
    workouts: [],
    initializedAt: nowIso(),
  };
}
