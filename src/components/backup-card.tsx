"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, HardDrive, Cloud, CloudDownload } from "lucide-react";
import { exportBackup, restoreFromFile, getLastAutoSaveDate } from "@/lib/backup";
import { syncToServer, restoreFromServer, getLastServerSyncDate } from "@/lib/server-backup";

export function BackupCard({ onRestore }: { onRestore: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSave, setLastSave] = useState<string | null>(null);
  const [lastServerSync, setLastServerSync] = useState<string | null>(null);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [confirmingServerRestore, setConfirmingServerRestore] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    getLastAutoSaveDate().then(setLastSave);
    setLastServerSync(getLastServerSyncDate());
  }, []);

  async function handleExport() {
    try {
      await exportBackup();
      setStatus({ msg: "Backup exported.", ok: true });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ msg: "Export failed — try again.", ok: false });
      setTimeout(() => setStatus(null), 4000);
      console.warn("Export failed", err);
    }
  }

  function handleFileSelected(file: File) {
    setPendingFile(file);
    setConfirmingRestore(true);
  }

  function confirmRestore() {
    if (!pendingFile) return;
    restoreFromFile(
      pendingFile,
      () => {
        setStatus({ msg: "Data restored.", ok: true });
        setConfirmingRestore(false);
        setPendingFile(null);
        onRestore();
        setTimeout(() => setStatus(null), 3000);
      },
      (msg) => {
        setStatus({ msg, ok: false });
        setConfirmingRestore(false);
        setPendingFile(null);
        setTimeout(() => setStatus(null), 4000);
      },
    );
  }

  function cancelRestore() {
    setConfirmingRestore(false);
    setPendingFile(null);
  }

  async function handleSyncToServer() {
    setSyncing(true);
    try {
      await syncToServer();
      setLastServerSync(getLastServerSyncDate());
      setStatus({ msg: "Synced to server.", ok: true });
      setTimeout(() => setStatus(null), 3000);
    } catch {
      setStatus({ msg: "Sync failed — check your connection.", ok: false });
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setSyncing(false);
    }
  }

  async function confirmServerRestore() {
    setConfirmingServerRestore(false);
    setSyncing(true);
    try {
      await restoreFromServer();
      setStatus({ msg: "Data restored from server.", ok: true });
      onRestore();
      setTimeout(() => setStatus(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes("404")
        ? "No backup found on server yet."
        : "Restore failed — check your connection.";
      setStatus({ msg, ok: false });
      setTimeout(() => setStatus(null), 4000);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <HardDrive className="h-4 w-4 text-[#999]" />
        <div>
          <p className="text-sm font-medium text-white">Data backup</p>
          <p className="text-xs text-[#999]">
            {lastSave
              ? `Auto-saved to device · last saved ${lastSave}`
              : "Auto-saves to device after every workout"}
          </p>
        </div>
      </div>

      {confirmingRestore ? (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-3">
          <p className="text-sm font-medium text-rose-200">Replace all data with this backup?</p>
          <p className="mt-1 text-xs text-rose-300/70">This overwrites your current workouts and exercises. This cannot be undone.</p>
          <div className="mt-3 flex gap-3">
            <button
              onClick={confirmRestore}
              className="rounded-xl bg-rose-400 px-4 py-2 text-xs font-medium text-rose-950 hover:bg-rose-300"
            >
              Yes, restore
            </button>
            <button
              onClick={cancelRestore}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs text-[#bbb] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleExport}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs text-[#bbb] transition hover:border-white/20 hover:text-white"
          >
            <Download className="h-3 w-3" />
            Export backup
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs text-[#bbb] transition hover:border-white/20 hover:text-white"
          >
            <Upload className="h-3 w-3" />
            Restore backup
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
              e.target.value = "";
            }}
          />
        </div>
      )}

      <div className="mt-5 border-t border-white/8 pt-5">
        <div className="flex items-center gap-3">
          <Cloud className="h-4 w-4 text-[#999]" />
          <div>
            <p className="text-sm font-medium text-white">Server sync</p>
            <p className="text-xs text-[#999]">
              {lastServerSync ? `Last synced ${lastServerSync}` : "Never synced to server"}
            </p>
          </div>
        </div>

        {confirmingServerRestore ? (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-3">
            <p className="text-sm font-medium text-rose-200">Replace all data with server backup?</p>
            <p className="mt-1 text-xs text-rose-300/70">This overwrites your current workouts and exercises. This cannot be undone.</p>
            <div className="mt-3 flex gap-3">
              <button
                onClick={confirmServerRestore}
                className="rounded-xl bg-rose-400 px-4 py-2 text-xs font-medium text-rose-950 hover:bg-rose-300"
              >
                Yes, restore
              </button>
              <button
                onClick={() => setConfirmingServerRestore(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs text-[#bbb] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleSyncToServer}
              disabled={syncing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs text-[#bbb] transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              <Cloud className="h-3 w-3" />
              {syncing ? "Syncing…" : "Sync to server"}
            </button>
            <button
              onClick={() => setConfirmingServerRestore(true)}
              disabled={syncing}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-xs text-[#bbb] transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              <CloudDownload className="h-3 w-3" />
              Restore from server
            </button>
          </div>
        )}
      </div>

      {status && (
        <p className={`mt-2 text-xs ${status.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
