import { dbCreateExercise, dbCreateWorkout, dbGetExercises } from "@/lib/db";
import { readLocalAppState, writeLocalAppState } from "@/lib/local-storage/store";

export function seedDemoData() {
  const existing = dbGetExercises();
  const hasDemo = existing.some((e) => e.notes === "__demo__");
  if (hasDemo) return;

  // Create exercises
  const bench = dbCreateExercise({
    name: "Bench Press",
    slug: "bench-press-demo",
    category: "STRENGTH",
    movementPattern: "PUSH",
    equipment: "BARBELL",
    measurementType: "WEIGHT_REPS",
    primaryMuscle: "Chest",
    incrementStep: 2.5,
    repTargetMin: 8,
    repTargetMax: 12,
    targetRirMin: 1,
    targetRirMax: 3,
    notes: "__demo__",
  });

  const squat = dbCreateExercise({
    name: "Back Squat",
    slug: "back-squat-demo",
    category: "STRENGTH",
    movementPattern: "SQUAT",
    equipment: "BARBELL",
    measurementType: "WEIGHT_REPS",
    primaryMuscle: "Quads",
    incrementStep: 5,
    repTargetMin: 5,
    repTargetMax: 8,
    targetRirMin: 1,
    targetRirMax: 2,
    notes: "__demo__",
  });

  const pullup = dbCreateExercise({
    name: "Pull-up",
    slug: "pull-up-demo",
    category: "STRENGTH",
    movementPattern: "PULL",
    equipment: "BODYWEIGHT",
    measurementType: "REPS_ONLY",
    primaryMuscle: "Lats",
    incrementStep: 1,
    repTargetMin: 8,
    repTargetMax: 12,
    targetRirMin: 1,
    targetRirMax: 3,
    notes: "__demo__",
  });

  const plank = dbCreateExercise({
    name: "Plank",
    slug: "plank-demo",
    category: "CORE",
    movementPattern: "ISOMETRIC",
    equipment: "BODYWEIGHT",
    measurementType: "TIME",
    durationTargetSeconds: 60,
    incrementStep: 1,
    repTargetMin: 1,
    repTargetMax: 1,
    notes: "__demo__",
  });

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  // Session 1 — 28 days ago (first time, no baseline)
  dbCreateWorkout({
    title: "Push + Pull A",
    durationMin: 55,
    performedAt: daysAgo(28),
    exercises: [
      {
        exerciseId: bench.id,
        orderIndex: 0,
        sets: [
          { setNumber: 1, setType: "WARMUP", weight: 40, reps: 10, rir: 4 },
          { setNumber: 2, setType: "WORKING", weight: 60, reps: 10, rir: 3 },
          { setNumber: 3, setType: "WORKING", weight: 60, reps: 9, rir: 2 },
          { setNumber: 4, setType: "WORKING", weight: 60, reps: 8, rir: 2 },
        ],
      },
      {
        exerciseId: pullup.id,
        orderIndex: 1,
        sets: [
          { setNumber: 1, setType: "WORKING", weight: 0, reps: 8, rir: 3 },
          { setNumber: 2, setType: "WORKING", weight: 0, reps: 7, rir: 2 },
          { setNumber: 3, setType: "WORKING", weight: 0, reps: 6, rir: 1 },
        ],
      },
    ],
  });

  // Session 2 — 21 days ago
  dbCreateWorkout({
    title: "Lower Body A",
    durationMin: 50,
    performedAt: daysAgo(21),
    exercises: [
      {
        exerciseId: squat.id,
        orderIndex: 0,
        sets: [
          { setNumber: 1, setType: "WARMUP", weight: 60, reps: 5, rir: 5 },
          { setNumber: 2, setType: "WORKING", weight: 80, reps: 8, rir: 2 },
          { setNumber: 3, setType: "WORKING", weight: 80, reps: 7, rir: 2 },
          { setNumber: 4, setType: "WORKING", weight: 80, reps: 7, rir: 1 },
        ],
      },
      {
        exerciseId: plank.id,
        orderIndex: 1,
        sets: [
          { setNumber: 1, setType: "WORKING", weight: 0, reps: 1, durationSeconds: 45, rir: null },
          { setNumber: 2, setType: "WORKING", weight: 0, reps: 1, durationSeconds: 40, rir: null },
          { setNumber: 3, setType: "WORKING", weight: 0, reps: 1, durationSeconds: 35, rir: null },
        ],
      },
    ],
  });

  // Session 3 — 14 days ago (progressed bench and pull-up)
  dbCreateWorkout({
    title: "Push + Pull B",
    durationMin: 58,
    performedAt: daysAgo(14),
    exercises: [
      {
        exerciseId: bench.id,
        orderIndex: 0,
        sets: [
          { setNumber: 1, setType: "WARMUP", weight: 40, reps: 10, rir: 5 },
          { setNumber: 2, setType: "WORKING", weight: 62.5, reps: 10, rir: 3 },
          { setNumber: 3, setType: "WORKING", weight: 62.5, reps: 10, rir: 2 },
          { setNumber: 4, setType: "WORKING", weight: 62.5, reps: 9, rir: 2 },
        ],
      },
      {
        exerciseId: pullup.id,
        orderIndex: 1,
        sets: [
          { setNumber: 1, setType: "WORKING", weight: 0, reps: 10, rir: 3 },
          { setNumber: 2, setType: "WORKING", weight: 0, reps: 9, rir: 2 },
          { setNumber: 3, setType: "WORKING", weight: 0, reps: 8, rir: 2 },
        ],
      },
    ],
  });

  // Session 4 — 7 days ago (progression decisions)
  dbCreateWorkout({
    title: "Lower Body B",
    durationMin: 52,
    performedAt: daysAgo(7),
    exercises: [
      {
        exerciseId: squat.id,
        orderIndex: 0,
        sets: [
          { setNumber: 1, setType: "WARMUP", weight: 60, reps: 5, rir: 5 },
          { setNumber: 2, setType: "WORKING", weight: 85, reps: 7, rir: 2 },
          { setNumber: 3, setType: "WORKING", weight: 85, reps: 7, rir: 1 },
          { setNumber: 4, setType: "WORKING", weight: 85, reps: 6, rir: 1 },
        ],
      },
      {
        exerciseId: plank.id,
        orderIndex: 1,
        sets: [
          { setNumber: 1, setType: "WORKING", weight: 0, reps: 1, durationSeconds: 60, rir: null },
          { setNumber: 2, setType: "WORKING", weight: 0, reps: 1, durationSeconds: 55, rir: null },
          { setNumber: 3, setType: "WORKING", weight: 0, reps: 1, durationSeconds: 50, rir: null },
        ],
      },
    ],
  });
}

export function clearDemoData() {
  const state = readLocalAppState();
  const demoIds = new Set(state.exercises.filter((e) => e.notes === "__demo__").map((e) => e.id));
  writeLocalAppState({
    ...state,
    exercises: state.exercises.filter((e) => e.notes !== "__demo__"),
    // Only remove workouts that contain at least one demo exercise AND no real exercises
    workouts: state.workouts.filter(
      (w) => !w.workoutExercises.some((we) => demoIds.has(we.exerciseId)),
    ),
  });
}
