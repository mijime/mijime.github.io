import type { FlowSummary as FlowData } from "../../engine/analytics/result";
import type { BenchmarkEntry } from "../../data/benchmark";
import { LANE_LABEL } from "../ui";

const LANE_KEYS = ["open", "inbox", "wip", "test"] as const;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-(--border) bg-(--paper) px-1 py-1 text-center">
      <span className="block text-[7.5px] text-(--mid)">{label}</span>
      <span className="block text-[12px] font-semibold tabular-nums text-(--ink)">{value}</span>
      {hint && <span className="block text-[7px] text-(--mid)">{hint}</span>}
    </div>
  );
}

export function FlowSummary({
  flow,
  benchmark,
}: {
  flow: FlowData;
  benchmark: BenchmarkEntry | null;
}) {
  const totalExpired = Math.max(
    1,
    LANE_KEYS.reduce((sum, lane) => sum + flow.expiredByLane[lane], 0),
  );
  return (
    <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
      <h2 className="serif text-[13px] font-semibold">流れ</h2>
      <div className="mt-2 grid grid-cols-3 gap-1">
        <Stat label="完了" value={`${flow.completed}件`} />
        <Stat label="期限切れ" value={`${flow.expired}件`} />
        <Stat label="Review切れ" value={`${flow.testExpired}件`} />
        <Stat
          label="リードタイム"
          value={`${flow.avgLeadTime.toFixed(1)}日`}
          hint={benchmark ? `参考 ${benchmark.avgLeadTime.toFixed(1)}日` : undefined}
        />
        <Stat
          label="平均WIP"
          value={flow.avgWip.toFixed(1)}
          hint={benchmark ? `参考 ${benchmark.avgWip.toFixed(1)}` : undefined}
        />
        <Stat
          label="ボトルネック"
          value={flow.bottleneck ? LANE_LABEL[flow.bottleneck] : "なし"}
          hint={flow.bottleneckShare > 0 ? `${Math.round(flow.bottleneckShare * 100)}%` : undefined}
        />
      </div>

      {flow.expired > 0 && (
        <div className="mt-2 space-y-1">
          <p className="text-[8px] text-(--mid)">期限切れの発生レーン</p>
          {LANE_KEYS.map((lane) => {
            const count = flow.expiredByLane[lane];
            const width = (count / totalExpired) * 100;
            return (
              <div key={lane} className="flex items-center gap-2 text-[8px]">
                <span className="w-14 shrink-0 text-(--mid)">{LANE_LABEL[lane]}</span>
                <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-(--grid)">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-amber-500/80"
                    style={{ width: `${width}%` }}
                  />
                </span>
                <span className="w-4 text-right tabular-nums text-(--ink)">{count}</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
