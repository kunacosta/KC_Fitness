import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className, style }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-white/8 bg-[#111111] p-6 overflow-hidden",
        className,
      )}
      style={style}
    >
      {children}
    </section>
  );
}
