import { CalendarDays } from "lucide-react";

export function DayTransition({ day, totalDays }: { day: number; totalDays: number }) {
  return (
    <div className="day-transition-layer" aria-live="polite" aria-atomic="true">
      <div className="day-transition-card">
        <p className="text-[9px] tracking-[0.3em] text-(--mid)">ROUND START</p>
        <div className="mt-1 flex items-baseline justify-center gap-2">
          <CalendarDays size={18} className="text-(--terra)" />
          <span className="serif text-4xl font-semibold leading-none text-(--ink)">Day {day}</span>
          <span className="text-[11px] text-(--mid)">/ {totalDays}</span>
        </div>
        <p className="mt-1.5 text-[9px] text-(--mid)">
          全員アクションをリセット。新しいラウンド開始
        </p>
      </div>
    </div>
  );
}
