export type MeasurementType =
  | "WEIGHT_REPS"
  | "REPS_ONLY"
  | "TIME"
  | "DISTANCE_TIME"
  | "WEIGHT_TIME";

export type SuggestionType =
  | "INCREASE_WEIGHT"
  | "INCREASE_REPS"
  | "INCREASE_DURATION"
  | "INCREASE_DISTANCE"
  | "IMPROVE_PACE"
  | "HOLD"
  | "DELOAD";

export interface LoggedSet {
  weight: number;
  reps: number;
  durationSeconds?: number | null;
  distanceKm?: number | null;
  rir?: number | null;
  completed?: boolean;
}

export interface ExerciseProfile {
  name: string;
  measurementType: MeasurementType;
  // WEIGHT_REPS / WEIGHT_TIME / REPS_ONLY
  incrementStep: number;
  repTargetMin: number;
  repTargetMax: number;
  targetRirMin?: number;
  targetRirMax?: number;
  // TIME / WEIGHT_TIME
  durationTargetSeconds?: number | null;
  // DISTANCE_TIME
  distanceTargetKm?: number | null;
}

export interface PreviousSession {
  totalVolume: number;
  effectiveVolume: number;
  averageRir?: number | null;
  topWeight: number;
  topReps: number;
  bestDurationSeconds?: number | null;
  totalDurationSeconds?: number | null;
  bestDistanceKm?: number | null;
  totalDistanceKm?: number | null;
  bestPaceMinPerKm?: number | null;
}

export interface SessionPerformanceInput {
  sets: LoggedSet[];
  previousSessions?: PreviousSession[];
  profile: ExerciseProfile;
}

export interface OverloadComputation {
  // WEIGHT_REPS / REPS_ONLY
  totalVolume: number;
  effectiveVolume: number;
  averageRir: number | null;
  topWeight: number;
  topReps: number;
  estimated1RM: number | null;
  // TIME / WEIGHT_TIME
  bestDurationSeconds: number | null;
  totalDurationSeconds: number | null;
  // DISTANCE_TIME
  bestDistanceKm: number | null;
  totalDistanceKm: number | null;
  bestPaceMinPerKm: number | null;
  // Cross-type
  volumeDeltaPct: number | null;
  performanceScore: number;
  // Suggestion
  suggestionType: SuggestionType;
  nextWeight: number;
  nextRepMin: number;
  nextRepMax: number;
  nextSuggestedDurationSeconds: number | null;
  nextSuggestedDistanceKm: number | null;
  rationale: string;
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function roundToNearest5(seconds: number) {
  return Math.round(seconds / 5) * 5;
}

// ─── WEIGHT_REPS ────────────────────────────────────────────────────────────

function estimateRir(reps: number, repTargetMax: number): number {
  return Math.max(0, repTargetMax - reps);
}

function computeWeightReps(
  sets: LoggedSet[],
  prev: PreviousSession | undefined,
  profile: ExerciseProfile,
): OverloadComputation {
  const working = sets.filter((s) => s.completed !== false && s.reps > 0 && s.weight >= 0);
  if (!working.length) throw new Error("At least one completed set is required.");

  const totalVolume = round2(working.reduce((sum, s) => sum + s.weight * s.reps, 0));
  const effectiveVolume = round2(
    working.reduce((sum, s) => {
      const rir = s.rir ?? estimateRir(s.reps, profile.repTargetMax);
      return sum + s.weight * s.reps * Math.max(0.55, 1 - rir * 0.08);
    }, 0),
  );

  const rirValues = working.map((s) =>
    s.rir ?? estimateRir(s.reps, profile.repTargetMax)
  );
  const averageRir = average(rirValues);

  const bestSet = [...working].sort((a, b) =>
    b.weight !== a.weight ? b.weight - a.weight : b.reps - a.reps,
  )[0]!;
  const topWeight = bestSet.weight;
  const topReps = bestSet.reps;
  const estimated1RM = round2(topWeight * (1 + topReps / 30));

  const volumeDeltaPct =
    prev && prev.totalVolume > 0
      ? round2(((totalVolume - prev.totalVolume) / prev.totalVolume) * 100)
      : null;

  const targetRirMax = profile.targetRirMax ?? 2;
  const targetRirMin = profile.targetRirMin ?? 0;
  const hitTopRepRange = working.some(
    (s) => s.reps >= profile.repTargetMax && (s.rir ?? targetRirMax) <= targetRirMax,
  );
  const underRecovered =
    averageRir !== null && averageRir < targetRirMin - 0.5 && (volumeDeltaPct ?? 0) < -8;
  const hadStrongSession =
    (volumeDeltaPct === null || volumeDeltaPct >= 2.5) &&
    averageRir !== null &&
    averageRir <= targetRirMax;
  const canAddReps = working.every((s) => s.reps < profile.repTargetMax);

  let suggestionType: SuggestionType = "HOLD";
  let nextWeight = topWeight;
  let nextRepMin = profile.repTargetMin;
  let nextRepMax = profile.repTargetMax;
  let rationale = "Maintain current loading and tighten execution next session.";

  if (underRecovered) {
    suggestionType = "DELOAD";
    nextWeight = Math.max(0, topWeight - profile.incrementStep);
    nextRepMin = profile.repTargetMin;
    nextRepMax = Math.max(profile.repTargetMin, profile.repTargetMax - 1);
    rationale = "Performance and RIR indicate fatigue. Reduce load slightly and rebuild quality volume.";
  } else if (hitTopRepRange && hadStrongSession) {
    suggestionType = "INCREASE_WEIGHT";
    nextWeight = topWeight + profile.incrementStep;
    nextRepMin = profile.repTargetMin;
    nextRepMax = Math.max(profile.repTargetMin + 1, profile.repTargetMax - 1);
    rationale = "You hit the top of the target range close to failure. Add load next session and work back through the range.";
  } else if (canAddReps && (averageRir === null || averageRir <= targetRirMax + 1)) {
    suggestionType = "INCREASE_REPS";
    nextWeight = topWeight;
    nextRepMin = Math.min(profile.repTargetMax, profile.repTargetMin + 1);
    nextRepMax = profile.repTargetMax;
    rationale = "Load is appropriate, but there is room to progress through reps before increasing weight.";
  }

  const performanceScore = round2(
    estimated1RM * 0.45 + effectiveVolume * 0.01 + (5 - (averageRir ?? 2)) * 6,
  );

  return {
    totalVolume,
    effectiveVolume,
    averageRir: averageRir === null ? null : round2(averageRir),
    topWeight: round2(topWeight),
    topReps,
    estimated1RM,
    bestDurationSeconds: null,
    totalDurationSeconds: null,
    bestDistanceKm: null,
    totalDistanceKm: null,
    bestPaceMinPerKm: null,
    volumeDeltaPct,
    performanceScore,
    suggestionType,
    nextWeight: round2(nextWeight),
    nextRepMin,
    nextRepMax,
    nextSuggestedDurationSeconds: null,
    nextSuggestedDistanceKm: null,
    rationale,
  };
}

// ─── REPS_ONLY ───────────────────────────────────────────────────────────────

function computeRepsOnly(
  sets: LoggedSet[],
  prev: PreviousSession | undefined,
  profile: ExerciseProfile,
): OverloadComputation {
  const working = sets.filter((s) => s.completed !== false && s.reps > 0);
  if (!working.length) throw new Error("At least one completed set is required.");

  const totalReps = working.reduce((sum, s) => sum + s.reps, 0);
  const bestReps = Math.max(...working.map((s) => s.reps));
  // Use total reps as the "volume" proxy for consistency
  const totalVolume = totalReps;
  const effectiveVolume = totalReps;

  const rirValues = working.map((s) => s.rir ?? estimateRir(s.reps, profile.repTargetMax));
  const averageRir = average(rirValues);

  const prevTotalReps = prev?.totalVolume ?? 0;
  const volumeDeltaPct =
    prevTotalReps > 0 ? round2(((totalReps - prevTotalReps) / prevTotalReps) * 100) : null;

  const hitTopRepRange = working.some((s) => s.reps >= profile.repTargetMax);
  const belowMinRepRange = working.every((s) => s.reps < profile.repTargetMin);
  const canAddReps = working.every((s) => s.reps < profile.repTargetMax);

  let suggestionType: SuggestionType = "HOLD";
  let nextRepMin = profile.repTargetMin;
  let nextRepMax = profile.repTargetMax;
  let rationale = "Maintain current rep target. Focus on quality and consistency.";

  if (belowMinRepRange && (volumeDeltaPct ?? 0) < -10) {
    suggestionType = "DELOAD";
    nextRepMin = Math.max(1, profile.repTargetMin - 2);
    nextRepMax = Math.max(2, profile.repTargetMax - 2);
    rationale = "Rep output has dropped significantly. Reduce target temporarily to rebuild consistency.";
  } else if (hitTopRepRange && (volumeDeltaPct === null || volumeDeltaPct >= 0)) {
    suggestionType = "INCREASE_REPS";
    nextRepMin = profile.repTargetMin + 2;
    nextRepMax = profile.repTargetMax + 2;
    rationale = `You completed ${bestReps} reps — top of your target range. Increase the rep target next session.`;
  } else if (canAddReps) {
    suggestionType = "INCREASE_REPS";
    nextRepMin = Math.min(profile.repTargetMax, profile.repTargetMin + 1);
    nextRepMax = profile.repTargetMax;
    rationale = "Good effort. Push for one more rep per set next session to keep progression moving.";
  }

  const performanceScore = round2(
    (bestReps / profile.repTargetMax) * 50 + totalReps * 0.5 + (5 - (averageRir ?? 2)) * 5,
  );

  return {
    totalVolume,
    effectiveVolume,
    averageRir: averageRir === null ? null : round2(averageRir),
    topWeight: 0,
    topReps: bestReps,
    estimated1RM: null,
    bestDurationSeconds: null,
    totalDurationSeconds: null,
    bestDistanceKm: null,
    totalDistanceKm: null,
    bestPaceMinPerKm: null,
    volumeDeltaPct,
    performanceScore,
    suggestionType,
    nextWeight: 0,
    nextRepMin,
    nextRepMax,
    nextSuggestedDurationSeconds: null,
    nextSuggestedDistanceKm: null,
    rationale,
  };
}

// ─── TIME ────────────────────────────────────────────────────────────────────

function computeTime(
  sets: LoggedSet[],
  prev: PreviousSession | undefined,
  profile: ExerciseProfile,
): OverloadComputation {
  const working = sets.filter((s) => s.completed !== false && (s.durationSeconds ?? 0) > 0);
  if (!working.length) throw new Error("At least one completed set with duration is required.");

  const durations = working.map((s) => s.durationSeconds!);
  const totalDurationSeconds = durations.reduce((sum, d) => sum + d, 0);
  const bestDurationSeconds = Math.max(...durations);
  const targetSeconds = profile.durationTargetSeconds ?? 30;

  const completionPct = bestDurationSeconds / targetSeconds;

  const prevTotal = prev?.totalDurationSeconds ?? 0;
  const volumeDeltaPct =
    prevTotal > 0 ? round2(((totalDurationSeconds - prevTotal) / prevTotal) * 100) : null;

  let suggestionType: SuggestionType = "HOLD";
  let nextDuration = targetSeconds;
  let rationale = "Maintain current hold duration. Focus on quality and breathing.";

  if (completionPct < 0.70) {
    suggestionType = "DELOAD";
    nextDuration = roundToNearest5(Math.max(5, targetSeconds * 0.85));
    rationale = `You held ${bestDurationSeconds}s — well below the ${targetSeconds}s target. Reduce target and rebuild progressively.`;
  } else if (completionPct >= 0.95) {
    suggestionType = "INCREASE_DURATION";
    // Short holds (<30s): +5s; medium (30-90s): +10s; long (>90s): +15s or 10%
    const increment =
      targetSeconds < 30 ? 5 : targetSeconds <= 90 ? 10 : Math.min(15, Math.round(targetSeconds * 0.10));
    nextDuration = roundToNearest5(targetSeconds + increment);
    rationale = `You hit ${bestDurationSeconds}s — at or above the ${targetSeconds}s target. Increase hold time next session.`;
  } else {
    rationale = `You held ${bestDurationSeconds}s out of a ${targetSeconds}s target. Keep building consistency before increasing.`;
  }

  const performanceScore = round2(completionPct * 60 + (volumeDeltaPct ?? 0) * 0.5);

  return {
    totalVolume: totalDurationSeconds,
    effectiveVolume: totalDurationSeconds,
    averageRir: null,
    topWeight: 0,
    topReps: 0,
    estimated1RM: null,
    bestDurationSeconds,
    totalDurationSeconds,
    bestDistanceKm: null,
    totalDistanceKm: null,
    bestPaceMinPerKm: null,
    volumeDeltaPct,
    performanceScore,
    suggestionType,
    nextWeight: 0,
    nextRepMin: 0,
    nextRepMax: 0,
    nextSuggestedDurationSeconds: nextDuration,
    nextSuggestedDistanceKm: null,
    rationale,
  };
}

// ─── DISTANCE_TIME ───────────────────────────────────────────────────────────

function computeDistanceTime(
  sets: LoggedSet[],
  prev: PreviousSession | undefined,
  profile: ExerciseProfile,
): OverloadComputation {
  const working = sets.filter(
    (s) => s.completed !== false && (s.distanceKm ?? 0) > 0 && (s.durationSeconds ?? 0) > 0,
  );
  if (!working.length) throw new Error("At least one completed set with distance and duration is required.");

  const totalDistanceKm = round2(working.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0));
  const totalDurationSeconds = working.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const avgPaceMinPerKm = round2(totalDurationSeconds / 60 / totalDistanceKm);

  const bestSet = [...working].sort((a, b) => {
    const paceA = (a.durationSeconds ?? 0) / 60 / (a.distanceKm ?? 1);
    const paceB = (b.durationSeconds ?? 0) / 60 / (b.distanceKm ?? 1);
    return paceA - paceB; // lower pace = faster
  })[0]!;
  const bestDistanceKm = round2(bestSet.distanceKm ?? 0);
  const bestPaceMinPerKm = round2((bestSet.durationSeconds ?? 0) / 60 / (bestSet.distanceKm ?? 1));

  const targetDistanceKm = profile.distanceTargetKm ?? 5;
  const prevPace = prev?.bestPaceMinPerKm ?? null;
  const prevDistance = prev?.totalDistanceKm ?? 0;

  const paceImprovementPct =
    prevPace && prevPace > 0 ? ((prevPace - avgPaceMinPerKm) / prevPace) * 100 : null;

  const volumeDeltaPct =
    prevDistance > 0 ? round2(((totalDistanceKm - prevDistance) / prevDistance) * 100) : null;

  const targetReached = totalDistanceKm >= Number(targetDistanceKm);
  const paceImproved = paceImprovementPct !== null && paceImprovementPct >= 3;
  const significantlySlower = paceImprovementPct !== null && paceImprovementPct < -10;

  let suggestionType: SuggestionType = "HOLD";
  let nextDistanceKm = Number(targetDistanceKm);
  let rationale = `You ran ${totalDistanceKm} km at ${avgPaceMinPerKm.toFixed(2)} min/km. Maintain this distance and aim for consistency.`;

  if (significantlySlower && (volumeDeltaPct ?? 0) < -5) {
    suggestionType = "DELOAD";
    nextDistanceKm = round2(Number(targetDistanceKm) * 0.85);
    rationale = `Pace is ${Math.abs(paceImprovementPct ?? 0).toFixed(0)}% slower than your baseline. Consider an easy recovery run at reduced distance.`;
  } else if (targetReached && (volumeDeltaPct === null || volumeDeltaPct >= 0)) {
    suggestionType = "INCREASE_DISTANCE";
    // Max 10% increase (the 10% rule)
    const increment = Math.min(
      Number(targetDistanceKm) <= 5 ? 0.5 : 1,
      Number(targetDistanceKm) * 0.10,
    );
    nextDistanceKm = round2(Number(targetDistanceKm) + increment);
    rationale = `You completed ${totalDistanceKm} km — at your distance target. Increase to ${nextDistanceKm} km next session.`;
  } else if (paceImproved) {
    suggestionType = "IMPROVE_PACE";
    nextDistanceKm = Number(targetDistanceKm);
    rationale = `Pace improved by ${paceImprovementPct?.toFixed(1)}%. Maintain ${targetDistanceKm} km and keep pushing your pace.`;
  }

  const performanceScore = round2(
    (targetReached ? 40 : (totalDistanceKm / Number(targetDistanceKm)) * 40) +
    (paceImprovementPct ?? 0) * 2,
  );

  return {
    totalVolume: round2(totalDistanceKm * 1000), // meters for volume-like display
    effectiveVolume: round2(totalDistanceKm * 1000),
    averageRir: null,
    topWeight: 0,
    topReps: 0,
    estimated1RM: null,
    bestDurationSeconds: totalDurationSeconds,
    totalDurationSeconds,
    bestDistanceKm,
    totalDistanceKm,
    bestPaceMinPerKm,
    volumeDeltaPct,
    performanceScore,
    suggestionType,
    nextWeight: 0,
    nextRepMin: 0,
    nextRepMax: 0,
    nextSuggestedDurationSeconds: null,
    nextSuggestedDistanceKm: nextDistanceKm,
    rationale,
  };
}

// ─── WEIGHT_TIME ─────────────────────────────────────────────────────────────

function computeWeightTime(
  sets: LoggedSet[],
  prev: PreviousSession | undefined,
  profile: ExerciseProfile,
): OverloadComputation {
  const working = sets.filter(
    (s) => s.completed !== false && s.weight >= 0 && (s.durationSeconds ?? 0) > 0,
  );
  if (!working.length) throw new Error("At least one completed set with weight and duration is required.");

  const totalDurationSeconds = working.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
  const bestDurationSeconds = Math.max(...working.map((s) => s.durationSeconds!));
  const bestSet = [...working].sort((a, b) =>
    b.weight !== a.weight ? b.weight - a.weight : (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0),
  )[0]!;
  const topWeight = bestSet.weight;
  const targetSeconds = profile.durationTargetSeconds ?? 30;
  const completionPct = bestDurationSeconds / targetSeconds;

  // Volume proxy: weight × duration (like weight × reps for WEIGHT_REPS)
  const totalVolume = round2(working.reduce((sum, s) => sum + s.weight * (s.durationSeconds ?? 0), 0));
  const prevTotal = prev?.totalVolume ?? 0;
  const volumeDeltaPct =
    prevTotal > 0 ? round2(((totalVolume - prevTotal) / prevTotal) * 100) : null;

  let suggestionType: SuggestionType = "HOLD";
  let nextWeight = topWeight;
  let nextDuration = targetSeconds;
  let rationale = "Maintain current weight and hold duration. Consistency builds strength.";

  if (completionPct < 0.70 && (volumeDeltaPct ?? 0) < -8) {
    suggestionType = "DELOAD";
    nextWeight = Math.max(0, topWeight - profile.incrementStep);
    nextDuration = roundToNearest5(targetSeconds * 0.90);
    rationale = "Performance has dropped significantly. Reduce load and duration, then rebuild.";
  } else if (completionPct >= 0.95 && (volumeDeltaPct === null || volumeDeltaPct >= 0)) {
    suggestionType = "INCREASE_DURATION";
    const increment = targetSeconds < 30 ? 5 : targetSeconds <= 90 ? 10 : 15;
    nextDuration = roundToNearest5(targetSeconds + increment);
    rationale = `You sustained ${topWeight} kg for ${bestDurationSeconds}s — at target. Increase hold time next session.`;
  } else if (completionPct >= 0.95 && (volumeDeltaPct ?? 0) >= 5) {
    suggestionType = "INCREASE_WEIGHT";
    nextWeight = topWeight + profile.incrementStep;
    nextDuration = roundToNearest5(targetSeconds * 0.90);
    rationale = `Strong session with consistent hold time. Increase weight by ${profile.incrementStep} kg next session.`;
  }

  const performanceScore = round2(completionPct * 50 + topWeight * 0.5 + (volumeDeltaPct ?? 0) * 0.5);

  return {
    totalVolume,
    effectiveVolume: totalVolume,
    averageRir: null,
    topWeight: round2(topWeight),
    topReps: 0,
    estimated1RM: null,
    bestDurationSeconds,
    totalDurationSeconds,
    bestDistanceKm: null,
    totalDistanceKm: null,
    bestPaceMinPerKm: null,
    volumeDeltaPct,
    performanceScore,
    suggestionType,
    nextWeight: round2(nextWeight),
    nextRepMin: 0,
    nextRepMax: 0,
    nextSuggestedDurationSeconds: nextDuration,
    nextSuggestedDistanceKm: null,
    rationale,
  };
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function calculateOverload(input: SessionPerformanceInput): OverloadComputation {
  const prev = input.previousSessions?.[0];
  const { measurementType } = input.profile;

  switch (measurementType) {
    case "REPS_ONLY":
      return computeRepsOnly(input.sets, prev, input.profile);
    case "TIME":
      return computeTime(input.sets, prev, input.profile);
    case "DISTANCE_TIME":
      return computeDistanceTime(input.sets, prev, input.profile);
    case "WEIGHT_TIME":
      return computeWeightTime(input.sets, prev, input.profile);
    case "WEIGHT_REPS":
    default:
      return computeWeightReps(input.sets, prev, input.profile);
  }
}

