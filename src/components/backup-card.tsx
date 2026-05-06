"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload, HardDrive } from "lucide-react";
import { exportBackup, restoreFromFile, getLastAutoSaveDate } from "@/lib/backup";

export function BackupCard({ onRestore }: { onRestore: () => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lastSave, setLastSave] = useState<string | null>(null);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    getLastAutoSaveDate().then(setLastSave);
  }, []);

  async function handleExport() {
    try {
      await exportBackup();
    } catch (err) {
      console.warn("Export failed", err);
    }
  }

  function handleRestore(file: File) {
    restoreFromFile(
      file,
      () => {
        setStatus({ msg: "Data restored.", ok: true });
        onRestore();
        setTimeout(() => setStatus(null), 3000);
      },
      (msg) => {
        setStatus({ msg, ok: false });
        setTimeout(() => setStatus(null), 4000);
      },
    );
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
            if (file) handleRestore(file);
            e.target.value = "";
          }}
        />
      </div>

      {status && (
        <p className={`mt-2 text-xs ${status.ok ? "text-emerald-400" : "text-rose-400"}`}>
          {status.msg}
        </p>
      )}
    </div>
  );
}
