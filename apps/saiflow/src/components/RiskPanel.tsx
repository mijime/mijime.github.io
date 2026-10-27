import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Button, Panel } from "@mijime/theme/ui";
import { simulateRisk, type RiskSummary } from "../risk";
import { useSaiflowState } from "../store";
import { fmt } from "../utils";

function statusFor(probability: number): {
  label: string;
  tone: "success" | "warning" | "danger";
} {
  if (probability <= 0.05) return { label: "低い", tone: "success" };
  if (probability <= 0.2) return { label: "注意", tone: "warning" };
  return { label: "高い", tone: "danger" };
}

export function RiskPanel({ trials = 500 }: { trials?: number }) {
  const state = useSaiflowState();
  const scenario = state.scenarios[state.activeScenarioIndex];
  const [summary, setSummary] = useState<RiskSummary | null>(null);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [runFor, setRunFor] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const signature = useMemo(
    () =>
      JSON.stringify({
        events: scenario?.events ?? [],
        age: state.currentAge,
        years: state.simulationYears,
        autoDrawdown: state.autoDrawdown,
        trials,
      }),
    [scenario, state.currentAge, state.simulationYears, state.autoDrawdown, trials],
  );

  const run = (nextSeed = seed) => {
    if (!scenario) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setRunning(true);
    setSeed(nextSeed);
    timerRef.current = setTimeout(() => {
      const result = simulateRisk(
        {
          currentAge: state.currentAge,
          simulationYears: state.simulationYears,
          scenario,
          autoDrawdown: state.autoDrawdown,
          estimateTaxes: state.estimateTaxes,
        },
        { trials, seed: nextSeed },
      );
      setSummary(result);
      setRunFor(signature);
      setRunning(false);
    }, 0);
  };

  if (!scenario) {
    return <div className="p-4 text-xs opacity-40">結果がまだありません</div>;
  }

  const stale = summary !== null && runFor !== signature;
  const status = summary ? statusFor(summary.depletionProbability) : null;

  return (
    <div className="h-full overflow-auto">
      <div className="px-3 py-2 border-b border-(--border)">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">リスク試算</span>
          <span className="text-[10px] opacity-35">{trials}回</span>
        </div>
        <p className="text-[10px] opacity-35 mt-0.5 leading-relaxed">
          投資リターン・大病・介護をランダムに振って、資産が持つかを見ます。
        </p>
      </div>

      <div className="p-3 space-y-3">
        {!summary && (
          <Button variant="primary" className="w-full" disabled={running} onClick={() => run(seed)}>
            {running ? "計算中…" : `${trials}回試算する`}
          </Button>
        )}

        {summary && (
          <>
            {stale && (
              <div className="flex items-center gap-2 text-[11px] text-yellow-600 dark:text-yellow-400">
                プランが変わりました。結果は古い可能性があります。
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-1 py-0"
                  onClick={() => run(seed)}
                >
                  再試算
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              {[
                ["P10", summary.p10, "悪い相場"],
                ["P50", summary.p50, "中央値"],
                ["P90", summary.p90, "良い相場"],
              ].map(([label, value, description]) => (
                <Panel key={label} className="p-2">
                  <div className="text-[10px] opacity-40">{label}</div>
                  <div className="text-xs font-medium tabular-nums">
                    {fmt(Math.round(value as number))}万円
                  </div>
                  <div className="text-[9px] opacity-30">{description}</div>
                </Panel>
              ))}
            </div>

            <Panel className="p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] opacity-50">途中で資産がマイナスになる確率</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">
                    {(summary.depletionProbability * 100).toFixed(1)}%
                  </span>
                  {status && <Badge tone={status.tone}>{status.label}</Badge>}
                </span>
              </div>
              <div className="flex justify-between text-[10px] opacity-35 mt-1">
                <span>シード: {seed}</span>
              </div>
            </Panel>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={() => run(seed + 1)}
              >
                別のシードで試す
              </Button>
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => run(seed)}>
                同じ条件で再試算
              </Button>
            </div>
          </>
        )}

        <div className="text-[10px] opacity-25 leading-relaxed space-y-1">
          <p>・投資リターンは年ごとに±8%の変動を想定</p>
          <p>・大病は年齢別確率（生涯で約2人に1人に調整）、自己負担100万円/回</p>
          <p>・介護は80歳で30%、一時47万円＋月9万円×5年</p>
          <p>※概算です。投資助言ではありません。</p>
        </div>
      </div>
    </div>
  );
}
