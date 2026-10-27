import { Input } from "@mijime/theme/ui";
import { useSaiflowDispatch, useSaiflowState } from "../store";
import { ProfileBar } from "./ProfileBar";
import { SaveStatus } from "./SaveStatus";
import { ScenarioMenu } from "./ScenarioMenu";

export function AppHeader({
  onRetry,
  onSample,
  onBlank,
  onAdv,
}: {
  onRetry: () => void;
  onSample: () => void;
  onBlank: () => void;
  onAdv: () => void;
}) {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();

  return (
    <header className="border-b border-(--border)">
      <div className="flex items-center gap-x-3 gap-y-1 flex-wrap px-3 py-1.5">
        <label className="flex items-center gap-1 text-[11px] opacity-60 min-w-0">
          ファイル名
          <Input
            aria-label="ファイル名"
            title={state.scenarioName}
            className="w-32 sm:w-44 min-w-0 py-0.5 text-xs"
            value={state.scenarioName}
            onChange={(e) => dispatch({ type: "SET_SCENARIO_NAME", name: e.target.value })}
          />
        </label>

        <ProfileBar />

        <span className="text-[10px] opacity-40 border border-(--border) rounded px-1.5 py-0.5 shrink-0">
          単位: 万円
        </span>

        <label
          className="flex items-center gap-1 text-[10px] opacity-50 shrink-0"
          title="現金が足りないとき、NISAなどの資産を売却して補います"
        >
          <input
            type="checkbox"
            className="accent-(--terra)"
            checked={state.autoDrawdown}
            onChange={(e) => dispatch({ type: "SET_AUTO_DRAWDOWN", value: e.target.checked })}
          />
          自動取り崩し
        </label>

        <div className="ml-auto flex items-center gap-2">
          <SaveStatus onRetry={onRetry} />
          <ScenarioMenu onSample={onSample} onBlank={onBlank} onAdv={onAdv} />
        </div>
      </div>
    </header>
  );
}
