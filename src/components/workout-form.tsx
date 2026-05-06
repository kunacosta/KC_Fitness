"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { dbCreateWorkout, dbGetPrefill } from "@/lib/db";
import { mapLocalPrefillToDto } from "@/lib/local-storage/mappers";
import type { ExerciseDto, WorkoutPrefillDto } from "@/types/api";

interface WorkoutFormProps {
  exercises: ExerciseDto[];
  performedAt?: string;
  onSuccess?: () => void;
}

type MeasurementType = "WEIGHT_REPS" | "REPS_ONLY" | "TIME" | "DISTANCE_TIME" | "WEIGHT_TIME";

type WorkoutSet = {
  setNumber: number;
  setType: string;
  weight: number;
  reps: number;
  durationSeconds: number;
  distanceKm: number;
  rir: number;
};

type WorkoutBlock = {
  id: string;
  exerciseId: string;
  orderIndex: number;
  notes: string;
  seedBackoffSets: boolean;
  recommendationAppliedAt?: number;
  sets: WorkoutSet[];
};

function blockId() { return Math.random().toString(36).slice(2, 9); }

type PrefillState = Record<string, WorkoutPrefillDto | null>;

function createDefaultSet(measurementType: MeasurementType, setNumber: number, setType = "WORKING"): WorkoutSet {
  return {
    setNumber,
    setType,
    weight: 0,
    reps: measurementType === "REPS_ONLY" ? 10 : 0,
    durationSeconds: ["TIME", "DISTANCE_TIME", "WEIGHT_TIME"].includes(measurementType) ? 30 : 0,
    distanceKm: measurementType === "DISTANCE_TIME" ? 1 : 0,
    rir: 2,
  };
}

function createDefaultSets(measurementType: MeasurementType): WorkoutSet[] {
  if (measurementType === "WEIGHT_REPS") {
    return [
      { setNumber: 1, setType: "WORKING", weight: 0, reps: 8, durationSeconds: 0, distanceKm: 0, rir: 2 },
      { setNumber: 2, setType: "WORKING", weight: 0, reps: 8, durationSeconds: 0, distanceKm: 0, rir: 2 },
      { setNumber: 3, setType: "WORKING", weight: 0, reps: 8, durationSeconds: 0, distanceKm: 0, rir: 2 },
    ];
  }
  if (measurementType === "REPS_ONLY") {
    return [
      { setNumber: 1, setType: "WORKING", weight: 0, reps: 10, durationSeconds: 0, distanceKm: 0, rir: 2 },
      { setNumber: 2, setType: "WORKING", weight: 0, reps: 10, durationSeconds: 0, distanceKm: 0, rir: 2 },
      { setNumber: 3, setType: "WORKING", weight: 0, reps: 10, durationSeconds: 0, distanceKm: 0, rir: 2 },
    ];
  }
  if (measurementType === "TIME") {
    return [
      { setNumber: 1, setType: "WORKING", weight: 0, reps: 0, durationSeconds: 30, distanceKm: 0, rir: 0 },
      { setNumber: 2, setType: "WORKING", weight: 0, reps: 0, durationSeconds: 30, distanceKm: 0, rir: 0 },
      { setNumber: 3, setType: "WORKING", weight: 0, reps: 0, durationSeconds: 30, distanceKm: 0, rir: 0 },
    ];
  }
  if (measurementType === "DISTANCE_TIME") {
    return [
      { setNumber: 1, setType: "WORKING", weight: 0, reps: 0, durationSeconds: 1800, distanceKm: 5, rir: 0 },
    ];
  }
  // WEIGHT_TIME
  return [
    { setNumber: 1, setType: "WORKING", weight: 20, reps: 0, durationSeconds: 30, distanceKm: 0, rir: 0 },
    { setNumber: 2, setType: "WORKING", weight: 20, reps: 0, durationSeconds: 30, distanceKm: 0, rir: 0 },
  ];
}

function getMeasurementType(exercise?: ExerciseDto): MeasurementType {
  return (exercise?.measurementType as MeasurementType) ?? "WEIGHT_REPS";
}

function createDefaultBlock(exerciseId: string, orderIndex: number, exercise?: ExerciseDto): WorkoutBlock {
  const mt = getMeasurementType(exercise);
  return {
    id: blockId(),
    exerciseId,
    orderIndex,
    notes: "",
    seedBackoffSets: false,
    sets: createDefaultSets(mt),
  };
}

function mapPrefillSets(prefill: WorkoutPrefillDto): WorkoutSet[] {
  return prefill.lastSets.map((set) => ({
    setNumber: set.setNumber,
    setType: set.setType,
    weight: Number(set.weight),
    reps: set.reps,
    durationSeconds: set.durationSeconds ?? 0,
    distanceKm: set.distanceKm != null ? Number(set.distanceKm) : 0,
    rir: set.rir != null ? Number(set.rir) : 2,
  }));
}

function buildRecommendedSets(
  prefill: WorkoutPrefillDto,
  exercise?: ExerciseDto,
): WorkoutSet[] {
  const fallbackSets = mapPrefillSets(prefill);
  const snapshot = prefill.latestSnapshot;
  const mt = getMeasurementType(exercise);

  if (!snapshot) return fallbackSets;

  // TIME / WEIGHT_TIME: apply suggested duration
  if ((mt === "TIME" || mt === "WEIGHT_TIME") && snapshot.nextSuggestedDurationSeconds) {
    return fallbackSets.map((set) => ({
      ...set,
      durationSeconds: snapshot.nextSuggestedDurationSeconds!,
      weight: mt === "WEIGHT_TIME" && snapshot.nextSuggestedWeight
        ? Number(snapshot.nextSuggestedWeight)
        : set.weight,
    }));
  }

  // DISTANCE_TIME: apply suggested distance
  if (mt === "DISTANCE_TIME" && snapshot.nextSuggestedDistanceKm) {
    return fallbackSets.map((set) => ({
      ...set,
      distanceKm: Number(snapshot.nextSuggestedDistanceKm),
    }));
  }

  // REPS_ONLY: apply suggested rep range
  if (mt === "REPS_ONLY" && snapshot.nextSuggestedRepMin) {
    return fallbackSets.map((set) => ({
      ...set,
      reps: snapshot.nextSuggestedRepMin!,
    }));
  }

  // WEIGHT_REPS: existing logic
  if (!snapshot.nextSuggestedWeight || !exercise) return fallbackSets;

  const targetWeight = Number(snapshot.nextSuggestedWeight);
  const targetReps = snapshot.nextSuggestedRepMin ?? exercise.repTargetMin ?? fallbackSets[0]?.reps ?? 8;

  const topSetIndex = fallbackSets.reduce((bestIdx, set, idx, all) => {
    const best = all[bestIdx];
    if (!best) return idx;
    if (set.weight > best.weight) return idx;
    if (set.weight === best.weight && set.reps > best.reps) return idx;
    return bestIdx;
  }, 0);

  return fallbackSets.map((set, index) => {
    if (index === topSetIndex) {
      return { ...set, weight: targetWeight, reps: targetReps };
    }
    return set;
  });
}

function formatSuggestionLabel(type?: string | null, snapshot?: WorkoutPrefillDto["latestSnapshot"]) {
  if (!type) return "No suggestion yet";
  switch (type) {
    case "INCREASE_WEIGHT": return `↑ Weight → ${snapshot?.nextSuggestedWeight ?? "?"} kg`;
    case "INCREASE_REPS": return `↑ Reps → ${snapshot?.nextSuggestedRepMin ?? "?"}–${snapshot?.nextSuggestedRepMax ?? "?"} reps`;
    case "INCREASE_DURATION": return `↑ Duration → ${snapshot?.nextSuggestedDurationSeconds ?? "?"} s`;
    case "INCREASE_DISTANCE": return `↑ Distance → ${snapshot?.nextSuggestedDistanceKm ?? "?"} km`;
    case "IMPROVE_PACE": return "↑ Pace — same distance, faster";
    case "HOLD": return "Hold — maintain current target";
    case "DELOAD": return "↓ Deload — reduce load";
    default: return type.replaceAll("_", " ");
  }
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

const MT_LABEL: Record<string, string> = {
  WEIGHT_REPS: "Weight × Reps",
  REPS_ONLY: "Reps",
  TIME: "Time",
  DISTANCE_TIME: "Distance",
  WEIGHT_TIME: "Weight × Time",
};

function ExercisePicker({
  exercises,
  value,
  onChange,
}: {
  exercises: ExerciseDto[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = exercises.find((e) => e.id === value);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-left text-sm text-white"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{selected?.name ?? "Select exercise"}</span>
          {selected && (
            <span className="block text-[11px] text-[#ccc]">{MT_LABEL[selected.measurementType] ?? selected.measurementType}</span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#999] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] py-1 shadow-xl">
          {exercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              onClick={() => { onChange(ex.id); setOpen(false); }}
              className={`flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                ex.id === value ? "bg-white/8" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{ex.name}</span>
                <span className="block text-[11px] text-[#999]">{MT_LABEL[ex.measurementType] ?? ex.measurementType}</span>
              </span>
              {ex.id === value && <span className="ml-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkoutForm({ exercises, performedAt: performedAtProp, onSuccess }: WorkoutFormProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [title, setTitle] = useState("Training Session");
  const [durationMin, setDurationMin] = useState(60);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefills, setPrefills] = useState<PrefillState>({});

  const firstExercise = exercises[0];
  const [blocks, setBlocks] = useState<WorkoutBlock[]>([
    createDefaultBlock(firstExercise?.id ?? "", 0, firstExercise),
  ]);

  useEffect(() => {
    blocks.forEach((block) => {
      if (!block.exerciseId || prefills[block.exerciseId] !== undefined) return;
      const result = dbGetPrefill(block.exerciseId);
      setPrefills((c) => ({
        ...c,
        [block.exerciseId]: result ? mapLocalPrefillToDto(result) : null,
      }));
    });
  }, [blocks, prefills]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // C3: Validate at least one set has a meaningful value per block
    for (const block of blocks) {
      const ex = exercises.find((e) => e.id === block.exerciseId);
      const mt = getMeasurementType(ex);
      const hasValue = block.sets.some((s) => {
        if (mt === "WEIGHT_REPS") return s.reps > 0;
        if (mt === "REPS_ONLY") return s.reps > 0;
        if (mt === "TIME" || mt === "WEIGHT_TIME") return s.durationSeconds > 0;
        if (mt === "DISTANCE_TIME") return s.distanceKm > 0;
        return true;
      });
      if (!hasValue) {
        setStatus({ type: "error", message: `${ex?.name ?? "Exercise"}: enter at least one set with a value.` });
        return;
      }
    }

    setSubmitting(true);
    setStatus(null);

    try {
      dbCreateWorkout({
        title,
        notes,
        durationMin,
        performedAt: performedAtProp ?? new Date().toISOString(),
        exercises: blocks.map((block, index) => ({
          exerciseId: block.exerciseId,
          orderIndex: index,
          notes: block.notes || null,
          sets: block.sets.map((set) => ({
            setNumber: set.setNumber,
            setType: set.setType,
            weight: set.weight,
            reps: set.reps,
            durationSeconds: set.durationSeconds || null,
            distanceKm: set.distanceKm || null,
            rir: set.rir || null,
          })),
        })),
      });

      setStatus({ type: "success", message: "Workout logged." });
      if (onSuccess) {
        onSuccess();
      } else {
        startTransition(() => { router.push("/"); });
      }
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const recommendedBlockCount = blocks.filter((block) => {
    const prefill = block.exerciseId ? prefills[block.exerciseId] : null;
    if (!prefill?.latestSnapshot) return false;
    const mt = getMeasurementType(exercises.find((e) => e.id === block.exerciseId));
    const snap = prefill.latestSnapshot;
    return !!(
      (mt === "WEIGHT_REPS" && snap.nextSuggestedWeight) ||
      (mt === "REPS_ONLY" && snap.nextSuggestedRepMin) ||
      ((mt === "TIME" || mt === "WEIGHT_TIME") && snap.nextSuggestedDurationSeconds) ||
      (mt === "DISTANCE_TIME" && snap.nextSuggestedDistanceKm)
    );
  }).length;

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {/* Smart prefill banner */}
      {recommendedBlockCount > 0 && (
        <div className="flex flex-col gap-3 rounded-[24px] border border-emerald-400/20 bg-emerald-400/8 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-100">Smart prefill available</p>
            <p className="mt-1 text-sm text-emerald-100/70">
              Apply the latest recommended targets across {recommendedBlockCount} exercise block{recommendedBlockCount !== 1 ? "s" : ""}.
            </p>
          </div>
          <button
            type="button"
            onClick={applyAllRecommendations}
            className="shrink-0 rounded-2xl bg-emerald-300 px-4 py-3 text-sm font-medium text-emerald-950 hover:bg-emerald-200"
          >
            Apply all ({recommendedBlockCount})
          </button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[#ccc]">
          <span>Workout title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-white"
          />
        </label>
        <label className="space-y-2 text-sm text-[#ccc]">
          <span>Duration (min)</span>
          <input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-white"
          />
        </label>
      </div>

      <div className="space-y-4">
        {blocks.map((block, blockIndex) => {
          const selectedExercise = exercises.find((e) => e.id === block.exerciseId);
          const mt = getMeasurementType(selectedExercise);
          const prefill = block.exerciseId ? prefills[block.exerciseId] : null;
          const previousSets = prefill ? mapPrefillSets(prefill) : [];

          return (
            <div
              key={block.id}
              className="rounded-[24px] border border-white/8 bg-[#161616] p-4"
            >
              <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-start">
                <div className="flex-1 space-y-3">
                  <div className="space-y-2 text-sm text-[#ccc]">
                    <span>Exercise</span>
                    <ExercisePicker
                      exercises={exercises}
                      value={block.exerciseId}
                      onChange={(id) => {
                        const newExercise = exercises.find((ex) => ex.id === id);
                        updateBlock(blockIndex, {
                          exerciseId: id,
                          sets: createDefaultSets(getMeasurementType(newExercise)),
                          seedBackoffSets: false,
                        });
                      }}
                    />
                  </div>

                  {selectedExercise && (
                    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-xs text-[#bbb]">
                      {mt === "WEIGHT_REPS" && (
                        <>Target: {selectedExercise.repTargetMin}–{selectedExercise.repTargetMax} reps · +{selectedExercise.incrementStep} kg/step</>
                      )}
                      {mt === "REPS_ONLY" && (
                        <>Target: {selectedExercise.repTargetMin}–{selectedExercise.repTargetMax} reps</>
                      )}
                      {(mt === "TIME" || mt === "WEIGHT_TIME") && (
                        <>Target: {formatDuration(selectedExercise.durationTargetSeconds ?? 30)}</>
                      )}
                      {mt === "DISTANCE_TIME" && (
                        <>Target: {selectedExercise.distanceTargetKm} km</>
                      )}
                    </div>
                  )}

                  <label className="space-y-2 text-sm text-[#ccc]">
                    <span>Block notes</span>
                    <input
                      value={block.notes}
                      onChange={(e) => updateBlock(blockIndex, { notes: e.target.value })}
                      className="w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white text-sm"
                      placeholder="Execution cues, machine settings..."
                    />
                  </label>
                </div>

                {/* Previous session + suggestion sidebar */}
                <div className="md:w-64 shrink-0">
                  <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/8 p-4 text-sm">
                    <p className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                      Last session
                    </p>
                    {prefill ? (
                      <>
                        <p className="mt-2 text-xs text-emerald-100/70">
                          {prefill.lastPerformedAt
                            ? new Date(prefill.lastPerformedAt).toLocaleDateString("en-MY", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "No date"}
                        </p>
                        <div className="mt-3 rounded-xl border border-emerald-300/15 bg-emerald-200/8 px-3 py-2">
                          <p className="text-xs font-medium text-emerald-100">
                            {formatSuggestionLabel(prefill.latestSnapshot?.nextSuggestionType, prefill.latestSnapshot)}
                          </p>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-emerald-100/65">
                          {prefill.latestSnapshot?.rationale ?? "Log this exercise to get your first suggestion."}
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateBlock(blockIndex, {
                                sets: buildRecommendedSets(prefill, selectedExercise),
                                recommendationAppliedAt: Date.now(),
                              })
                            }
                            className="rounded-xl bg-emerald-300 px-3 py-2 text-xs font-medium text-emerald-950 hover:bg-emerald-200"
                          >
                            Apply recommendation
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateBlock(blockIndex, {
                                sets: mapPrefillSets(prefill),
                                recommendationAppliedAt: undefined,
                              })
                            }
                            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-[#ccc] hover:border-white/20"
                          >
                            Copy previous sets
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="mt-3 text-xs text-emerald-100/60">
                        First time logging this exercise. Set a baseline today.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Set rows — type-aware */}
              <div className="space-y-2">
                <SetRowHeader mt={mt} />
                {block.sets.map((set, setIndex) => {
                  const prevSet = previousSets[setIndex];
                  const changed = !!block.recommendationAppliedAt && isSetChanged(set, prevSet, mt);

                  return (
                    <SetRow
                      key={set.setNumber}
                      set={set}
                      mt={mt}
                      highlighted={changed}
                      onChange={(key, value) => updateSet(blockIndex, setIndex, key, value)}
                      onRemove={() => removeSet(blockIndex, setIndex)}
                    />
                  );
                })}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => addSet(blockIndex, mt)}
                  className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-[#ccc] hover:border-white/20 hover:text-white"
                >
                  + Add set
                </button>
                <button
                  type="button"
                  onClick={() => removeBlock(blockIndex)}
                  disabled={blocks.length === 1}
                  className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm text-[#bbb] hover:border-white/20 hover:text-white disabled:opacity-40"
                >
                  Remove block
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          const newExercise = exercises[0];
          setBlocks((c) => [...c, createDefaultBlock(newExercise?.id ?? "", c.length, newExercise)]);
        }}
        className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-[#ccc] hover:border-white/20 hover:text-white"
      >
        + Add another exercise
      </button>

      <label className="space-y-2 text-sm text-[#ccc]">
        <span>Session notes</span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-24 w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-white"
          placeholder="How did the session feel? Any notes on form, fatigue, sleep..."
        />
      </label>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#bbb]">
          Each exercise generates a progression snapshot on save.
        </p>
        <button
          type="submit"
          disabled={submitting || isRefreshing || blocks.some((b) => !b.exerciseId)}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {submitting ? "Logging..." : isRefreshing ? "Refreshing..." : "Log workout"}
        </button>
      </div>

      {status ? (
        <p className={status.type === "success" ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
          {status.message}
        </p>
      ) : null}
    </form>
  );

  // ── helpers ──────────────────────────────────────────────────────────────

  function updateBlock(index: number, patch: Partial<WorkoutBlock>) {
    setBlocks((c) => c.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function applyAllRecommendations() {
    setBlocks((c) =>
      c.map((block) => {
        const prefill = block.exerciseId ? prefills[block.exerciseId] : null;
        const exercise = exercises.find((e) => e.id === block.exerciseId);
        if (!prefill?.latestSnapshot || !exercise) return block;
        return {
          ...block,
          sets: buildRecommendedSets(prefill, exercise),
          recommendationAppliedAt: Date.now(),
        };
      }),
    );
  }

  function updateSet(blockIndex: number, setIndex: number, key: keyof WorkoutSet, value: string | number) {
    setBlocks((c) =>
      c.map((block, bIdx) => {
        if (bIdx !== blockIndex) return block;
        return {
          ...block,
          sets: block.sets.map((set, sIdx) =>
            sIdx === setIndex ? { ...set, [key]: value } : set,
          ),
        };
      }),
    );
  }

  function addSet(blockIndex: number, mt: MeasurementType) {
    setBlocks((c) =>
      c.map((block, bIdx) => {
        if (bIdx !== blockIndex) return block;
        const last = block.sets[block.sets.length - 1];
        return {
          ...block,
          sets: [
            ...block.sets,
            {
              ...createDefaultSet(mt, block.sets.length + 1),
              weight: last?.weight ?? 0,
              reps: last?.reps ?? 0,
              durationSeconds: last?.durationSeconds ?? 0,
              distanceKm: last?.distanceKm ?? 0,
            },
          ],
        };
      }),
    );
  }

  function removeSet(blockIndex: number, setIndex: number) {
    setBlocks((c) =>
      c.map((block, bIdx) => {
        if (bIdx !== blockIndex) return block;
        return {
          ...block,
          sets: block.sets
            .filter((_, sIdx) => sIdx !== setIndex)
            .map((set, sIdx) => ({ ...set, setNumber: sIdx + 1 })),
        };
      }),
    );
  }

  function removeBlock(blockIndex: number) {
    setBlocks((c) =>
      c.filter((_, i) => i !== blockIndex).map((b, i) => ({ ...b, orderIndex: i })),
    );
  }
}

// ── Set display components ────────────────────────────────────────────────────

function isSetChanged(current: WorkoutSet, previous: WorkoutSet | undefined, mt: MeasurementType) {
  if (!previous) return false;
  if (mt === "WEIGHT_REPS") return current.weight !== previous.weight || current.reps !== previous.reps;
  if (mt === "REPS_ONLY") return current.reps !== previous.reps;
  if (mt === "TIME") return current.durationSeconds !== previous.durationSeconds;
  if (mt === "DISTANCE_TIME") return current.distanceKm !== previous.distanceKm || current.durationSeconds !== previous.durationSeconds;
  if (mt === "WEIGHT_TIME") return current.weight !== previous.weight || current.durationSeconds !== previous.durationSeconds;
  return false;
}

function SetRowHeader({ mt }: { mt: MeasurementType }) {
  const cols = getColumns(mt);
  const labels: string[] = [];
  if (cols.showWeight) labels.push("kg");
  if (cols.showReps) labels.push("Reps");
  if (cols.showDuration) labels.push("Secs");
  if (cols.showDistance) labels.push("km");

  return (
    <div className="flex items-center gap-2 px-3">
      <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
        {labels.map((label) => (
          <span key={label} className="text-[10px] uppercase tracking-[0.16em] text-[#555]">
            {label}
          </span>
        ))}
      </div>
      <div className="w-[52px] shrink-0" />
    </div>
  );
}

function getColumns(mt: MeasurementType) {
  return {
    showWeight: mt === "WEIGHT_REPS" || mt === "WEIGHT_TIME",
    showReps: mt === "WEIGHT_REPS" || mt === "REPS_ONLY",
    showDuration: mt === "TIME" || mt === "DISTANCE_TIME" || mt === "WEIGHT_TIME",
    showDistance: mt === "DISTANCE_TIME",
  };
}

function NumericField({
  label,
  value,
  step,
  min,
  max,
  placeholder,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  placeholder?: string;
  onChange: (v: number) => void;
}) {
  const [display, setDisplay] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);
  const [prevExternal, setPrevExternal] = useState(value);

  // When external value changes while not focused, sync display (React-recommended derived state pattern)
  if (value !== prevExternal) {
    setPrevExternal(value);
    if (!isFocused) setDisplay(String(value));
  }

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-[0.16em] text-[#999]">{label}</span>
      <input
        inputMode="decimal"
        value={display}
        step={step}
        min={min}
        max={max}
        placeholder={placeholder}
        onFocus={(e) => {
          setIsFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setIsFocused(false);
          const num = parseFloat(display);
          const safe = isNaN(num) ? (min ?? 0) : num;
          setDisplay(String(safe));
          onChange(safe);
        }}
        onChange={(e) => {
          const raw = e.target.value;
          setDisplay(raw);
          const num = parseFloat(raw);
          if (!isNaN(num)) onChange(num);
        }}
        className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white"
      />
    </label>
  );
}

function SetRow({
  set,
  mt,
  highlighted,
  onChange,
  onRemove,
}: {
  set: WorkoutSet;
  mt: MeasurementType;
  highlighted: boolean;
  onChange: (key: keyof WorkoutSet, value: string | number) => void;
  onRemove: () => void;
}) {
  const cols = getColumns(mt);

  return (
    <div
      className={`rounded-2xl border p-3 space-y-2 ${
        highlighted ? "border-emerald-300/30 bg-emerald-300/8" : "border-white/8 bg-white/4"
      }`}
    >
      {/* Numeric inputs + remove button */}
      <div className="flex items-end gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3">
          {cols.showWeight && (
            <NumericField label="kg" value={set.weight} step={0.5} min={0} onChange={(v) => onChange("weight", v)} />
          )}
          {cols.showReps && (
            <NumericField label="Reps" value={set.reps} step={1} min={0} onChange={(v) => onChange("reps", v)} />
          )}
          {cols.showDuration && (
            <NumericField label="Secs" value={set.durationSeconds} step={5} min={0} onChange={(v) => onChange("durationSeconds", v)} />
          )}
          {cols.showDistance && (
            <NumericField label="km" value={set.distanceKm} step={0.1} min={0} onChange={(v) => onChange("distanceKm", v)} />
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove set"
          className="mb-0.5 shrink-0 rounded-xl border border-white/10 px-3 py-2.5 text-xs text-[#bbb] hover:border-white/20 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
