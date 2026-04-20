"use client";

import { useEffect } from "react";
import { loadReminderSettings, scheduleWorkoutReminder } from "@/lib/notifications";
import { dbGetWorkouts } from "@/lib/db";

export function useWorkoutReminder() {
  useEffect(() => {
    const settings = loadReminderSettings();
    if (!settings.enabled) return;

    const workouts = dbGetWorkouts();
    const lastWorkoutDate = workouts.length > 0 ? workouts[0].performedAt : null;

    scheduleWorkoutReminder(lastWorkoutDate, settings);
  }, []);
}
