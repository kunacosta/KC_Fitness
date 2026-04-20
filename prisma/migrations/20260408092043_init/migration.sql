-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "movementPattern" TEXT NOT NULL DEFAULT 'OTHER',
    "equipment" TEXT NOT NULL DEFAULT 'OTHER',
    "primaryMuscle" TEXT,
    "secondaryMuscles" TEXT,
    "notes" TEXT,
    "isCustom" BOOLEAN NOT NULL DEFAULT true,
    "incrementStep" DECIMAL NOT NULL DEFAULT 2.5,
    "repTargetMin" INTEGER NOT NULL DEFAULT 6,
    "repTargetMax" INTEGER NOT NULL DEFAULT 10,
    "targetRirMin" DECIMAL DEFAULT 0,
    "targetRirMax" DECIMAL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Exercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "performedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMin" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutSessionId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutExercise_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workoutExerciseId" TEXT NOT NULL,
    "setNumber" INTEGER NOT NULL,
    "setType" TEXT NOT NULL DEFAULT 'WORKING',
    "weight" DECIMAL NOT NULL,
    "reps" INTEGER NOT NULL,
    "rir" DECIMAL,
    "restSeconds" INTEGER,
    "tempo" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseSet_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProgressionSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "workoutSessionId" TEXT NOT NULL,
    "totalVolume" DECIMAL NOT NULL,
    "effectiveVolume" DECIMAL NOT NULL,
    "averageRir" DECIMAL,
    "bestSetWeight" DECIMAL,
    "bestSetReps" INTEGER,
    "estimated1RM" DECIMAL,
    "volumeDeltaPct" DECIMAL,
    "performanceScore" DECIMAL,
    "nextSuggestionType" TEXT NOT NULL,
    "nextSuggestedWeight" DECIMAL,
    "nextSuggestedRepMin" INTEGER,
    "nextSuggestedRepMax" INTEGER,
    "rationale" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProgressionSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressionSnapshot_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgressionSnapshot_workoutSessionId_fkey" FOREIGN KEY ("workoutSessionId") REFERENCES "WorkoutSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Exercise_userId_name_idx" ON "Exercise"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_userId_slug_key" ON "Exercise"("userId", "slug");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_performedAt_idx" ON "WorkoutSession"("userId", "performedAt");

-- CreateIndex
CREATE INDEX "WorkoutExercise_workoutSessionId_orderIndex_idx" ON "WorkoutExercise"("workoutSessionId", "orderIndex");

-- CreateIndex
CREATE INDEX "WorkoutExercise_exerciseId_idx" ON "WorkoutExercise"("exerciseId");

-- CreateIndex
CREATE INDEX "ExerciseSet_workoutExerciseId_idx" ON "ExerciseSet"("workoutExerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSet_workoutExerciseId_setNumber_key" ON "ExerciseSet"("workoutExerciseId", "setNumber");

-- CreateIndex
CREATE INDEX "ProgressionSnapshot_exerciseId_createdAt_idx" ON "ProgressionSnapshot"("exerciseId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressionSnapshot_userId_createdAt_idx" ON "ProgressionSnapshot"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressionSnapshot_workoutSessionId_idx" ON "ProgressionSnapshot"("workoutSessionId");
