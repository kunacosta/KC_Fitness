"use client";

import { useEffect, useMemo, useState } from "react";
import { Moon, Sunrise, Sun, Sunset } from "lucide-react";

type Period = "night" | "morning" | "afternoon" | "evening";

function getPeriod(hour: number): Period {
  if (hour >= 21 || hour < 6) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

const PERIOD_CONFIG: Record<
  Period,
  {
    greeting: string;
    sub: string;
    cardBg: string;
    topGlow: string;
    bottomGlow: string;
    accentColor: string;
    textAccent: string;
    showStars: boolean;
  }
> = {
  night: {
    greeting: "Good Night",
    sub: "Rest hard. Come back stronger.",
    cardBg: "linear-gradient(160deg, #0e0e1f 0%, #0a0a10 60%, #0a0a0a 100%)",
    topGlow: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(80,60,180,0.28) 0%, transparent 100%)",
    bottomGlow: "radial-gradient(ellipse 40% 30% at 80% 100%, rgba(60,40,120,0.15) 0%, transparent 100%)",
    accentColor: "#7c6af5",
    textAccent: "#9b8ffa",
    showStars: true,
  },
  morning: {
    greeting: "Good Morning",
    sub: "New day, new gains.",
    cardBg: "linear-gradient(160deg, #1c1200 0%, #120c00 60%, #0a0a0a 100%)",
    topGlow: "radial-gradient(ellipse 70% 50% at 30% 0%, rgba(240,160,20,0.22) 0%, transparent 100%)",
    bottomGlow: "radial-gradient(ellipse 50% 40% at 10% 100%, rgba(200,100,10,0.10) 0%, transparent 100%)",
    accentColor: "#f0a014",
    textAccent: "#f5b830",
    showStars: false,
  },
  afternoon: {
    greeting: "Good Afternoon",
    sub: "Peak hours. Peak effort.",
    cardBg: "linear-gradient(160deg, #0c1220 0%, #0a0f18 60%, #0a0a0a 100%)",
    topGlow: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(60,120,220,0.18) 0%, transparent 100%)",
    bottomGlow: "radial-gradient(ellipse 40% 30% at 90% 80%, rgba(30,80,160,0.10) 0%, transparent 100%)",
    accentColor: "#4a90e2",
    textAccent: "#6aabf7",
    showStars: false,
  },
  evening: {
    greeting: "Good Evening",
    sub: "Evening grind. Let's go.",
    cardBg: "linear-gradient(160deg, #1a0a00 0%, #130800 60%, #0a0a0a 100%)",
    topGlow: "radial-gradient(ellipse 70% 50% at 70% 0%, rgba(220,80,20,0.22) 0%, transparent 100%)",
    bottomGlow: "radial-gradient(ellipse 50% 40% at 20% 100%, rgba(160,50,10,0.12) 0%, transparent 100%)",
    accentColor: "#e05014",
    textAccent: "#f07040",
    showStars: false,
  },
};

const PERIOD_ICON = {
  night: Moon,
  morning: Sunrise,
  afternoon: Sun,
  evening: Sunset,
};

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 32 }, (_, i) => ({
        x: (i * 41 + 7) % 97,
        y: (i * 67 + 13) % 88,
        size: (i % 3) + 1,
        delay: (i * 0.41) % 4,
        duration: 1.8 + (i % 5) * 0.4,
        opacity: 0.4 + (i % 3) * 0.2,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <div
          key={i}
          className="animate-twinkle absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function MorningRays({ color }: { color: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute origin-bottom-left"
          style={{
            left: `${10 + i * 6}%`,
            bottom: "0",
            width: "1px",
            height: `${30 + i * 10}%`,
            background: `linear-gradient(to top, transparent, ${color}18, transparent)`,
            transform: `rotate(${-20 + i * 12}deg)`,
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

export function DayNightHeader() {
  const [period, setPeriod] = useState<Period>("morning");
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setPeriod(getPeriod(now.getHours()));
      setTimeStr(now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" }));
      setDateStr(now.toLocaleDateString("en-MY", { month: "short", day: "numeric" }));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = PERIOD_CONFIG[period];
  const Icon = PERIOD_ICON[period];

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-6"
      style={{ background: cfg.cardBg }}
    >
      {/* Top ambient glow */}
      <div
        className="animate-glow-pulse pointer-events-none absolute inset-0"
        style={{ background: cfg.topGlow }}
      />
      {/* Bottom ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: cfg.bottomGlow, opacity: 0.8 }}
      />

      {/* Night stars */}
      {cfg.showStars && <Stars />}

      {/* Morning light rays */}
      {period === "morning" && <MorningRays color={cfg.accentColor} />}

      {/* Evening horizon line */}
      {period === "evening" && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.accentColor}40, transparent)` }}
        />
      )}

      {/* Content */}
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Icon
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: cfg.textAccent }}
              strokeWidth={2.5}
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: cfg.textAccent }}>
              {timeStr}
            </p>
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            {cfg.greeting}
          </h2>
          <p className="mt-0.5 text-sm" style={{ color: cfg.accentColor + "cc" }}>
            {cfg.sub}
          </p>
        </div>

        {/* Date badge */}
        <div
          className="shrink-0 rounded-xl px-3 py-2 text-center"
          style={{
            background: cfg.accentColor + "18",
            border: `1px solid ${cfg.accentColor}28`,
          }}
        >
          <p className="text-[10px] uppercase tracking-widest" style={{ color: cfg.accentColor + "99" }}>
            Today
          </p>
          <p className="mt-0.5 text-xs font-semibold text-white">{dateStr}</p>
        </div>
      </div>
    </div>
  );
}
