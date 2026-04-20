"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const MESSAGES = [
  "counting your excuses... none found. let's go 💪",
  "warming up the algorithms...",
  "calculating your next PR...",
  "telling your muscles to wake up 😤",
  "summoning the iron gods...",
  "checking if today is leg day... it is. always is.",
  "loading your gains from last session...",
  "asking your body nicely to cooperate...",
  "preparing to make you suffer (lovingly)...",
  "convincing you that rest days are overrated...",
  "syncing with your future shredded self...",
  "bribing your dopamine receptors...",
  "measuring the distance between you and your goals... closing in 🔥",
  "googling 'how to not skip arm day'...",
  "your muscles called. they miss you.",
];

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface AppSplashProps {
  onDone: () => void;
}

export function AppSplash({ onDone }: AppSplashProps) {
  const [message] = useState(() => random(MESSAGES));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 1800);
    const done = setTimeout(onDone, 2200);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0a0a] transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Icon */}
      <div className="animate-[scale-in_0.4s_ease-out]">
        <Image
          src="/icon.png"
          alt="KC Fitness"
          width={120}
          height={120}
          className="rounded-[25px]"
          priority
        />
      </div>

      {/* App name */}
      <p className="mt-5 text-2xl font-black tracking-tight text-white">KC Fitness</p>

      {/* Funny loading line */}
      <p className="mt-3 max-w-[260px] text-center text-sm text-[#999] animate-[fade-in_0.6s_0.3s_ease-out_both]">
        {message}
      </p>

      {/* Loader bar */}
      <div className="mt-8 h-[2px] w-40 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-emerald-400 animate-[loader_1.6s_0.2s_ease-in-out_both]" />
      </div>
    </div>
  );
}
