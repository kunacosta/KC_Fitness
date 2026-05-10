"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Capacitor } from "@capacitor/core";

import {
  loadReminderSettings,
  saveReminderSettings,
  requestNotificationPermission,
  scheduleWorkoutReminder,
  cancelWorkoutReminders,
  type ReminderSettings,
} from "@/lib/notifications";

const HOUR_OPTIONS = [
  { value: 7, label: "7:00 AM" },
  { value: 8, label: "8:00 AM" },
  { value: 9, label: "9:00 AM" },
  { value: 12, label: "12:00 PM" },
  { value: 15, label: "3:00 PM" },
  { value: 17, label: "5:00 PM" },
  { value: 18, label: "6:00 PM" },
  { value: 19, label: "7:00 PM" },
  { value: 20, label: "8:00 PM" },
  { value: 21, label: "9:00 PM" },
];

interface ReminderSettingsProps {
  lastWorkoutDate: string | null;
}

export function ReminderSettingsCard({ lastWorkoutDate }: ReminderSettingsProps) {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadReminderSettings());
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isNative] = useState(() => Capacitor.isNativePlatform());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    import("@capacitor/local-notifications").then(({ LocalNotifications }) => {
      LocalNotifications.checkPermissions().then(({ display }) => {
        setPermissionGranted(display === "granted");
      });
    });
  }, [isNative]);

  async function handleToggle() {
    if (!settings.enabled && !permissionGranted) {
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);
      if (!granted) return;
    }

    const next = { ...settings, enabled: !settings.enabled };
    setSettings(next);
    saveReminderSettings(next);

    if (next.enabled) {
      await scheduleWorkoutReminder(lastWorkoutDate, next);
    } else {
      await cancelWorkoutReminders();
    }
    flash();
  }

  async function handleSave(patch: Partial<ReminderSettings>) {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveReminderSettings(next);
    if (next.enabled) {
      await scheduleWorkoutReminder(lastWorkoutDate, next);
    }
    flash();
  }

  function flash() {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {settings.enabled
            ? <Bell className="h-4 w-4 text-emerald-400" />
            : <BellOff className="h-4 w-4 text-[#999]" />
          }
          <div>
            <p className="text-sm font-medium text-white">Workout reminder</p>
            <p className="text-xs text-[#999]">
              {isNative
                ? "Notify me if I haven't trained in a while"
                : "Only available in the Android app"}
            </p>
          </div>
        </div>

        {isNative && (
          <button
            role="switch"
            aria-checked={settings.enabled}
            aria-label={settings.enabled ? "Disable workout reminder" : "Enable workout reminder"}
            onClick={handleToggle}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
              settings.enabled ? "bg-emerald-500" : "bg-white/15"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                settings.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        )}
      </div>

      {isNative && settings.enabled && (
        <div className="mt-5 space-y-4">
          {/* Days threshold */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#999]">
              Remind me after
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 7].map((d) => (
                <button
                  key={d}
                  onClick={() => handleSave({ daysThreshold: d })}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    settings.daysThreshold === d
                      ? "bg-emerald-500 text-white"
                      : "border border-white/10 text-[#bbb] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {d === 1 ? "1 day" : `${d} days`}
                </button>
              ))}
            </div>
          </div>

          {/* Reminder time */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.18em] text-[#999]">
              Notification time
            </p>
            <div className="flex flex-wrap gap-2">
              {HOUR_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => handleSave({ reminderHour: value })}
                  className={`rounded-xl px-3 py-2 text-sm transition ${
                    settings.reminderHour === value
                      ? "bg-emerald-500 text-white"
                      : "border border-white/10 text-[#bbb] hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="rounded-2xl border border-white/8 bg-[#161616] px-4 py-3">
            <p className="text-xs text-[#999]">
              {lastWorkoutDate
                ? `Last workout: ${new Date(lastWorkoutDate).toLocaleDateString("en-MY", { weekday: "short", month: "short", day: "numeric" })}`
                : "No workouts logged yet"}
              {" · "}
              Next reminder fires if no workout logged within {settings.daysThreshold} day{settings.daysThreshold !== 1 ? "s" : ""} at {HOUR_OPTIONS.find(o => o.value === settings.reminderHour)?.label ?? `${settings.reminderHour}:00`}.
            </p>
          </div>

          {saved && (
            <p className="text-xs text-emerald-400">Reminder updated.</p>
          )}
        </div>
      )}
    </div>
  );
}
