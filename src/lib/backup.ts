import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { LOCAL_STORAGE_KEY } from "@/lib/local-storage/constants";

const BACKUP_FILENAME = "kc-fitness-backup.json";

function getBackupData(): string {
  return localStorage.getItem(LOCAL_STORAGE_KEY) ?? "{}";
}

function todayFilename(): string {
  return `kc-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

// ── Auto-save to device Documents folder (silent, after every workout) ────────

export async function autoSaveToDevice(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.writeFile({
      path: BACKUP_FILENAME,
      data: getBackupData(),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
  } catch (err) {
    console.warn("KC Fitness: auto-save failed", err);
  }
}

// ── Manual export ─────────────────────────────────────────────────────────────

export async function exportBackup(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // Write to a temp cache file then share it — pops the Android share sheet
    // so the user can save to Downloads, WhatsApp, email, whatever they want
    const path = todayFilename();
    await Filesystem.writeFile({
      path,
      data: getBackupData(),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache });
    await Share.share({
      title: "KC Fitness backup",
      text: "Your KC Fitness workout data",
      url: uri,
      dialogTitle: "Save or share your backup",
    });
  } else {
    // Browser fallback — direct download
    const blob = new Blob([getBackupData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = todayFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }
}

// ── Restore from file ─────────────────────────────────────────────────────────

export function restoreFromFile(file: File, onDone: () => void): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target?.result as string;
      JSON.parse(text); // validate JSON
      localStorage.setItem(LOCAL_STORAGE_KEY, text);
      onDone();
    } catch {
      alert("Invalid backup file. Please use a file exported from KC Fitness.");
    }
  };
  reader.readAsText(file);
}

// ── Check if a device auto-save exists ───────────────────────────────────────

export async function getLastAutoSaveDate(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const stat = await Filesystem.stat({ path: BACKUP_FILENAME, directory: Directory.Documents });
    return new Date(stat.mtime).toLocaleDateString("en-MY", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return null;
  }
}
