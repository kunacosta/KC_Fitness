"use client";

import { useState } from "react";
import Link from "next/link";

import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/card";
import { ExerciseForm } from "@/components/exercise-form";
import { dbGetExercises } from "@/lib/db";
import { mapLocalExercisesToDto } from "@/lib/local-storage/mappers";
import type { ExerciseDto } from "@/types/api";

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<ExerciseDto[]>(() => mapLocalExercisesToDto(dbGetExercises()));

  function loadExercises() {
    setExercises(mapLocalExercisesToDto(dbGetExercises()));
  }

  return (
    <AppShell currentPath="/exercises" title="Library">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <p className="text-xs uppercase tracking-[0.24em] text-[#bbb]">
            New custom exercise
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Build your movement library
          </h2>
          <p className="mt-3 text-sm leading-7 text-[#bbb]">
            Every exercise stores its own progression settings, so KC Fitness can make better recommendations per movement.
          </p>

          <div className="mt-6">
            <ExerciseForm onCreated={loadExercises} />
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[#bbb]">
                Available exercises
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">
                {exercises.length} exercises ready to log
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {exercises.map((exercise) => (
              <article
                key={exercise.id}
                className="rounded-2xl border border-white/8 bg-[#161616] p-5 overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold text-white">
                      {exercise.name}
                    </h3>
                    <p className="mt-2 truncate text-xs uppercase tracking-[0.22em] text-[#ccc]">
                      {exercise.category.replaceAll("_", " ")} · {exercise.equipment.replaceAll("_", " ")}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-[#ccc]">
                    {exercise.isCustom ? "Custom" : "Default"}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  <Metric label="Rep target" value={`${exercise.repTargetMin}–${exercise.repTargetMax}`} />
                  <Metric label="Increment" value={`+${exercise.incrementStep} kg`} />
                  <Metric label="Type" value={exercise.measurementType.replaceAll("_", " ")} />
                </div>

                <p className="mt-5 text-sm leading-6 text-[#bbb]">
                  <span className="text-[#ccc]">Primary:</span> {exercise.primaryMuscle ?? "—"}
                  <br />
                  <span className="text-[#ccc]">Secondary:</span> {exercise.secondaryMuscles ?? "—"}
                </p>

                <Link
                  href={`/exercises/${exercise.id}`}
                  className="mt-5 inline-flex rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[#ccc] hover:border-white/20 hover:text-white"
                >
                  View analytics
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-6 rounded-[24px] border border-white/8 bg-[#161616] p-5 text-sm leading-7 text-[#bbb]">
            New exercises appear in the library and the workout logger immediately after creation.
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/5 px-2 py-3">
      <p className="truncate text-[10px] uppercase tracking-[0.14em] text-[#999]">{label}</p>
      <p className="mt-1.5 truncate text-xs font-semibold text-white">{value}</p>
    </div>
  );
}
