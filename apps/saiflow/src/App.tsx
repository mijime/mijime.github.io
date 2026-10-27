import { useCallback, useEffect, useState } from "react";
import { Button, IconButton, SegmentedControl } from "@mijime/theme/ui";
import { ChevronRight } from "lucide-react";
import { SaiflowProvider, useSaiflowDispatch, useSaiflowState, type State } from "./store";
import { AppHeader } from "./components/AppHeader";
import { Onboarding } from "./components/Onboarding";
import { EditorPanel } from "./components/EditorPanel";
import { SummaryTable } from "./components/SummaryTable";
import { CategoryChart } from "./components/CategoryChart";
import { BarChart } from "./components/BarChart";
import { LineChart } from "./components/LineChart";
import { AdvicePanel } from "./components/AdvicePanel";
import { RiskPanel } from "./components/RiskPanel";
import { listScenarios } from "./storage";
import { buildScenarioState, hydrateFromDsl } from "./hydrate";
import { useAutoSave } from "./useAutoSave";
import { useDslSync } from "./useDslSync";
import sampleDsl from "./data/sample.txt?raw";

type ViewMode = "table" | "category-chart" | "line" | "bar" | "advice" | "risk";

const VIEWS: [ViewMode, string][] = [
  ["table", "収支表"],
  ["category-chart", "内訳グラフ"],
  ["line", "資産推移"],
  ["bar", "収支比較"],
  ["advice", "アドバイス"],
  ["risk", "リスク"],
];

function RightPanel({ onSample }: { onSample: () => void }) {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const [view, setView] = useState<ViewMode>("table");

  const errors = state.parsed && "errors" in state.parsed ? state.parsed.errors : null;
  const activeScenario = state.scenarios[state.activeScenarioIndex];
  const hasEvents = (activeScenario?.events.length ?? 0) > 0;
  const hasRows = (state.rows?.length ?? 0) > 0;

  const events = activeScenario?.events ?? [];
  const maxEventAge = events.reduce((max, e) => Math.max(max, e.endAge ?? e.startAge), -Infinity);
  const hasOngoingOrFuture = events.some((e) => e.endAge === null || e.endAge >= state.currentAge);
  const looksLikeOffsetData = hasEvents && maxEventAge < state.currentAge && !hasOngoingOrFuture;

  const restoreLastValid = () => {
    if (!state.lastValidDsl) return;
    hydrateFromDsl(dispatch, state.lastValidDsl, {
      name: state.scenarioName,
      currentAge: state.currentAge,
      simulationYears: state.simulationYears,
      scenarioId: state.scenarioId,
      started: true,
      activeTab: "dsl",
      activeScenarioIndex: state.activeScenarioIndex,
    });
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center gap-2 px-2 py-1 border-b border-(--border) flex-wrap">
        <SegmentedControl
          ariaLabel="表示"
          options={VIEWS.map(([value, label]) => ({ value, label }))}
          value={view}
          onChange={setView}
        />
        <span className="ml-auto text-[10px] opacity-30" title="借入・積立・運用益は含みません">
          単位: 万円 / 現金収支
        </span>
      </div>

      {looksLikeOffsetData && (
        <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-(--border) bg-yellow-500/5 text-xs">
          <span className="text-yellow-600 dark:text-yellow-500">
            イベントの年齢がすべて現在年齢より前です
          </span>
          <span className="opacity-50">
            以前のデータは「0＝現在」の年数で保存されている可能性があります。
          </span>
          <Button
            variant="secondary"
            size="sm"
            className="ml-auto"
            onClick={() => dispatch({ type: "SET_TAB", tab: "dsl" })}
          >
            DSLを確認
          </Button>
        </div>
      )}

      {errors && (
        <div className="px-3 py-2 border-b border-(--border) bg-red-500/5 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-red-500 font-medium">DSLにエラーがあります</span>
            <span className="opacity-40">
              {hasRows ? "表示は最終正常値です" : "修正すると結果が表示されます"}
            </span>
            {state.lastValidDsl && (
              <Button variant="secondary" size="sm" className="ml-auto" onClick={restoreLastValid}>
                最後の正常なDSLに戻す
              </Button>
            )}
          </div>
          <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
            {errors.slice(0, 5).map((e, i) => {
              const source = state.dslText.split("\n")[e.line - 1] ?? "";
              return (
                <div key={i} className="flex gap-2 min-w-0">
                  <span className="text-red-500 shrink-0 tabular-nums">L{e.line}</span>
                  <span className="opacity-60 shrink-0">{e.message}</span>
                  {source && <code className="opacity-40 truncate font-mono">{source.trim()}</code>}
                </div>
              );
            })}
            {errors.length > 5 && <div className="opacity-40">ほか {errors.length - 5} 件</div>}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {!hasRows ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
            <p className="text-sm opacity-50">
              {errors ? "エラーを修正すると結果が表示されます" : "まだイベントがありません"}
            </p>
            {!errors && (
              <>
                <p className="text-xs opacity-35">
                  エディタでイベントを追加するか、サンプルを読み込んでください
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={onSample}>
                    サンプルを読み込む
                  </Button>
                  {state.lastValidDsl && (
                    <Button variant="secondary" size="sm" onClick={restoreLastValid}>
                      直前の内容に戻す
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : !hasEvents ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="text-sm opacity-50">このシナリオにはイベントがありません</p>
            <p className="text-xs opacity-35">「+ イベントを追加」から始めてください</p>
          </div>
        ) : view === "table" ? (
          <SummaryTable />
        ) : view === "category-chart" ? (
          <CategoryChart />
        ) : view === "line" ? (
          <LineChart />
        ) : view === "bar" ? (
          <BarChart />
        ) : view === "advice" ? (
          <AdvicePanel />
        ) : (
          <RiskPanel />
        )}
      </div>
    </div>
  );
}

function MainLayout() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const { retry } = useAutoSave();
  useDslSync();
  const [mobilePane, setMobilePane] = useState<"editor" | "result">("result");

  const showEditor = () => {
    if (!state.sidebarOpen) dispatch({ type: "TOGGLE_SIDEBAR" });
    setMobilePane("editor");
  };

  const startWith = useCallback(
    (text: string, name: string) => {
      hydrateFromDsl(dispatch, text, {
        name,
        currentAge: state.currentAge,
        simulationYears: state.simulationYears,
        scenarioId: null,
        started: true,
        activeTab: "gui",
      });
    },
    [dispatch, state.currentAge, state.simulationYears],
  );

  const startWithSample = useCallback(() => {
    startWith(sampleDsl, "サンプル: 現状維持と早期リタイア");
  }, [startWith]);

  const startWithBlank = useCallback(() => {
    startWith("# 新しいシナリオ\n", "新しいシナリオ");
  }, [startWith]);

  const startWithAdv = useCallback(() => {
    setMobilePane("editor");
    hydrateFromDsl(dispatch, "# ADVプラン\n", {
      name: "ADVプラン",
      currentAge: state.currentAge,
      simulationYears: state.simulationYears,
      scenarioId: null,
      started: true,
      activeTab: "adv",
    });
  }, [dispatch, state.currentAge, state.simulationYears]);

  if (!state.started) {
    return <Onboarding onSample={startWithSample} onBlank={startWithBlank} onAdv={startWithAdv} />;
  }

  return (
    <div className="h-full flex flex-col">
      <AppHeader
        onRetry={retry}
        onSample={startWithSample}
        onBlank={startWithBlank}
        onAdv={startWithAdv}
      />
      <div className="flex md:hidden border-b border-(--border) p-1">
        <SegmentedControl
          ariaLabel="表示"
          value={mobilePane}
          onChange={(pane) => {
            if (pane === "editor") showEditor();
            else setMobilePane("result");
          }}
          options={[
            { value: "editor", label: "編集" },
            { value: "result", label: "結果" },
          ]}
        />
      </div>
      <div className="flex-1 overflow-auto flex">
        {state.sidebarOpen && (
          <div
            className={`w-full md:w-96 md:flex-shrink-0 border-r border-(--border) ${
              mobilePane === "result" ? "hidden md:block" : ""
            }`}
          >
            <EditorPanel onStartAdv={startWithAdv} />
          </div>
        )}
        {!state.sidebarOpen && (
          <IconButton
            label="エディタを開く"
            size="icon-sm"
            className="hidden md:inline-flex"
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
          >
            <ChevronRight size={12} />
          </IconButton>
        )}
        <div className={`flex-1 min-w-0 ${mobilePane === "editor" ? "hidden md:block" : ""}`}>
          <RightPanel onSample={startWithSample} />
        </div>
      </div>
    </div>
  );
}

type InitState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; state: Partial<State> };

export function App() {
  const [init, setInit] = useState<InitState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setInit({ status: "loading" });

    listScenarios()
      .then((scenarios) => {
        if (cancelled) return;
        if (scenarios.length === 0) {
          setInit({ status: "ready", state: { started: false } });
          return;
        }
        const [latest] = scenarios;
        setInit({
          status: "ready",
          state: buildScenarioState(latest.dslText, {
            name: latest.name,
            currentAge: latest.currentAge,
            simulationYears: latest.simulationYears,
            scenarioId: latest.id ?? null,
            started: true,
            fromStorage: true,
          }),
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setInit({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (init.status === "loading") {
    return (
      <div className="h-full flex items-center justify-center">
        <span className="text-xs opacity-40">読み込み中…</span>
      </div>
    );
  }

  if (init.status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm">保存データを読み込めませんでした</p>
        <p className="text-xs opacity-40 max-w-md break-words">{init.message}</p>
        <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>
          再試行
        </Button>
      </div>
    );
  }

  return (
    <SaiflowProvider state={init.state}>
      <MainLayout />
    </SaiflowProvider>
  );
}
