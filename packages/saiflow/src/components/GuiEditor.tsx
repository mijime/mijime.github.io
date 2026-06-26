import { useCallback, useEffect, useRef, useState } from "react";
import { useSaiflowDispatch, useSaiflowState } from "../store";
import { scenariosToDsl } from "../dslgen";
import { simulate } from "../simulator";
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

  const events = scenario.events;

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
                    {event.startYear}年{event.endYear !== null ? ` → ${event.endYear}年` : " →"}
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

function calcMortgage(principal: number, annualRate: number, years: number) {
  if (principal <= 0 || annualRate < 0 || years <= 0) return null;
  const r = annualRate / 100;
  if (r === 0) {
    return {
      monthly: Math.round(principal / (years * 12)),
      annual: Math.round(principal / years),
      total: principal,
    };
  }
  const factor = Math.pow(1 + r, years);
  const annual = (principal * r * Math.pow(1 + r, years - 1)) / (factor - 1);
  return {
    monthly: Math.round(annual / 12),
    annual: Math.round(annual),
    total: Math.round(annual * years),
  };
}

type Pattern = "simple" | "mortgage" | "assets" | "invest" | "child";

const PATTERNS: { id: Pattern; label: string; desc: string }[] = [
  { id: "simple", label: "シンプル", desc: "自由にイベントを定義" },
  { id: "mortgage", label: "住宅ローン", desc: "借入・返済・金利を自動生成" },
  { id: "assets", label: "初期資産", desc: "開始時の資産残高を設定" },
  { id: "invest", label: "投資", desc: "積立＋運用を自動生成" },
  { id: "child", label: "子供", desc: "教育費をライフステージ別に生成" },
];

function AddEventModal({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [pattern, setPattern] = useState<Pattern | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-[340px] max-h-[80vh] flex flex-col bg-(--paper) border border-(--border) rounded shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-(--border)">
          {pattern && (
            <button
              className="text-xs opacity-40 hover:opacity-100 shrink-0"
              onClick={() => setPattern(null)}
            >
              ← 戻る
            </button>
          )}
          <span className="text-sm font-medium">
            {pattern ? PATTERNS.find((p) => p.id === pattern)!.label : "イベント追加"}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {pattern === null ? (
            <div className="grid grid-cols-2 gap-2">
              {PATTERNS.map((p) => (
                <button
                  key={p.id}
                  className="p-3 text-left border border-(--border) rounded hover:bg-(--grid)/50 transition-colors"
                  onClick={() => setPattern(p.id)}
                >
                  <div className="text-xs font-medium">{p.label}</div>
                  <div className="text-[10px] opacity-40 mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>
          ) : pattern === "simple" ? (
            <SimpleForm currentAge={currentAge} onSave={onSave} onClose={onClose} />
          ) : pattern === "mortgage" ? (
            <MortgageForm currentAge={currentAge} onSave={onSave} onClose={onClose} />
          ) : pattern === "assets" ? (
            <AssetsForm onSave={onSave} onClose={onClose} currentAge={currentAge} />
          ) : pattern === "invest" ? (
            <InvestForm currentAge={currentAge} onSave={onSave} onClose={onClose} />
          ) : (
            <ChildForm currentAge={currentAge} onSave={onSave} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleForm({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [event, setEvent] = useState<Event>({
    name: "",
    startYear: 0,
    endYear: null,
    ops: [],
  });

  return (
    <div className="space-y-2">
      <EventForm
        event={event}
        currentAge={currentAge}
        onChange={setEvent}
        onDelete={onClose}
        hideDelete
      />
      <div className="flex gap-2 justify-end pt-2">
        <button
          className="px-3 py-1 text-xs opacity-40 hover:opacity-100 border border-(--border) rounded"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          className="px-3 py-1 text-xs bg-(--terra) text-white rounded"
          onClick={() => onSave([event])}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function MortgageForm({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [propertyPrice, setPropertyPrice] = useState(0);
  const [downPayment, setDownPayment] = useState(0);
  const [interestRate, setInterestRate] = useState(2);
  const [years, setYears] = useState(35);
  const [startYear, setStartYear] = useState(0);
  const [yearMode, setYearMode] = useState<"offset" | "age">("offset");

  const toDisplay = (v: number) => (yearMode === "age" ? v + currentAge : v);
  const fromDisplay = (v: number) => (yearMode === "age" ? v - currentAge : v);

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const result = calcMortgage(loanAmount, interestRate, years);

  const handleSave = () => {
    if (propertyPrice <= 0) return;
    const multiplier = 1 + interestRate / 100;
    const annualPayment = result?.annual ?? 0;
    const events: Event[] = [];
    if (downPayment > 0) {
      events.push({
        name: "頭金",
        startYear,
        endYear: startYear,
        ops: [{ asset: "現金", op: "-" as const, value: downPayment }],
      });
    }
    if (loanAmount > 0) {
      events.push({
        name: "借入実行",
        startYear,
        endYear: startYear,
        ops: [{ asset: "借入", op: "-" as const, value: loanAmount }],
      });
      events.push({
        name: "借入返済",
        startYear,
        endYear: startYear + years - 1,
        ops: [{ asset: "借入", op: "+" as const, value: annualPayment }],
      });
      events.push({
        name: "借入金利",
        startYear,
        endYear: startYear + years - 1,
        ops: [{ asset: "借入", op: "*" as const, value: multiplier }],
      });
    }
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">物件価格</label>
        <input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={propertyPrice || ""}
          onChange={(e) => setPropertyPrice(Number(e.target.value))}
        />
      </div>

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">頭金</label>
        <input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={downPayment || ""}
          onChange={(e) => setDownPayment(Number(e.target.value))}
        />
      </div>

      {propertyPrice > 0 && (
        <div className="flex justify-between text-[11px] px-1">
          <span className="opacity-40">借入額</span>
          <span className="tabular-nums">
            {loanAmount > 0 ? (
              `¥${fmt(loanAmount)}`
            ) : (
              <span className="text-red-400">頭金が物件価格を超えています</span>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">金利</label>
        <input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={interestRate}
          step="0.1"
          onChange={(e) => setInterestRate(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">%</span>
      </div>

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">返済年数</label>
        <input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={years}
          onChange={(e) => setYears(Number(e.target.value) || 1)}
        />
        <span className="text-[11px] opacity-30">年</span>
      </div>

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">開始</label>
        <select
          className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
          value={yearMode}
          onChange={(e) => setYearMode(e.target.value as "offset" | "age")}
        >
          <option value="offset">年数</option>
          <option value="age">年齢</option>
        </select>
        <input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={toDisplay(startYear)}
          onChange={(e) => setStartYear(fromDisplay(Number(e.target.value) || 0))}
        />
      </div>

      {result && loanAmount > 0 && (
        <div className="border-t border-(--border) pt-2 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="opacity-40">月々の返済額</span>
            <span className="tabular-nums font-medium">¥{fmt(result.monthly)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="opacity-40">年間返済額</span>
            <span className="tabular-nums font-medium">¥{fmt(result.annual)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="opacity-40">総返済額</span>
            <span className="tabular-nums">¥{fmt(result.total)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button
          className="px-3 py-1 text-xs opacity-40 hover:opacity-100 border border-(--border) rounded"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          className="px-3 py-1 text-xs bg-(--terra) text-white rounded disabled:opacity-30"
          disabled={propertyPrice <= 0}
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function YearInput({
  value,
  onChange,
  currentAge,
}: {
  value: number;
  onChange: (v: number) => void;
  currentAge: number;
}) {
  const [mode, setMode] = useState<"offset" | "age">("offset");
  const display = mode === "age" ? value + currentAge : value;
  return (
    <div className="flex gap-1 items-center">
      <select
        className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
        value={mode}
        onChange={(e) => setMode(e.target.value as "offset" | "age")}
      >
        <option value="offset">年数</option>
        <option value="age">年齢</option>
      </select>
      <input
        type="number"
        className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
        value={display}
        onChange={(e) =>
          onChange(mode === "age" ? Number(e.target.value) - currentAge : Number(e.target.value))
        }
      />
    </div>
  );
}

function AssetsForm({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [asset, setAsset] = useState("");
  const [amount, setAmount] = useState(0);
  const [startYear, setStartYear] = useState(0);

  const handleSave = () => {
    if (!asset.trim() || amount <= 0) return;
    onSave([
      {
        name: `初期${asset}`,
        startYear,
        endYear: startYear,
        ops: [{ asset: asset.trim(), op: "+" as const, value: amount }],
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">資産名</label>
        <input
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="現金"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">初期金額</label>
        <input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">開始</label>
        <YearInput value={startYear} onChange={setStartYear} currentAge={currentAge} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button
          className="px-3 py-1 text-xs opacity-40 hover:opacity-100 border border-(--border) rounded"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          className="px-3 py-1 text-xs bg-(--terra) text-white rounded disabled:opacity-30"
          disabled={!asset.trim() || amount <= 0}
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function InvestForm({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [monthlyAmount, setMonthlyAmount] = useState(0);
  const [annualReturn, setAnnualReturn] = useState(3);
  const [startYear, setStartYear] = useState(0);
  const [endYear, setEndYear] = useState<number | null>(20);

  const annualAmount = monthlyAmount * 12;
  const multiplier = 1 + annualReturn / 100;

  const handleSave = () => {
    if (!name.trim() || monthlyAmount <= 0) return;
    const events: Event[] = [
      {
        name: `${name}積立`,
        startYear,
        endYear,
        ops: [
          { asset: "現金", op: "-" as const, value: annualAmount },
          { asset: name, op: "+" as const, value: annualAmount },
        ],
      },
      {
        name: `${name}運用`,
        startYear,
        endYear: null,
        ops: [{ asset: name, op: "*" as const, value: multiplier }],
      },
    ];
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">名称</label>
        <input
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="NISA"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">月額積立</label>
        <input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={monthlyAmount || ""}
          onChange={(e) => setMonthlyAmount(Number(e.target.value))}
        />
      </div>
      <div className="flex justify-between text-[11px] px-1">
        <span className="opacity-40">年間積立額</span>
        <span className="tabular-nums">¥{fmt(annualAmount)}</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">年利</label>
        <input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={annualReturn}
          step="0.1"
          onChange={(e) => setAnnualReturn(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">%</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">積立期間</label>
        <span className="text-[11px] opacity-30">開始</span>
        <YearInput value={startYear} onChange={setStartYear} currentAge={currentAge} />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14" />
        <span className="text-[11px] opacity-30">終了</span>
        <YearInput value={endYear ?? 0} onChange={(v) => setEndYear(v)} currentAge={currentAge} />
        <button
          className="text-[10px] opacity-30 hover:opacity-100"
          onClick={() => setEndYear(null)}
        >
          指定なし
        </button>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button
          className="px-3 py-1 text-xs opacity-40 hover:opacity-100 border border-(--border) rounded"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          className="px-3 py-1 text-xs bg-(--terra) text-white rounded disabled:opacity-30"
          disabled={!name.trim() || monthlyAmount <= 0}
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function ChildForm({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [childName, setChildName] = useState("子");
  const [birthYear, setBirthYear] = useState(2);
  const [kindergarten, setKindergarten] = useState(0);
  const [elementary, setElementary] = useState(0);
  const [juniorHigh, setJuniorHigh] = useState(0);
  const [highSchool, setHighSchool] = useState(0);
  const [university, setUniversity] = useState(0);

  const handleSave = () => {
    if (!childName.trim()) return;
    const events: Event[] = [];
    const add = (label: string, start: number, end: number | null, cost: number) => {
      if (cost > 0) {
        events.push({
          name: `${label}(${childName})`,
          startYear: birthYear + start,
          endYear: end !== null ? birthYear + end : null,
          ops: [{ asset: "現金", op: "-" as const, value: cost }],
        });
      }
    };
    add("教育費幼稚園", 0, 2, kindergarten); // 3年: birth+0 ~ birth+2
    add("教育費小学校", 3, 8, elementary); // 6年: birth+3 ~ birth+8
    add("教育費中学校", 9, 11, juniorHigh); // 3年
    add("教育費高校", 12, 14, highSchool); // 3年
    add("教育費大学", 15, 18, university); // 4年
    if (events.length === 0) return;
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">名前</label>
        <input
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="子1"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">誕生</label>
        <YearInput value={birthYear} onChange={setBirthYear} currentAge={currentAge} />
        <span className="text-[11px] opacity-30">後</span>
      </div>
      <div className="border-t border-(--border) pt-2 space-y-2">
        {(
          [
            ["幼稚園", kindergarten, setKindergarten, "3年間"],
            ["小学校", elementary, setElementary, "6年間"],
            ["中学校", juniorHigh, setJuniorHigh, "3年間"],
            ["高校", highSchool, setHighSchool, "3年間"],
            ["大学", university, setUniversity, "4年間"],
          ] as const
        ).map(([label, value, setter, period]) => (
          <div key={label} className="flex gap-1.5 items-center">
            <label className="text-[11px] opacity-40 shrink-0 w-14">{label}</label>
            <input
              type="number"
              className="w-20 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
              placeholder="年額"
              value={value || ""}
              onChange={(e) => setter(Number(e.target.value))}
            />
            <span className="text-[10px] opacity-30">{period}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <button
          className="px-3 py-1 text-xs opacity-40 hover:opacity-100 border border-(--border) rounded"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          className="px-3 py-1 text-xs bg-(--terra) text-white rounded disabled:opacity-30"
          disabled={!childName.trim()}
          onClick={handleSave}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function EventForm({
  event,
  onChange,
  onDelete,
  currentAge,
  hideDelete,
}: {
  event: Event;
  onChange: (e: Event) => void;
  onDelete: () => void;
  currentAge: number;
  hideDelete?: boolean;
}) {
  const [yearMode, setYearMode] = useState<"offset" | "age">("offset");

  const toDisplay = (v: number) => (yearMode === "age" ? v + currentAge : v);
  const fromDisplay = (v: number) => (yearMode === "age" ? v - currentAge : v);

  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0">名称</label>
        <input
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="イベント名"
          value={event.name}
          onChange={(e) => onChange({ ...event, name: e.target.value })}
        />
      </div>

      <div className="flex gap-1 items-center">
        <label className="text-[11px] opacity-40 shrink-0">期間</label>
        <select
          className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
          value={yearMode}
          onChange={(e) => setYearMode(e.target.value as "offset" | "age")}
        >
          <option value="offset">年数</option>
          <option value="age">年齢</option>
        </select>
        <input
          type="number"
          className="w-14 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={toDisplay(event.startYear)}
          onChange={(e) =>
            onChange({ ...event, startYear: fromDisplay(Number(e.target.value) || 0) })
          }
        />
        <span className="text-[11px] opacity-30">→</span>
        <input
          type="number"
          className="w-14 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          placeholder={yearMode === "age" ? "年齢" : "終了"}
          value={event.endYear !== null ? toDisplay(event.endYear) : ""}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...event,
              endYear: v === "" ? null : fromDisplay(Number(v) || 0),
            });
          }}
        />
        {event.endYear !== null && event.endYear < event.startYear && (
          <span className="text-[10px] text-red-400">終了 &lt; 開始</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] opacity-40">操作</span>
          <button
            className="text-[11px] opacity-30 hover:opacity-100 transition-opacity"
            onClick={() =>
              onChange({ ...event, ops: [...event.ops, { asset: "", op: "+", value: 0 }] })
            }
          >
            + 追加
          </button>
        </div>
        {event.ops.length === 0 && (
          <p className="text-[11px] opacity-20 py-1">
            操作がありません。「+ 追加」で追加してください
          </p>
        )}
        {event.ops.map((op, i) => (
          <OpRow
            key={i}
            op={op}
            onChange={(nextOp) => {
              const next = [...event.ops];
              next[i] = nextOp;
              onChange({ ...event, ops: next });
            }}
            onDelete={() => onChange({ ...event, ops: event.ops.filter((_, j) => j !== i) })}
          />
        ))}
      </div>

      {!hideDelete && (
        <button
          className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
          onClick={onDelete}
        >
          イベントを削除
        </button>
      )}
    </div>
  );
}

function OpRow({
  op,
  onChange,
  onDelete,
}: {
  op: AssetOp;
  onChange: (op: AssetOp) => void;
  onDelete: () => void;
}) {
  const [unit, setUnit] = useState<"year" | "month">("year");

  const displayValue = unit === "month" ? Math.round(op.value / 12) : op.value;
  const saveValue = (v: number) => (unit === "month" ? Math.round(v * 12) : v);

  return (
    <div className="flex gap-1 items-center">
      <input
        className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
        placeholder="資産名"
        value={op.asset}
        onChange={(e) => onChange({ ...op, asset: e.target.value })}
      />
      <select
        className={`w-9 px-0.5 py-1 text-xs rounded border border-(--border) outline-none cursor-pointer tabular-nums ${OP_COLORS[op.op]}`}
        value={op.op}
        onChange={(e) => onChange({ ...op, op: e.target.value as "+" | "-" | "*" })}
      >
        <option value="+">+</option>
        <option value="-">−</option>
        <option value="*">×</option>
      </select>
      <input
        type="number"
        className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
        placeholder={unit === "month" ? "月額" : "年額"}
        value={displayValue || ""}
        onChange={(e) => onChange({ ...op, value: saveValue(Number(e.target.value)) })}
      />
      <select
        className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-0.5 py-0.5 outline-none cursor-pointer tabular-nums"
        value={unit}
        onChange={(e) => setUnit(e.target.value as "year" | "month")}
      >
        <option value="year">年</option>
        <option value="month">月</option>
      </select>
      <button
        className="w-5 h-5 flex items-center justify-center text-xs text-red-400/60 hover:text-red-400 shrink-0 rounded hover:bg-red-500/5 transition-colors"
        aria-label="操作を削除"
        onClick={onDelete}
      >
        ×
      </button>
    </div>
  );
}
