/**
 * Client-side database using localStorage.
 * Replaces the API routes for the offline/APK build.
 * All functions are browser-only — call them from client components only.
 */

import { calculateOverload } from "@/lib/overload-engine";
import type { MeasurementType } from "@/lib/overload-engine";
import { readLocalAppState, writeLocalAppState } from "@/lib/local-storage/store";
import type {
  LocalExercise,
  LocalExerciseSet,
  LocalProgressionSnapshot,
  LocalWorkoutSession,
} from "@/types/local-db";

// ── ID generation ─────────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

// ── Exercises ─────────────────────────────────────────────────────────────────

export function dbGetExercises(): LocalExercise[] {
  const state = readLocalAppState();
  return state.exercises;
}

export interface CreateExerciseInput {
  name: string;
  slug: string;
  category: string;
  movementPattern: string;
  equipment: string;
  measurementType: string;
  primaryMuscle?: string | null;
  secondaryMuscles?: string | null;
  notes?: string | null;
  incrementStep: number;
  repTargetMin: number;
  repTargetMax: number;
  targetRirMin?: number | null;
  targetRirMax?: number | null;
  durationTargetSeconds?: number | null;
  distanceTargetKm?: number | null;
}

export function dbCreateExercise(input: CreateExerciseInput): LocalExercise {
  const state = readLocalAppState();
  const now = new Date().toISOString();

  // Handle duplicate slugs
  const existingSlugs = state.exercises.map((e) => e.slug);
  let slug = input.slug;
  let counter = 2;
  while (existingSlugs.includes(slug)) {
    slug = `${input.slug}-${counter++}`;
  }

  const exercise: LocalExercise = {
    id: genId(),
    userId: "local-user",
    name: input.name,
    slug,
    category: input.category,
    movementPattern: input.movementPattern,
    equipment: input.equipment,
    measurementType: input.measurementType,
    primaryMuscle: input.primaryMuscle ?? null,
    secondaryMuscles: input.secondaryMuscles ?? null,
    notes: input.notes ?? null,
    isCustom: true,
    incrementStep: input.incrementStep,
    repTargetMin: input.repTargetMin,
    repTargetMax: input.repTargetMax,
    targetRirMin: input.targetRirMin ?? null,
    targetRirMax: input.targetRirMax ?? null,
    durationTargetSeconds: input.durationTargetSeconds ?? null,
    distanceTargetKm: input.distanceTargetKm ?? null,
    createdAt: now,
    updatedAt: now,
  };

  writeLocalAppState({ ...state, exercises: [...state.exercises, exercise] });
  return exercise;
}

// ── Workouts ──────────────────────────────────────────────────────────────────

export function dbGetWorkouts(): LocalWorkoutSession[] {
  const state = readLocalAppState();
  return [...state.workouts].sort(
    (a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime(),
  );
}

export interface CreateWorkoutSetInput {
  setNumber: number;
  setType: string;
  weight: number;
  reps: number;
  durationSeconds?: number | null;
  distanceKm?: number | null;
  rir?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  completed?: boolean;
}

export interface CreateWorkoutExerciseInput {
  exerciseId: string;
  orderIndex: number;
  notes?: string | null;
  sets: CreateWorkoutSetInput[];
}

export interface CreateWorkoutInput {
  title: string;
  notes?: string | null;
  durationMin?: number | null;
  performedAt?: string;
  exercises: CreateWorkoutExerciseInput[];
}

export function dbCreateWorkout(input: CreateWorkoutInput): LocalWorkoutSession {
  const state = readLocalAppState();
  const now = new Date().toISOString();
  const sessionId = genId();
  const performedAt = input.performedAt ?? now;

  const workoutExercises = input.exercises.map((workoutExercise) => {
    const exercise = state.exercises.find((e) => e.id === workoutExercise.exerciseId);
    if (!exercise) throw new Error(`Exercise ${workoutExercise.exerciseId} not found`);

    const sets: LocalExerciseSet[] = workoutExercise.sets.map((set) => ({
      id: genId(),
      workoutExerciseId: genId(),
      setNumber: set.setNumber,
      setType: set.setType,
      weight: set.weight ?? 0,
      reps: set.reps ?? 0,
      durationSeconds: set.durationSeconds ?? null,
      distanceKm: set.distanceKm ?? null,
      rir: set.rir ?? null,
      restSeconds: set.restSeconds ?? null,
      tempo: set.tempo ?? null,
      completed: set.completed ?? true,
      createdAt: now,
    }));

    return {
      id: genId(),
      workoutSessionId: sessionId,
      exerciseId: workoutExercise.exerciseId,
      orderIndex: workoutExercise.orderIndex,
      notes: workoutExercise.notes ?? null,
      createdAt: now,
      exercise,
      sets,
    };
  });

  // Build a snapshot index keyed by exerciseId for O(1) lookup
  const latestSnapshotByExercise = new Map<string, LocalProgressionSnapshot>();
  for (const workout of state.workouts) {
    for (const snap of workout.progressionSnapshots ?? []) {
      const existing = latestSnapshotByExercise.get(snap.exerciseId);
      if (!existing || snap.createdAt > existing.createdAt) {
        latestSnapshotByExercise.set(snap.exerciseId, snap);
      }
    }
  }

  // Run overload engine for each exercise
  const progressionSnapshots: LocalProgressionSnapshot[] = [];

  for (const workoutExercise of workoutExercises) {
    const exercise = workoutExercise.exercise;

    const previousSnapshot = latestSnapshotByExercise.get(exercise.id);

    const validMeasurementTypes: MeasurementType[] = ["WEIGHT_REPS", "REPS_ONLY", "TIME", "DISTANCE_TIME", "WEIGHT_TIME"];
    if (!validMeasurementTypes.includes(exercise.measurementType as MeasurementType)) {
      console.warn(`KC Fitness: unknown measurementType "${exercise.measurementType}" for exercise "${exercise.name}" — skipping overload calculation`);
      continue;
    }

    let result;
    try {
      result = calculateOverload({
        profile: {
          name: exercise.name,
          measurementType: exercise.measurementType as MeasurementType,
          incrementStep: exercise.incrementStep,
          repTargetMin: exercise.repTargetMin,
          repTargetMax: exercise.repTargetMax,
          targetRirMin: exercise.targetRirMin ?? undefined,
          targetRirMax: exercise.targetRirMax ?? undefined,
          durationTargetSeconds: exercise.durationTargetSeconds ?? null,
          distanceTargetKm: exercise.distanceTargetKm ?? null,
        },
        sets: workoutExercise.sets.map((set) => ({
          weight: set.weight,
          reps: set.reps,
          durationSeconds: set.durationSeconds ?? undefined,
          distanceKm: set.distanceKm ?? undefined,
          rir: set.rir ?? undefined,
          completed: set.completed,
        })),
        previousSessions: previousSnapshot
          ? [
              {
                totalVolume: previousSnapshot.totalVolume,
                effectiveVolume: previousSnapshot.effectiveVolume,
                averageRir: previousSnapshot.averageRir ?? null,
                topWeight: previousSnapshot.bestSetWeight ?? 0,
                topReps: previousSnapshot.bestSetReps ?? 0,
                bestDurationSeconds: previousSnapshot.bestDurationSeconds ?? null,
                totalDurationSeconds: previousSnapshot.totalDurationSeconds ?? null,
                bestDistanceKm: previousSnapshot.bestDistanceKm ?? null,
                totalDistanceKm: previousSnapshot.totalDistanceKm ?? null,
                bestPaceMinPerKm: previousSnapshot.bestPaceMinPerKm ?? null,
              },
            ]
          : [],
      });
    } catch (err) {
      console.warn(`KC Fitness: overload calculation failed for "${exercise.name}"`, err);
      continue;
    }

    progressionSnapshots.push({
      id: genId(),
      userId: "local-user",
      exerciseId: exercise.id,
      workoutSessionId: sessionId,
      totalVolume: result.totalVolume,
      effectiveVolume: result.effectiveVolume,
      averageRir: result.averageRir,
      bestSetWeight: result.topWeight,
      bestSetReps: result.topReps,
      estimated1RM: result.estimated1RM,
      bestDurationSeconds: result.bestDurationSeconds,
      totalDurationSeconds: result.totalDurationSeconds,
      bestDistanceKm: result.bestDistanceKm,
      totalDistanceKm: result.totalDistanceKm,
      bestPaceMinPerKm: result.bestPaceMinPerKm,
      volumeDeltaPct: result.volumeDeltaPct,
      performanceScore: result.performanceScore,
      nextSuggestionType: result.suggestionType,
      nextSuggestedWeight: result.nextWeight,
      nextSuggestedRepMin: result.nextRepMin,
      nextSuggestedRepMax: result.nextRepMax,
      nextSuggestedDurationSeconds: result.nextSuggestedDurationSeconds,
      nextSuggestedDistanceKm: result.nextSuggestedDistanceKm,
      rationale: result.rationale,
      createdAt: now,
      exercise,
    });
  }

  const session: LocalWorkoutSession = {
    id: sessionId,
    userId: "local-user",
    title: input.title,
    notes: input.notes ?? null,
    durationMin: input.durationMin ?? null,
    performedAt,
    createdAt: now,
    updatedAt: now,
    workoutExercises,
    progressionSnapshots,
  };

  writeLocalAppState({ ...state, workouts: [...state.workouts, session] });

  // Fire-and-forget: auto-save backup to device Documents folder after every workout
  if (typeof window !== "undefined") {
    import("@/lib/backup").then(({ autoSaveToDevice }) => {
      autoSaveToDevice();
    });
  }

  return session;
}

export function dbDeleteWorkout(workoutId: string): void {
  const state = readLocalAppState();
  writeLocalAppState({
    ...state,
    workouts: state.workouts.filter((w) => w.id !== workoutId),
  });
}

export function dbDeleteExercise(exerciseId: string): void {
  const state = readLocalAppState();
  writeLocalAppState({
    ...state,
    exercises: state.exercises.filter((e) => e.id !== exerciseId),
  });
}

// ── Prefill ───────────────────────────────────────────────────────────────────

export interface PrefillResult {
  exerciseId: string;
  exerciseName: string;
  measurementType: string;
  lastPerformedAt: string | null;
  lastSets: LocalExerciseSet[];
  latestSnapshot: LocalProgressionSnapshot | null;
}

export function dbGetPrefill(exerciseId: string): PrefillResult | null {
  const state = readLocalAppState();
  const exercise = state.exercises.find((e) => e.id === exerciseId);
  if (!exercise) return null;

  const workoutsWithExercise = state.workouts
    .filter((w) => w.workoutExercises.some((we) => we.exerciseId === exerciseId))
    .sort((a, b) => new Date(b.performedAt).getTime() - new Date(a.performedAt).getTime());

  const latestWorkout = workoutsWithExercise[0];
  if (!latestWorkout) {
    return {
      exerciseId,
      exerciseName: exercise.name,
      measurementType: exercise.measurementType,
      lastPerformedAt: null,
      lastSets: [],
      latestSnapshot: null,
    };
  }

  const workoutExercise = latestWorkout.workoutExercises.find(
    (we) => we.exerciseId === exerciseId,
  );

  let latestSnapshot: LocalProgressionSnapshot | null = null;
  for (const w of state.workouts) {
    for (const s of w.progressionSnapshots ?? []) {
      if (s.exerciseId === exerciseId && (!latestSnapshot || s.createdAt > latestSnapshot.createdAt)) {
        latestSnapshot = s;
      }
    }
  }

  return {
    exerciseId,
    exerciseName: exercise.name,
    measurementType: exercise.measurementType,
    lastPerformedAt: latestWorkout.performedAt,
    lastSets: workoutExercise?.sets ?? [],
    latestSnapshot,
  };
}
