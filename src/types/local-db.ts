export interface LocalExercise {
  id: string;
  userId: string | null;
  name: string;
  slug: string;
  category: string;
  movementPattern: string;
  equipment: string;
  measurementType: string;
  primaryMuscle: string | null;
  secondaryMuscles: string | null;
  notes: string | null;
  isCustom: boolean;
  incrementStep: number;
  repTargetMin: number;
  repTargetMax: number;
  targetRirMin: number | null;
  targetRirMax: number | null;
  durationTargetSeconds: number | null;
  distanceTargetKm: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalExerciseSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  setType: string;
  weight: number;
  reps: number;
  durationSeconds: number | null;
  distanceKm: number | null;
  rir: number | null;
  restSeconds: number | null;
  tempo: string | null;
  completed: boolean;
  createdAt: string;
}

export interface LocalWorkoutExercise {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  orderIndex: number;
  notes: string | null;
  createdAt: string;
  exercise: LocalExercise;
  sets: LocalExerciseSet[];
}

export interface LocalProgressionSnapshot {
  id: string;
  userId: string;
  exerciseId: string;
  workoutSessionId: string;
  totalVolume: number;
  effectiveVolume: number;
  averageRir: number | null;
  bestSetWeight: number | null;
  bestSetReps: number | null;
  estimated1RM: number | null;
  bestDurationSeconds: number | null;
  totalDurationSeconds: number | null;
  bestDistanceKm: number | null;
  totalDistanceKm: number | null;
  bestPaceMinPerKm: number | null;
  volumeDeltaPct: number | null;
  performanceScore: number | null;
  nextSuggestionType: string;
  nextSuggestedWeight: number | null;
  nextSuggestedRepMin: number | null;
  nextSuggestedRepMax: number | null;
  nextSuggestedDurationSeconds: number | null;
  nextSuggestedDistanceKm: number | null;
  rationale: string | null;
  createdAt: string;
  exercise: LocalExercise;
}

export interface LocalWorkoutSession {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  performedAt: string;
  durationMin: number | null;
  createdAt: string;
  updatedAt: string;
  workoutExercises: LocalWorkoutExercise[];
  progressionSnapshots?: LocalProgressionSnapshot[];
}

export interface LocalAppState {
  exercises: LocalExercise[];
  workouts: LocalWorkoutSession[];
  initializedAt: string | null;
}
