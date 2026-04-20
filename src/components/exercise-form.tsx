"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { dbCreateExercise } from "@/lib/db";
import {
  equipmentTypeValues,
  exerciseCategoryValues,
  measurementTypeLabels,
  measurementTypeValues,
  movementPatternValues,
} from "@/lib/validators/exercise";

type MeasurementType = (typeof measurementTypeValues)[number];

const initialState = {
  name: "",
  category: "CHEST" as const,
  movementPattern: "PUSH" as const,
  equipment: "BODYWEIGHT" as const,
  measurementType: "WEIGHT_REPS" as MeasurementType,
  primaryMuscle: "",
  secondaryMuscles: "",
  notes: "",
  incrementStep: 2.5,
  repTargetMin: 6,
  repTargetMax: 10,
  targetRirMin: 0,
  targetRirMax: 2,
  durationTargetSeconds: 30,
  distanceTargetKm: 5,
};

export function ExerciseForm({ onCreated }: { onCreated?: () => void }) {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateField<Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setStatus({ type: "error", message: "Exercise name is required." });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      category: form.category,
      movementPattern: form.movementPattern,
      equipment: form.equipment,
      measurementType: form.measurementType,
      primaryMuscle: form.primaryMuscle,
      secondaryMuscles: form.secondaryMuscles,
      notes: form.notes,
    };

    if (form.measurementType === "WEIGHT_REPS" || form.measurementType === "REPS_ONLY") {
      payload.incrementStep = form.measurementType === "WEIGHT_REPS" ? form.incrementStep : 1;
      payload.repTargetMin = form.repTargetMin;
      payload.repTargetMax = form.repTargetMax;
      payload.targetRirMin = form.measurementType === "WEIGHT_REPS" ? form.targetRirMin : undefined;
      payload.targetRirMax = form.measurementType === "WEIGHT_REPS" ? form.targetRirMax : undefined;
    } else if (form.measurementType === "TIME") {
      payload.incrementStep = 1;
      payload.repTargetMin = 1;
      payload.repTargetMax = 1;
      payload.durationTargetSeconds = form.durationTargetSeconds;
    } else if (form.measurementType === "DISTANCE_TIME") {
      payload.incrementStep = 1;
      payload.repTargetMin = 1;
      payload.repTargetMax = 1;
      payload.distanceTargetKm = form.distanceTargetKm;
    } else if (form.measurementType === "WEIGHT_TIME") {
      payload.incrementStep = form.incrementStep;
      payload.repTargetMin = 1;
      payload.repTargetMax = 1;
      payload.durationTargetSeconds = form.durationTargetSeconds;
    }

    try {
      const slug = form.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");

      dbCreateExercise({
        name: form.name,
        slug,
        category: form.category,
        movementPattern: form.movementPattern,
        equipment: form.equipment,
        measurementType: form.measurementType,
        primaryMuscle: form.primaryMuscle || null,
        secondaryMuscles: form.secondaryMuscles || null,
        notes: form.notes || null,
        incrementStep: (payload.incrementStep as number) ?? 1,
        repTargetMin: (payload.repTargetMin as number) ?? 1,
        repTargetMax: (payload.repTargetMax as number) ?? 1,
        targetRirMin: payload.targetRirMin != null ? (payload.targetRirMin as number) : null,
        targetRirMax: payload.targetRirMax != null ? (payload.targetRirMax as number) : null,
        durationTargetSeconds: payload.durationTargetSeconds != null ? (payload.durationTargetSeconds as number) : null,
        distanceTargetKm: payload.distanceTargetKm != null ? (payload.distanceTargetKm as number) : null,
      });

      setForm(initialState);
      setStatus({ type: "success", message: "Exercise created successfully." });
      onCreated?.();
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "Something went wrong.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const type = form.measurementType;
  const isWeightBased = type === "WEIGHT_REPS" || type === "WEIGHT_TIME";
  const isRepBased = type === "WEIGHT_REPS" || type === "REPS_ONLY";
  const isTimeBased = type === "TIME" || type === "WEIGHT_TIME";
  const isCardio = type === "DISTANCE_TIME";

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Measurement type selector — most important choice */}
      <div className="rounded-2xl border border-white/10 bg-[#111111] p-5">
        <p className="mb-3 text-sm font-medium text-white">How do you track this exercise?</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {measurementTypeValues.map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => updateField("measurementType", mt)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                form.measurementType === mt
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-100"
                  : "border-white/10 bg-white/4 text-[#ccc] hover:border-white/20 hover:text-white"
              }`}
            >
              <span className="block font-medium">{mt.replaceAll("_", " ")}</span>
              <span className="mt-0.5 block text-xs opacity-70">{measurementTypeLabels[mt]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm text-[#ccc] md:col-span-2">
          <span>Exercise name</span>
          <input
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-white outline-none placeholder:text-[#ccc]"
            placeholder="e.g. Push-Up, Dead Hang, 5km Run"
            maxLength={50}
            required
          />
        </label>

        <SelectField
          label="Category"
          value={form.category}
          options={exerciseCategoryValues}
          onChange={(v) => updateField("category", v as typeof form.category)}
        />
        <SelectField
          label="Movement"
          value={form.movementPattern}
          options={movementPatternValues}
          onChange={(v) => updateField("movementPattern", v as typeof form.movementPattern)}
        />
        <SelectField
          label="Equipment"
          value={form.equipment}
          options={equipmentTypeValues}
          onChange={(v) => updateField("equipment", v as typeof form.equipment)}
        />

        <label className="space-y-2 text-sm text-[#ccc]">
          <span>Primary muscle</span>
          <input
            value={form.primaryMuscle}
            onChange={(e) => updateField("primaryMuscle", e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none placeholder:text-[#ccc]"
            placeholder="e.g. Chest"
          />
        </label>

        <label className="space-y-2 text-sm text-[#ccc]">
          <span>Secondary muscles</span>
          <input
            value={form.secondaryMuscles}
            onChange={(e) => updateField("secondaryMuscles", e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none placeholder:text-[#ccc]"
            placeholder="e.g. Triceps, Shoulders"
          />
        </label>

        {/* Progression settings — conditional per type */}
        {isTimeBased && (
          <NumberField
            label="Duration target (seconds)"
            value={form.durationTargetSeconds}
            step={5}
            onChange={(v) => updateField("durationTargetSeconds", v)}
            hint="e.g. 30 for a 30-second dead hang"
          />
        )}

        {isCardio && (
          <NumberField
            label="Distance target (km)"
            value={form.distanceTargetKm}
            step={0.5}
            onChange={(v) => updateField("distanceTargetKm", v)}
            hint="e.g. 5 for a 5km run"
          />
        )}

        {isRepBased && (
          <>
            <NumberField
              label="Rep target min"
              value={form.repTargetMin}
              step={1}
              onChange={(v) => updateField("repTargetMin", v)}
            />
            <NumberField
              label="Rep target max"
              value={form.repTargetMax}
              step={1}
              onChange={(v) => updateField("repTargetMax", v)}
            />
          </>
        )}

        {isWeightBased && (
          <NumberField
            label="Increment step (kg)"
            value={form.incrementStep}
            step={0.25}
            onChange={(v) => updateField("incrementStep", v)}
          />
        )}

        {type === "WEIGHT_REPS" && (
          <>
            <NumberField
              label="Target RIR min"
              value={form.targetRirMin}
              step={0.5}
              onChange={(v) => updateField("targetRirMin", v)}
              hint="Reps In Reserve — how many reps left in the tank"
            />
            <NumberField
              label="Target RIR max"
              value={form.targetRirMax}
              step={0.5}
              onChange={(v) => updateField("targetRirMax", v)}
            />
          </>
        )}

        <label className="space-y-2 text-sm text-[#ccc] md:col-span-2">
          <span>Notes</span>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            className="min-h-20 w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none placeholder:text-[#ccc]"
            placeholder="Execution cues, setup notes, machine settings"
          />
        </label>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-[#bbb]">
          Custom exercises are available immediately in the workout logger.
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
        >
          {submitting ? "Creating..." : "Create exercise"}
        </button>
      </div>

      {status ? (
        <p className={status.type === "success" ? "text-sm text-emerald-300" : "text-sm text-rose-300"}>
          {status.message}
        </p>
      ) : null}
    </form>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  return (
    <div className="space-y-2 text-sm text-[#ccc]">
      <span>{label}</span>
      <div ref={ref} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-left text-sm text-white"
        >
          <span className="truncate">{value.replaceAll("_", " ")}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-[#999] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] py-1 shadow-xl">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => { onChange(option); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/5 ${
                  option === value ? "bg-white/8 text-white" : "text-[#ccc]"
                }`}
              >
                <span>{option.replaceAll("_", " ")}</span>
                {option === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  step,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="space-y-2 text-sm text-[#ccc]">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl border border-white/10 bg-[#0a0a0a] px-4 py-3 text-white outline-none"
      />
      {hint ? <span className="text-xs text-[#ccc]">{hint}</span> : null}
    </label>
  );
}
