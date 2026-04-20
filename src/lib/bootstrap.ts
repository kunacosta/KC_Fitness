import { Prisma } from "@/generated/prisma/client";
import { DEFAULT_EXERCISES, DEFAULT_USER_ID } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

export async function ensureLocalUser() {
  return prisma.user.upsert({
    where: { id: DEFAULT_USER_ID },
    update: {},
    create: {
      id: DEFAULT_USER_ID,
      name: "Shadow",
    },
  });
}

export async function ensureSeedExercises() {
  await ensureLocalUser();

  await Promise.all(
    DEFAULT_EXERCISES.map((exercise) =>
      prisma.exercise.upsert({
        where: {
          userId_slug: {
            userId: DEFAULT_USER_ID,
            slug: exercise.slug,
          },
        },
        update: {
          measurementType: exercise.measurementType as never,
          durationTargetSeconds: exercise.durationTargetSeconds ?? null,
          distanceTargetKm: exercise.distanceTargetKm
            ? new Prisma.Decimal(exercise.distanceTargetKm)
            : null,
        },
        create: {
          userId: DEFAULT_USER_ID,
          name: exercise.name,
          slug: exercise.slug,
          category: exercise.category as never,
          movementPattern: exercise.movementPattern as never,
          equipment: exercise.equipment as never,
          measurementType: exercise.measurementType as never,
          primaryMuscle: exercise.primaryMuscle,
          secondaryMuscles: exercise.secondaryMuscles,
          incrementStep: new Prisma.Decimal(exercise.incrementStep),
          repTargetMin: exercise.repTargetMin,
          repTargetMax: exercise.repTargetMax,
          targetRirMin: new Prisma.Decimal(exercise.targetRirMin),
          targetRirMax: new Prisma.Decimal(exercise.targetRirMax),
          durationTargetSeconds: exercise.durationTargetSeconds ?? null,
          distanceTargetKm: exercise.distanceTargetKm
            ? new Prisma.Decimal(exercise.distanceTargetKm)
            : null,
          isCustom: exercise.isCustom,
        },
      }),
    ),
  );
}
