import { useCallback, useEffect, useRef, useState } from "react";
import { useSaiflowDispatch, useSaiflowState } from "../store";
import { scenariosToDsl } from "../dslgen";
import { simulate } from "../simulator";
import { AddEventModal, EventForm } from "./AddEventModal";
import type { AssetOp, Event, Scenario } from "../types";

const OP_COLORS: Record<string, string> = {
  "+": "bg-green-500/10 text-green-700 dark:text-green-400",
  "-": "bg-red-500/10 text-red-600 dark:text-red-400",
  "*": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

const OP_BORDER: Record<string, string> = {
  "+": "border-l-green-500/40",
  "-": "border-l-red-500/40",
  "*": "border-l-blue-500/40",
};

function primaryOp(ops: AssetOp[]): AssetOp | null {
  const minus = ops.find((o) => o.op === "-");
  if (minus) return minus;
  return ops[0] ?? null;
}

function fmt(n: number): string {
  return n.toLocaleString("ja-JP");
}

export function GuiEditor() {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (state.scenarios.length > 0) {
      setScenarios(structuredClone(state.scenarios));
    } else {
      setScenarios([{ name: "デフォルト", events: [] }]);
    }
  }, []);

  const sync = useCallback(
    (s: Scenario[]) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        const st = stateRef.current;
        dispatch({ type: "SET_DSL", text: scenariosToDsl(s) });
        const idx = Math.min(st.activeScenarioIndex, s.length - 1);
        dispatch({ type: "SET_SCENARIOS", scenarios: s });
        dispatch({ type: "SET_ACTIVE_SCENARIO", index: idx });
        const scenario = s[idx];
        if (scenario) {
          dispatch({
            type: "SET_PARSED",
            parsed: {
              config: { currentAge: st.currentAge, simulationYears: st.simulationYears, scenario },
            },
          });
          const rows = simulate({
            currentAge: st.currentAge,
            simulationYears: st.simulationYears,
            scenario,
          });
          dispatch({ type: "SET_ROWS", rows });
        }
      }, 300);
    },
    [dispatch],
  );

  const update = useCallback(
    (fn: (prev: Scenario[]) => Scenario[]) => {
      setScenarios((prev) => {
        const next = fn(prev);
        sync(next);
        return next;
      });
    },
    [sync],
  );

  const addEvents = useCallback(
    (newEvents: Event[]) => {
      update((prev) =>
        prev.map((s, i) =>
          i === state.activeScenarioIndex ? { ...s, events: [...newEvents, ...s.events] } : s,
        ),
      );
      setExpandedIdx(0);
      setModalOpen(false);
    },
    [update, state.activeScenarioIndex],
  );

  useEffect(() => {
    const scenario = scenarios[state.activeScenarioIndex];
    if (!scenario) return;
    dispatch({
      type: "SET_PARSED",
      parsed: {
        config: { currentAge: state.currentAge, simulationYears: state.simulationYears, scenario },
      },
    });
    const rows = simulate({
      currentAge: state.currentAge,
      simulationYears: state.simulationYears,
      scenario,
    });
    dispatch({ type: "SET_ROWS", rows });
  }, [state.currentAge, state.simulationYears, state.activeScenarioIndex]);

  const scenario = scenarios[state.activeScenarioIndex];
  if (!scenario) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-6">
        <p className="text-sm text-(--ink) opacity-40">シナリオがありません</p>
        <button
          className="px-3 py-1.5 text-xs border border-(--border) rounded hover:bg-(--mid)"
          onClick={() => {
            setScenarios([{ name: "デフォルト", events: [] }]);
            sync([{ name: "デフォルト", events: [] }]);
          }}
        >
          シナリオを作成
        </button>
      </div>
    );
  }

  const { events } = scenario;

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-(--border)">
        <div className="flex items-center gap-2">
          <input
            className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none placeholder:text-(--ink)/25"
            placeholder="シナリオ名"
            value={scenario.name}
            onChange={(e) =>
              update((prev) =>
                prev.map((s, i) =>
                  i === state.activeScenarioIndex ? { ...s, name: e.target.value } : s,
                ),
              )
            }
          />
          <span className="text-xs text-(--ink) opacity-30 tabular-nums shrink-0">
            {state.activeScenarioIndex + 1}/{scenarios.length}
          </span>
        </div>
        <div className="flex gap-1 mt-1.5">
          <button
            className="text-xs opacity-40 hover:opacity-100 transition-opacity"
            onClick={() =>
              update((prev) => [...prev, { name: `シナリオ${prev.length + 1}`, events: [] }])
            }
          >
            + 新規シナリオ
          </button>
          {scenarios.length > 1 && (
            <button
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors ml-auto"
              onClick={() => {
                const idx = state.activeScenarioIndex;
                update((prev) => prev.filter((_, i) => i !== idx));
                dispatch({ type: "SET_ACTIVE_SCENARIO", index: Math.max(0, idx - 1) });
              }}
            >
              シナリオを削除
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-2 py-1.5">
          <button
            className="w-full py-1.5 text-xs opacity-40 hover:opacity-100 border border-dashed border-(--border) rounded transition-opacity"
            onClick={() => setModalOpen(true)}
          >
            + イベントを追加
          </button>
        </div>
        {events.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs text-(--ink) opacity-30">イベントがありません</p>
          </div>
        ) : (
          events.map((event, idx) => {
            const prim = primaryOp(event.ops);
            const borderClass = prim ? OP_BORDER[prim.op] : "border-l-transparent";
            const isExpanded = expandedIdx === idx;

            return (
              <div
                key={idx}
                className={`border-l-2 ${borderClass} border-b border-(--border) ${
                  isExpanded ? "bg-(--grid)/50" : ""
                }`}
              >
                <button
                  className="w-full px-3 py-2 text-left text-xs flex items-center gap-2 hover:bg-(--mid)/20 transition-colors"
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                >
                  <span className="opacity-30 w-3 shrink-0 text-[10px]">
                    {isExpanded ? "▼" : "▶"}
                  </span>
                  <span className="flex-1 min-w-0 truncate font-medium">
                    {event.name || <span className="opacity-25 italic">名称なし</span>}
                  </span>
                  <span className="opacity-50 shrink-0 tabular-nums text-[11px]">
                    {event.startYear}年{event.endYear === null ? " →" : ` → ${event.endYear}年`}
                  </span>
                  {event.ops.length > 0 && (
                    <span className="flex gap-0.5 shrink-0 max-w-[120px] overflow-hidden">
                      {event.ops.slice(0, 3).map((op, i) => (
                        <span
                          key={i}
                          className={`px-1 py-px rounded text-[10px] tabular-nums leading-snug truncate ${OP_COLORS[op.op]}`}
                        >
                          {op.asset}&nbsp;{op.op}&nbsp;{fmt(op.value)}
                        </span>
                      ))}
                      {event.ops.length > 3 && (
                        <span className="text-[10px] opacity-30 shrink-0 self-center">
                          +{event.ops.length - 3}
                        </span>
                      )}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <EventForm
                    event={event}
                    currentAge={state.currentAge}
                    onChange={(e) =>
                      update((prev) =>
                        prev.map((s, i) =>
                          i === state.activeScenarioIndex
                            ? { ...s, events: s.events.map((ev, j) => (j === idx ? e : ev)) }
                            : s,
                        ),
                      )
                    }
                    onDelete={() => {
                      update((prev) =>
                        prev.map((s, i) =>
                          i === state.activeScenarioIndex
                            ? { ...s, events: s.events.filter((_, j) => j !== idx) }
                            : s,
                        ),
                      );
                      setExpandedIdx(null);
                    }}
                  />
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-(--border)">
        <button
          className="w-full py-1.5 text-xs opacity-40 hover:opacity-100 border border-dashed border-(--border) rounded transition-opacity"
          onClick={() => setModalOpen(true)}
        >
          + イベントを追加
        </button>
      </div>
      {modalOpen && (
        <AddEventModal
          currentAge={state.currentAge}
          onSave={addEvents}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
