import { useMemo } from "react";
import { Badge, Panel } from "@mijime/theme/ui";
import { buildAdvice, type AdviceLevel } from "../advice";
import { useSaiflowState } from "../store";

const LEVEL_META: Record<
  AdviceLevel,
  { label: string; tone: "danger" | "warning" | "info" | "success" }
> = {
  danger: { label: "要対応", tone: "danger" },
  warning: { label: "注意", tone: "warning" },
  info: { label: "参考", tone: "info" },
  good: { label: "良好", tone: "success" },
};

export function AdvicePanel() {
  const state = useSaiflowState();
  const scenario = state.scenarios[state.activeScenarioIndex];
  const advice = useMemo(
    () => (state.rows && scenario ? buildAdvice(state.rows, scenario, state.currentAge) : []),
    [state.rows, state.currentAge, scenario],
  );

  if (!state.rows || state.rows.length === 0 || !scenario) {
    return <div className="p-4 text-xs opacity-40">結果がまだありません</div>;
  }

  const dangerCount = advice.filter((item) => item.level === "danger").length;
  const warningCount = advice.filter((item) => item.level === "warning").length;

  return (
    <div className="h-full overflow-auto">
      <div className="px-3 py-2 border-b border-(--border)">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">この計画の気づき</span>
          {dangerCount > 0 && <Badge tone="danger">要対応 {dangerCount}</Badge>}
          {warningCount > 0 && <Badge tone="warning">注意 {warningCount}</Badge>}
        </div>
        <p className="text-[10px] opacity-35 mt-0.5">
          入力内容からルールベースで自動判定しています
        </p>
      </div>

      <div className="p-3 space-y-2">
        {advice.map((item) => {
          const meta = LEVEL_META[item.level];
          return (
            <Panel key={item.id} className="p-3">
              <div className="flex items-center gap-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="text-xs font-medium">{item.title}</span>
              </div>
              <p className="text-[11px] opacity-60 mt-1 leading-relaxed">{item.detail}</p>
            </Panel>
          );
        })}
        {advice.length === 0 && (
          <p className="text-xs opacity-40">大きな問題は見つかりませんでした。</p>
        )}
        <p className="text-[10px] opacity-25 pt-1 leading-relaxed">
          ※概算のルールベース判定です。投資助言ではありません。
        </p>
      </div>
    </div>
  );
}
