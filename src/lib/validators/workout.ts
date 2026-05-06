import { z } from "zod";

export const setTypeValues = [
  "WARMUP",
  "WORKING",
  "TOP_SET",
  "BACKOFF",
  "FAILURE",
] as const;

const exerciseSetSchema = z.object({
  setNumber: z.number().int().min(1).max(20),
  setType: z.enum(setTypeValues).default("WORKING"),
  // WEIGHT_REPS / WEIGHT_TIME
  weight: z.number().min(0).max(1000).default(0),
  // WEIGHT_REPS / REPS_ONLY
  reps: z.number().int().min(0).max(200).default(0),
  // TIME / DISTANCE_TIME / WEIGHT_TIME
  durationSeconds: z.number().int().min(0).max(86400).nullable().optional(),
  // DISTANCE_TIME
  distanceKm: z.number().min(0).max(1000).nullable().optional(),
  // Quality
  rir: z.number().min(0).max(6).nullable().optional(),
  restSeconds: z.number().int().min(0).max(1800).nullable().optional(),
  tempo: z.string().trim().max(20).nullable().optional(),
  completed: z.boolean().optional().default(true),
});

const workoutExerciseSchema = z.object({
  exerciseId: z.string().min(1),
  orderIndex: z.number().int().min(0).max(100),
  notes: z.string().trim().max(280).nullable().optional(),
  sets: z.array(exerciseSetSchema).min(1).max(20),
});

export const createWorkoutSessionSchema = z.object({
  title: z.string().trim().min(2).max(80),
  notes: z.string().trim().max(500).nullable().optional(),
  performedAt: z.string().datetime().optional(),
  durationMin: z.number().int().min(1).max(600).nullable().optional(),
  exercises: z.array(workoutExerciseSchema).min(1).max(20),
});

export type CreateWorkoutSessionInput = z.infer<typeof createWorkoutSessionSchema>;
