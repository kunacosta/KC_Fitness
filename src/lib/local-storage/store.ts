import { LOCAL_STORAGE_KEY } from "@/lib/local-storage/constants";
import { buildInitialLocalAppState } from "@/lib/local-storage/seed";
import type { LocalAppState } from "@/types/local-db";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readLocalAppState(): LocalAppState {
  if (!canUseLocalStorage()) {
    return buildInitialLocalAppState();
  }

  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);

  if (!raw) {
    const initialState = buildInitialLocalAppState();
    writeLocalAppState(initialState);
    return initialState;
  }

  try {
    return JSON.parse(raw) as LocalAppState;
  } catch {
    // Corrupted data — return fallback without overwriting so the user
    // still has a chance to recover the raw value manually.
    return buildInitialLocalAppState();
  }
}

export function writeLocalAppState(state: LocalAppState) {
  if (!canUseLocalStorage()) return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage quota exceeded — data not saved
    console.warn("KC Fitness: storage quota exceeded. Consider exporting your data.");
  }
}

export function resetLocalAppState() {
  const initialState = buildInitialLocalAppState();
  writeLocalAppState(initialState);
  return initialState;
}
