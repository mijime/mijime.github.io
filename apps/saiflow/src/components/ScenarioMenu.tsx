import { useCallback, useEffect, useState } from "react";
import { Button, Modal } from "@mijime/theme/ui";
import { hydrateFromDsl } from "../hydrate";
import { parseDSL } from "../parser";
import { deleteScenario, listScenarios, type Scenario as SavedScenario } from "../storage";
import { useSaiflowDispatch, useSaiflowState } from "../store";

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ScenarioMenu({
  onSample,
  onBlank,
  onAdv,
}: {
  onSample: () => void;
  onBlank: () => void;
  onAdv?: () => void;
}) {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SavedScenario[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setItems(await listScenarios());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setItems(null);
    void refresh();
  }, [open, refresh]);

  const confirmDiscard = () => {
    if (state.saveStatus !== "dirty" && state.saveStatus !== "saving") return true;
    return window.confirm("未保存の変更があります。破棄して続けますか？");
  };

  const openScenario = (scenario: SavedScenario) => {
    if (!confirmDiscard()) return;
    hydrateFromDsl(dispatch, scenario.dslText, {
      name: scenario.name,
      currentAge: scenario.currentAge,
      simulationYears: scenario.simulationYears,
      scenarioId: scenario.id ?? null,
      started: true,
      fromStorage: true,
    });
    setOpen(false);
  };

  const removeScenario = async (scenario: SavedScenario) => {
    if (scenario.id === undefined) return;
    if (!window.confirm(`「${scenario.name}」を削除しますか？`)) return;

    try {
      await deleteScenario(scenario.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return;
    }

    if (scenario.id === state.scenarioId) {
      const remaining = await listScenarios();
      if (remaining.length > 0) {
        const next = remaining[0];
        hydrateFromDsl(dispatch, next.dslText, {
          name: next.name,
          currentAge: next.currentAge,
          simulationYears: next.simulationYears,
          scenarioId: next.id ?? null,
          started: true,
          fromStorage: true,
        });
      } else {
        dispatch({
          type: "HYDRATE",
          patch: {
            started: false,
            dslText: "",
            lastValidDsl: "",
            scenarios: [],
            rows: null,
            parsed: null,
            scenarioId: null,
            scenarioName: "新規シナリオ",
            activeTab: "gui",
            saveStatus: "idle",
            lastSavedAt: null,
            saveError: null,
          },
        });
      }
      setOpen(false);
      return;
    }
    await refresh();
  };

  const startNew = (fn: () => void) => {
    if (!confirmDiscard()) return;
    fn();
    setOpen(false);
  };

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        保存一覧
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="保存した計画"
        size="md"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => startNew(onBlank)}>
              + 新規（空）
            </Button>
            <Button variant="secondary" size="sm" onClick={() => startNew(onSample)}>
              サンプルを読み込む
            </Button>
            {onAdv && (
              <Button variant="ghost" size="sm" onClick={() => startNew(onAdv)}>
                ADVで作る
              </Button>
            )}
          </div>
        }
      >
        {error && <p className="mb-2 text-xs text-(--danger)">{error}</p>}
        {items === null ? (
          <p className="py-4 text-center text-xs opacity-40">読み込み中…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-xs opacity-40">保存された計画はありません</p>
        ) : (
          <div className="space-y-1">
            {items.map((scenario) => {
              const blockCount = parseDSL(scenario.dslText).scenarios.length;
              const current = scenario.id === state.scenarioId;
              return (
                <div
                  key={scenario.id}
                  className="flex items-center gap-2 border-b border-(--border) py-2 last:border-b-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium truncate">
                      {scenario.name}
                      {current && <span className="ml-1 text-[10px] opacity-40">（編集中）</span>}
                    </div>
                    <div className="text-[10px] opacity-35 tabular-nums">
                      {formatDate(scenario.updatedAt)} ・ シナリオ {blockCount} 件
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={`${scenario.name}を開く`}
                    onClick={() => openScenario(scenario)}
                  >
                    開く
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    aria-label={`${scenario.name}を削除`}
                    onClick={() => void removeScenario(scenario)}
                  >
                    削除
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
