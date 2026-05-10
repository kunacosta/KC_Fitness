import { z } from "zod";
import { LOCAL_STORAGE_KEY } from "@/lib/local-storage/constants";

const SERVER_URL = "https://kc-fitness.duckdns.org";
const AUTH_HEADER = "Bearer kc-fitness-backup-secret-2026";
const LAST_SYNC_KEY = "kc-fitness-last-server-sync";

const backupSchema = z.object({
  exercises: z.array(z.record(z.string(), z.unknown())),
  workouts: z.array(z.record(z.string(), z.unknown())),
});

export async function syncToServer(): Promise<void> {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}";
  const res = await fetch(`${SERVER_URL}/backup/upload`, {
    method: "POST",
    headers: { "Authorization": AUTH_HEADER, "Content-Type": "application/json" },
    body: data,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
}

export async function restoreFromServer(): Promise<void> {
  const res = await fetch(`${SERVER_URL}/backup/download`, {
    headers: { "Authorization": AUTH_HEADER },
  });
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const text = await res.text();
  const result = backupSchema.safeParse(JSON.parse(text));
  if (!result.success) throw new Error("Invalid backup data from server");
  localStorage.setItem(LOCAL_STORAGE_KEY, text);
}

export function getLastServerSyncDate(): string | null {
  if (typeof localStorage === "undefined") return null;
  const iso = localStorage.getItem(LAST_SYNC_KEY);
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-MY", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
