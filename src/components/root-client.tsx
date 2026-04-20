"use client";

import { useState } from "react";
import { AppSplash } from "@/components/app-splash";

export function RootClient({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  return (
    <>
      {!ready && <AppSplash onDone={() => setReady(true)} />}
      <div className={ready ? "opacity-100" : "opacity-0"}>{children}</div>
    </>
  );
}
