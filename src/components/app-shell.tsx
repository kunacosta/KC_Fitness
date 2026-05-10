"use client";

import Link from "next/link";
import { useMemo } from "react";
import { BarChart3, Dumbbell, Home } from "lucide-react";

import { cn } from "@/lib/utils";
import { useWorkoutReminder } from "@/lib/use-workout-reminder";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/exercises", label: "Library", icon: Dumbbell },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
] as const;

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  currentPath: string;
}

function BackgroundStars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 55 }, (_, i) => ({
        x: (i * 37 + 11) % 100,
        y: (i * 53 + 17) % 100,
        size: (i % 2) + 1,
        delay: (i * 0.31) % 6,
        duration: 3 + (i % 5) * 1.1,
      })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {stars.map((s, i) => (
        <div
          key={i}
          className="animate-star-bg absolute rounded-full bg-white"
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

export function AppShell({ children, title, currentPath }: AppShellProps) {
  useWorkoutReminder();
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <BackgroundStars />

      {/* Top bar */}
      <header className="relative z-10 mx-auto w-full max-w-3xl flex min-w-0 items-center gap-3 px-5 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)" }}>
        <span
          className="shrink-0 text-base font-black tracking-tight text-white"
          style={{ textShadow: "0 0 16px rgba(124,106,245,0.6)" }}
        >
          KC
        </span>
        {title && (
          <>
            <span className="shrink-0 text-[#444]">/</span>
            <span className="min-w-0 truncate text-sm font-medium text-[#777]">{title}</span>
          </>
        )}
      </header>

      {/* Page content */}
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-5 pb-nav">{children}</main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: "rgba(10,10,10,0.82)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        <div className="mx-auto flex max-w-3xl items-stretch px-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? currentPath === "/" : currentPath.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 min-h-[52px] pb-3 pt-2.5 text-[11px] font-medium uppercase tracking-widest transition-colors",
                  isActive ? "text-white" : "text-[#555] hover:text-[#999]",
                )}
              >
                <Icon
                  className={cn("h-5 w-5 transition-all duration-200", isActive ? "scale-110" : "")}
                  style={isActive ? { color: "var(--accent-2)", filter: "drop-shadow(0 0 6px var(--accent-glow))" } : {}}
                />
                {item.label}
                <span
                  className={cn("h-[3px] w-4 rounded-full transition-all duration-300", isActive ? "opacity-100" : "opacity-0")}
                  style={isActive ? { background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" } : {}}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
