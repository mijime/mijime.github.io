import { CalendarDays } from "lucide-react";

export function DayTransition({ day, totalDays }: { day: number; totalDays: number }) {
  return (
    <div className="day-transition-layer" aria-live="polite" aria-atomic="true">
      <div className="day-transition-card">
        <div className="flex items-baseline justify-center gap-2">
          <CalendarDays size={18} className="text-(--accent)" />
          <span className="serif text-4xl font-semibold leading-none text-(--ink)">Day {day}</span>
          <span className="text-[11px] text-(--mid)">/ {totalDays}</span>
        </div>
        <span className="mx-auto mt-2 block h-1 w-32 overflow-hidden rounded-full bg-(--grid)">
          <span
            className="block h-full rounded-full bg-(--accent)"
            style={{ width: `${Math.min(100, (day / totalDays) * 100)}%` }}
          />
        </span>
      </div>
    </div>
  );
}
