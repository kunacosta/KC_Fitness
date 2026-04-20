export interface ApiResponse<T> {
  ok: boolean;
  data: T;
}

export interface ExerciseDto {
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
  incrementStep: string;
  repTargetMin: number;
  repTargetMax: number;
  targetRirMin: string | null;
  targetRirMax: string | null;
  durationTargetSeconds: number | null;
  distanceTargetKm: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseSetDto {
  id: string;
  setNumber: number;
  setType: string;
  weight: string;
  reps: number;
  durationSeconds: number | null;
  distanceKm: string | null;
  rir: string | null;
  completed: boolean;
}

export interface WorkoutExerciseDto {
  id: string;
  exerciseId: string;
  orderIndex: number;
  notes: string | null;
  exercise: ExerciseDto;
  sets: ExerciseSetDto[];
}

export interface ProgressionSnapshotDto {
  id: string;
  exerciseId: string;
  workoutSessionId: string;
  totalVolume: string;
  effectiveVolume: string;
  averageRir: string | null;
  bestSetWeight: string | null;
  bestSetReps: number | null;
  estimated1RM: string | null;
  bestDurationSeconds: number | null;
  totalDurationSeconds: number | null;
  bestDistanceKm: string | null;
  totalDistanceKm: string | null;
  bestPaceMinPerKm: string | null;
  volumeDeltaPct: string | null;
  performanceScore: string | null;
  nextSuggestionType: string;
  nextSuggestedWeight: string | null;
  nextSuggestedRepMin: number | null;
  nextSuggestedRepMax: number | null;
  nextSuggestedDurationSeconds: number | null;
  nextSuggestedDistanceKm: string | null;
  rationale: string | null;
  createdAt: string;
  exercise: ExerciseDto;
}

export interface WorkoutSessionDto {
  id: string;
  userId: string;
  title: string;
  notes: string | null;
  performedAt: string;
  durationMin: number | null;
  createdAt: string;
  updatedAt: string;
  workoutExercises: WorkoutExerciseDto[];
  progressionSnapshots?: ProgressionSnapshotDto[];
}

export interface WorkoutPrefillDto {
  exerciseId: string;
  exerciseName: string;
  measurementType: string;
  lastPerformedAt: string | null;
  lastSets: Array<{
    setNumber: number;
    setType: string;
    weight: string;
    reps: number;
    durationSeconds: number | null;
    distanceKm: string | null;
    rir: string | null;
  }>;
  latestSnapshot: ProgressionSnapshotDto | null;
}
