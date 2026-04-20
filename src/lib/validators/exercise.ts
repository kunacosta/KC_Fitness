import { z } from "zod";

export const exerciseCategoryValues = [
  "CHEST",
  "BACK",
  "LEGS",
  "SHOULDERS",
  "ARMS",
  "CORE",
  "FULL_BODY",
  "CARDIO",
  "OTHER",
] as const;

export const movementPatternValues = [
  "PUSH",
  "PULL",
  "SQUAT",
  "HINGE",
  "LUNGE",
  "CARRY",
  "ROTATION",
  "ISOLATION",
  "OTHER",
] as const;

export const equipmentTypeValues = [
  "BARBELL",
  "DUMBBELL",
  "MACHINE",
  "CABLE",
  "BODYWEIGHT",
  "KETTLEBELL",
  "SMITH_MACHINE",
  "EZ_BAR",
  "RESISTANCE_BAND",
  "OTHER",
] as const;

export const measurementTypeValues = [
  "WEIGHT_REPS",
  "REPS_ONLY",
  "TIME",
  "DISTANCE_TIME",
  "WEIGHT_TIME",
] as const;

export const measurementTypeLabels: Record<(typeof measurementTypeValues)[number], string> = {
  WEIGHT_REPS: "Weight + Reps",
  REPS_ONLY: "Reps only (bodyweight)",
  TIME: "Duration (seconds)",
  DISTANCE_TIME: "Distance + Time (cardio)",
  WEIGHT_TIME: "Weight + Duration (carries)",
};

export const createExerciseSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    category: z.enum(exerciseCategoryValues),
    movementPattern: z.enum(movementPatternValues),
    equipment: z.enum(equipmentTypeValues),
    measurementType: z.enum(measurementTypeValues).default("WEIGHT_REPS"),
    primaryMuscle: z.string().trim().min(2).max(50).optional().or(z.literal("")),
    secondaryMuscles: z.string().trim().max(120).optional().or(z.literal("")),
    notes: z.string().trim().max(280).optional().or(z.literal("")),
    // WEIGHT_REPS / REPS_ONLY / WEIGHT_TIME
    incrementStep: z.number().positive().max(25).default(2.5),
    repTargetMin: z.number().int().min(1).max(50).default(6),
    repTargetMax: z.number().int().min(1).max(50).default(10),
    targetRirMin: z.number().min(0).max(5).optional(),
    targetRirMax: z.number().min(0).max(5).optional(),
    // TIME / WEIGHT_TIME
    durationTargetSeconds: z.number().int().min(1).max(3600).optional().nullable(),
    // DISTANCE_TIME
    distanceTargetKm: z.number().positive().max(200).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.repTargetMax < value.repTargetMin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "repTargetMax must be >= repTargetMin",
        path: ["repTargetMax"],
      });
    }

    if (
      typeof value.targetRirMin === "number" &&
      typeof value.targetRirMax === "number" &&
      value.targetRirMax < value.targetRirMin
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "targetRirMax must be >= targetRirMin",
        path: ["targetRirMax"],
      });
    }

    if (
      (value.measurementType === "TIME" || value.measurementType === "WEIGHT_TIME") &&
      !value.durationTargetSeconds
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duration target (seconds) is required for TIME and WEIGHT_TIME exercises",
        path: ["durationTargetSeconds"],
      });
    }

    if (value.measurementType === "DISTANCE_TIME" && !value.distanceTargetKm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Distance target (km) is required for DISTANCE_TIME exercises",
        path: ["distanceTargetKm"],
      });
    }
  });

export type CreateExerciseInput = z.infer<typeof createExerciseSchema>;
