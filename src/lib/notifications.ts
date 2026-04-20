import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const REMINDER_KEY = "kc-fitness.reminder-settings";

// Reserve IDs 1001–1014 for up to 14 daily follow-up reminders
const BASE_ID = 1001;
const MAX_FOLLOWUPS = 7; // keep reminding daily for up to 7 days after threshold

export interface ReminderSettings {
  enabled: boolean;
  daysThreshold: number; // remind after X days without a workout
  reminderHour: number;  // 0–23, hour of day to fire the notification
}

export function getDefaultReminderSettings(): ReminderSettings {
  return { enabled: false, daysThreshold: 2, reminderHour: 18 };
}

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = localStorage.getItem(REMINDER_KEY);
    if (raw) return { ...getDefaultReminderSettings(), ...JSON.parse(raw) };
  } catch {}
  return getDefaultReminderSettings();
}

export function saveReminderSettings(settings: ReminderSettings): void {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(settings));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

export async function checkNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.checkPermissions();
    return display === "granted";
  } catch {
    return false;
  }
}

export async function cancelWorkoutReminders(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const ids = Array.from({ length: MAX_FOLLOWUPS }, (_, i) => ({ id: BASE_ID + i }));
    await LocalNotifications.cancel({ notifications: ids });
  } catch {}
}

export async function scheduleWorkoutReminder(
  lastWorkoutDate: string | null,
  settings: ReminderSettings,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Always cancel existing chain first
  await cancelWorkoutReminders();
  if (!settings.enabled) return;

  const granted = await checkNotificationPermission();
  if (!granted) return;

  const now = new Date();

  // First reminder fires at: lastWorkoutDate + threshold days at reminder hour.
  // If that's already past, start from today/tomorrow at reminder hour.
  let firstFire: Date;
  if (lastWorkoutDate) {
    firstFire = new Date(lastWorkoutDate);
    firstFire.setDate(firstFire.getDate() + settings.daysThreshold);
  } else {
    firstFire = new Date(now);
    firstFire.setDate(now.getDate() + settings.daysThreshold);
  }
  firstFire.setHours(settings.reminderHour, 0, 0, 0);

  if (firstFire <= now) {
    firstFire = new Date(now);
    firstFire.setHours(settings.reminderHour, 0, 0, 0);
    if (firstFire <= now) {
      firstFire.setDate(firstFire.getDate() + 1);
    }
  }

  // Schedule a chain: first reminder + daily follow-ups for MAX_FOLLOWUPS days.
  // Each fires 24h after the previous. Android OS handles all of them with app closed.
  const notifications = Array.from({ length: MAX_FOLLOWUPS }, (_, i) => {
    const fireAt = new Date(firstFire);
    fireAt.setDate(firstFire.getDate() + i);

    const titles = [
      "babe, I miss you 🥺",
      "are you ignoring me?? 😤",
      "hello?? it's been a while…",
      "I'm starting to worry about you 😟",
      "okay I'm literally pouting rn 🙈",
      "babe please come back 😭",
      "fine. but I still miss you. 💔",
    ];

    const bodies = [
      "I haven't seen you in a few days… come train with me? I promise I'll be nice 🥺",
      "starting to feel like you forgot about me. your gains miss you too y'know 😒",
      "okay I'm not mad, just disappointed. come back and let's work out together 💪",
      "it's been days babe. I need you. your muscles need you. everyone needs you 😩",
      "I've been waiting here all day. just one session, please? for me? 🙈",
      "you know I get clingy when you disappear like this 😭 come log a workout already",
      "I'm not crying. you're crying. just… please come back babe 💔 I miss your dedication",
    ];

    return {
      id: BASE_ID + i,
      title: titles[Math.min(i, titles.length - 1)],
      body: bodies[Math.min(i, bodies.length - 1)],
      schedule: { at: fireAt, allowWhileIdle: true },
      smallIcon: "ic_launcher",
      actionTypeId: "",
      extra: null,
    };
  });

  try {
    await LocalNotifications.schedule({ notifications });
  } catch (err) {
    console.warn("KC Fitness: failed to schedule notifications", err);
  }
}
