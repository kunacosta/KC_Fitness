"use client";

import Link from "next/link";
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

export function AppShell({ children, title, currentPath }: AppShellProps) {
  useWorkoutReminder();
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      {/* Top bar */}
      <header className="mx-auto w-full max-w-3xl flex min-w-0 items-center gap-3 px-5 pb-4" style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 48px)" }}>
        <span className="shrink-0 text-base font-black tracking-tight text-white">KC</span>
        {title && (
          <>
            <span className="shrink-0 text-[#bbb]">/</span>
            <span className="min-w-0 truncate text-sm font-medium text-[#bbb]">{title}</span>
          </>
        )}
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 pb-nav">{children}</main>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 bg-[#0a0a0a]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="mx-auto flex max-w-3xl items-stretch px-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = currentPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 min-h-[52px] pb-3 pt-2.5 text-[11px] font-medium uppercase tracking-widest transition-colors",
                  isActive ? "text-white" : "text-[#bbb] hover:text-white",
                )}
              >
                <Icon className={cn("h-5 w-5 transition-transform duration-200", isActive ? "text-white scale-110" : "text-[#bbb]")} />
                {item.label}
                <span className={cn("h-[2px] w-5 rounded-full transition-all duration-300", isActive ? "bg-white opacity-100" : "bg-transparent opacity-0")} />
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
