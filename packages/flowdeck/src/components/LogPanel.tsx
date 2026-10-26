import { ScrollText } from "lucide-react";
import type { LogEntry } from "../engine/types";

export const LOG_TONE: Record<LogEntry["kind"], string> = {
  info: "text-(--mid)",
  good: "text-(--success)",
  bad: "text-(--danger)",
};

export function groupLogByDay(log: LogEntry[]): { day: number; entries: LogEntry[] }[] {
  const groups: { day: number; entries: LogEntry[] }[] = [];
  for (const entry of log) {
    const last = groups.at(-1);
    if (last && last.day === entry.day) {
      last.entries.push(entry);
    } else {
      groups.push({ day: entry.day, entries: [entry] });
    }
  }
  return groups;
}

export function LogPanel({ log }: { log: LogEntry[] }) {
  const groups = groupLogByDay(log).slice(-2).toReversed();

  return (
    <section className="ui-panel flex flex-col p-2 lg:h-full">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em]">
          <ScrollText size={11} className="text-(--accent)" /> ログ
        </h2>
        <span className="text-[8px] tabular-nums text-(--mid)">{log.length}件</span>
      </div>
      <div className="mt-1 max-h-[240px] min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5 lg:max-h-none">
        {groups.map((group) => (
          <div key={group.day}>
            <div className="sticky top-0 flex items-center gap-1 bg-(--paper) py-0.5 text-[8px] font-semibold tracking-[0.12em] text-(--mid)">
              <span className="h-px flex-1 bg-(--border)" />
              DAY {group.day}
              <span className="h-px flex-1 bg-(--border)" />
            </div>
            <ul className="space-y-0.5">
              {group.entries.toReversed().map((entry, index) => (
                <li
                  key={`${entry.day}-${index}-${entry.message}`}
                  className={`text-[9px] leading-snug ${LOG_TONE[entry.kind]}`}
                >
                  <span className="mr-1 text-(--accent)">›</span>
                  {entry.message}
                </li>
              ))}
            </ul>
          </div>
        ))}
        {log.length === 0 && <p className="text-[8px] text-(--mid)">まだログはありません。</p>}
      </div>
    </section>
  );
}
