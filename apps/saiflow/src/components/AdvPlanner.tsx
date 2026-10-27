import { useState } from "react";
import { Badge, Button, Input } from "@mijime/theme/ui";
import type { Event } from "../types";
import { buildAdvice } from "../advice";
import { getDueDecision, getNextDecisionAge } from "../adv/decisions";
import {
  adjustBaseForHousing,
  adjustBaseForRetirement,
  buildAdvEvents,
  buildAdvExtras,
  buildAdvHousing,
  buildAdvInvestment,
  schoolCost,
} from "../adv/generator";
import {
  BUY_PRESETS,
  DEFAULT_PROFILE,
  INVESTMENT_PRESETS,
  MORTGAGE_RATE,
  MORTGAGE_YEARS,
  RETIREMENT_OPTIONS,
  SCHOOL_PRESETS,
} from "../adv/presets";
import {
  emptyAdvFlags,
  type AdvFlags,
  type AdvProfile,
  type SchoolStage,
  type SchoolType,
} from "../adv/types";
import { scenariosToDsl } from "../dslgen";
import { runSimulation, useSaiflowDispatch, useSaiflowState } from "../store";
import { fmt } from "../utils";

type Phase = "profile" | "story" | "done";

interface Snapshot {
  age: number;
  flags: AdvFlags;
  log: string[];
}

function NumberField({
  label,
  value,
  suffix,
  presets,
  onChange,
}: {
  label: string;
  value: number;
  suffix: string;
  presets: number[];
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] opacity-50">{label}</label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            aria-label={label}
            className="w-20 px-1.5 py-0.5 text-xs tabular-nums"
            value={value || ""}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <span className="text-[10px] opacity-35">{suffix}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <Button
            key={preset}
            variant={value === preset ? "secondary" : "ghost"}
            size="sm"
            className={value === preset ? "border-(--accent) text-(--accent)" : "opacity-60"}
            onClick={() => onChange(preset)}
          >
            {fmt(preset)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ChoiceButton({
  label,
  detail,
  onClick,
}: {
  label: string;
  detail?: string;
  onClick: () => void;
}) {
  return (
    <Button
      variant="secondary"
      className="h-auto w-full flex-col items-start gap-0.5 whitespace-normal p-3 text-left"
      onClick={onClick}
    >
      <span className="block text-xs font-medium">{label}</span>
      {detail && <span className="block text-[10px] opacity-40">{detail}</span>}
    </Button>
  );
}

export function AdvPlanner({
  onComplete,
  onStartNew,
}: {
  onComplete: () => void;
  onStartNew?: () => void;
}) {
  const state = useSaiflowState();
  const dispatch = useSaiflowDispatch();
  const startAge = state.currentAge;
  const endAge = Math.max(startAge, Math.min(65, startAge + state.simulationYears - 1));
  const scenario = state.scenarios[state.activeScenarioIndex];
  const hasExisting = (scenario?.events.length ?? 0) > 0;

  const [phase, setPhase] = useState<Phase>("profile");
  const [mode, setMode] = useState<"new" | "append">("new");
  const [appendBase, setAppendBase] = useState<Event[] | null>(null);
  const [profile, setProfile] = useState<AdvProfile>(DEFAULT_PROFILE);
  const [flags, setFlags] = useState<AdvFlags>(emptyAdvFlags);
  const [age, setAge] = useState(startAge);
  const [log, setLog] = useState<string[]>([]);
  const [history, setHistory] = useState<Snapshot[]>([]);

  const sync = (
    nextFlags: AdvFlags,
    syncMode: "new" | "append" = mode,
    base: Event[] | null = appendBase,
  ) => {
    const name = state.scenarioName || "ADVプラン";
    const planEndAge = state.currentAge + state.simulationYears - 1;

    let scenarios;
    let activeIndex;
    if (syncMode === "append" && base) {
      let adjustedBase = base;
      if (nextFlags.retirementAge !== undefined) {
        adjustedBase = adjustBaseForRetirement(adjustedBase, nextFlags.retirementAge);
      }
      if (nextFlags.housing?.type === "buy") {
        adjustedBase = adjustBaseForHousing(adjustedBase, startAge + 1);
      }
      const extras = [
        ...buildAdvExtras(nextFlags, startAge, planEndAge),
        ...buildAdvHousing(nextFlags.housing, startAge),
        ...buildAdvInvestment(nextFlags, startAge),
      ];
      scenarios = state.scenarios.map((item, index) =>
        index === state.activeScenarioIndex
          ? { ...item, events: [...adjustedBase, ...extras] }
          : item,
      );
      activeIndex = state.activeScenarioIndex;
    } else {
      const nextScenario = {
        name,
        events: buildAdvEvents(profile, nextFlags, startAge, planEndAge),
      };
      scenarios = [nextScenario];
      activeIndex = 0;
    }

    const activeScenario = scenarios[activeIndex];
    const dsl = scenariosToDsl(scenarios);
    dispatch({ type: "SET_SCENARIOS", scenarios });
    dispatch({ type: "SET_DSL", text: dsl });
    dispatch({ type: "SET_LAST_VALID_DSL", text: dsl });
    dispatch({ type: "SET_ACTIVE_SCENARIO", index: activeIndex });
    runSimulation(
      dispatch,
      state.currentAge,
      state.simulationYears,
      activeScenario,
      state.autoDrawdown,
      state.estimateTaxes,
    );
  };

  const begin = () => {
    const initial = emptyAdvFlags();
    setMode("new");
    setAppendBase(null);
    setFlags(initial);
    setAge(startAge);
    setLog([`${startAge}歳: プランを開始`]);
    setHistory([]);
    setPhase("story");
    sync(initial);
  };

  const reset = () => {
    setPhase("profile");
    setMode("new");
    setAppendBase(null);
    setProfile(DEFAULT_PROFILE);
    setFlags(emptyAdvFlags());
    setAge(startAge);
    setLog([]);
    setHistory([]);
  };

  const startAppend = () => {
    const base = scenario?.events ?? [];
    setMode("append");
    setAppendBase(base);
    setFlags(emptyAdvFlags());
    setAge(startAge);
    setLog([`${startAge}歳: 既存プランにイベントを追加`]);
    setHistory([]);
    setPhase("story");
    sync(emptyAdvFlags(), "append", base);
  };

  const apply = (nextFlags: AdvFlags, message: string) => {
    setHistory((items) => [...items, { age, flags, log }]);
    setFlags(nextFlags);
    const nextLog = [...log, `${age}歳: ${message}`];
    setLog(nextLog);
    sync(nextFlags);

    const nextDue = getDueDecision(startAge, endAge, age, nextFlags);
    if (!nextDue) {
      const nextAge = age + 1;
      if (nextAge > endAge) setPhase("done");
      else setAge(nextAge);
    }
  };

  const advance = (toNextDecision: boolean) => {
    setHistory((items) => [...items, { age, flags, log }]);
    let nextAge = age + 1;
    if (toNextDecision) {
      nextAge = getNextDecisionAge(startAge, endAge, age, flags) ?? endAge + 1;
    }
    if (nextAge > endAge) setPhase("done");
    else setAge(nextAge);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((items) => items.slice(0, -1));
    setAge(last.age);
    setFlags(last.flags);
    setLog(last.log);
    setPhase("story");
    sync(last.flags);
  };

  if (phase === "profile" && hasExisting) {
    return (
      <div className="p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">ADV入力</p>
          <p className="text-[11px] opacity-40 mt-1 leading-relaxed">
            このプランにはすでにイベントがあります。ADVは新しいプランを1年ずつ作るモードです。
          </p>
        </div>
        <Button variant="primary" className="w-full" onClick={startAppend}>
          このプランに未来のイベントを追加
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            reset();
            onStartNew?.();
          }}
        >
          新しいプランをADVで作る
        </Button>
        <Button variant="secondary" className="w-full" onClick={onComplete}>
          現在のプランを開く
        </Button>
      </div>
    );
  }

  if (phase === "profile") {
    return (
      <div className="h-full overflow-y-auto p-3 space-y-4">
        <div>
          <p className="text-sm font-medium">ADV入力</p>
          <p className="text-[11px] opacity-40 mt-1 leading-relaxed">
            1年ずつ選択して、未来のイベントを作ります。年収は額面で入力してください（税・社保はヘッダーの設定で自動計算できます）。
          </p>
        </div>

        <div className="space-y-3">
          <NumberField
            label="現在の貯金"
            value={profile.savings}
            suffix="万円"
            presets={[100, 300, 500, 1000]}
            onChange={(savings) => setProfile((p) => ({ ...p, savings }))}
          />
          <NumberField
            label="年収（額面）"
            value={profile.income}
            suffix="万円/年"
            presets={[300, 400, 500, 800]}
            onChange={(income) => setProfile((p) => ({ ...p, income }))}
          />
          <NumberField
            label="生活費（住居費を除く）"
            value={profile.livingMonthly}
            suffix="万円/月"
            presets={[15, 20, 25, 30]}
            onChange={(livingMonthly) => setProfile((p) => ({ ...p, livingMonthly }))}
          />
          <NumberField
            label="現在の家賃"
            value={profile.rentMonthly}
            suffix="万円/月"
            presets={[6, 8, 10, 12, 15]}
            onChange={(rentMonthly) => setProfile((p) => ({ ...p, rentMonthly }))}
          />
          <NumberField
            label="年金の見込み（夫婦合計）"
            value={profile.pensionMonthly}
            suffix="万円/月"
            presets={[10, 15, 20, 25]}
            onChange={(pensionMonthly) => setProfile((p) => ({ ...p, pensionMonthly }))}
          />
        </div>

        <Button
          variant="primary"
          className="w-full"
          disabled={profile.livingMonthly < 0}
          onClick={begin}
        >
          この内容でスタート
        </Button>
        <p className="text-[10px] opacity-25 leading-relaxed">
          金額はあとからGUI/DSLで変更できます。わからない項目は目安のままでOKです。
        </p>
      </div>
    );
  }

  if (phase === "done") {
    const rows = state.rows ?? [];
    const row65 = rows.find((row) => row.age === 65) ?? rows.find((row) => row.age >= 65);
    const endRow = rows[rows.length - 1];
    const advice = rows.length > 0 && scenario ? buildAdvice(rows, scenario, startAge) : [];
    const danger = advice.filter((item) => item.level === "danger").length;
    const warning = advice.filter((item) => item.level === "warning").length;

    return (
      <div className="h-full overflow-y-auto p-3 space-y-3">
        <div>
          <p className="text-sm font-medium">
            {mode === "append" ? "プランを更新しました" : "プランができました"}
          </p>
          <p className="text-[11px] opacity-40 mt-1">
            {startAge}歳から{endAge}歳までの選択を反映しました。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 border border-(--border) rounded">
            <div className="text-[10px] opacity-40">65歳時点</div>
            <div className="font-medium tabular-nums">
              {row65 ? `${fmt(Math.round(row65.totalAssets))}万円` : "—"}
            </div>
          </div>
          <div className="p-2 border border-(--border) rounded">
            <div className="text-[10px] opacity-40">最終</div>
            <div className="font-medium tabular-nums">
              {endRow ? `${fmt(Math.round(endRow.totalAssets))}万円` : "—"}
            </div>
          </div>
        </div>

        {(danger > 0 || warning > 0) && (
          <div className="text-[11px]">
            {danger > 0 && <span className="text-red-500">要対応 {danger}件</span>}
            {danger > 0 && warning > 0 && " / "}
            {warning > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400">注意 {warning}件</span>
            )}
          </div>
        )}

        <Button variant="primary" className="w-full" onClick={onComplete}>
          このプランで完了
        </Button>
        {history.length > 0 && (
          <Button variant="secondary" className="w-full" onClick={undo}>
            最後の選択に戻る
          </Button>
        )}
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            reset();
            onStartNew?.();
          }}
        >
          最初から作り直す
        </Button>

        <details className="text-[11px]">
          <summary className="cursor-pointer opacity-40">これまでの選択</summary>
          <ul className="mt-1 space-y-0.5 opacity-60">
            {log.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </details>
        <p className="text-[10px] opacity-25 leading-relaxed">
          結果は概算です。完了後、GUI/DSLで自由に修正できます。
        </p>
      </div>
    );
  }

  const due = getDueDecision(startAge, endAge, age, flags);
  const schoolDecision = due?.decision.kind === "school" ? due.decision : null;
  const currentRow =
    state.rows?.find((row) => row.age === age) ?? state.rows?.[state.rows.length - 1];
  const progress =
    endAge > startAge ? Math.min(100, ((age - startAge + 1) / (endAge - startAge + 1)) * 100) : 100;

  const rentHousing = {
    type: "rent" as const,
    monthly: profile.rentMonthly,
  };
  const buyHousing = (price: number, downPaymentRate: number) => ({
    type: "buy" as const,
    price,
    downPayment: Math.round(price * downPaymentRate),
    rate: MORTGAGE_RATE,
    years: MORTGAGE_YEARS,
    annualTax: Math.round(price * 0.004),
  });

  const childPlan = (birthAge: number) => ({ birthAge, schools: {} });
  const updateChild = (childNo: 1 | 2, type: SchoolType, stage: SchoolStage) => {
    const key = childNo === 1 ? "child1" : "child2";
    const child = flags[key];
    if (!child) return;
    const nextChild = {
      ...child,
      schools: { ...child.schools, [stage]: type },
    };
    apply(
      { ...flags, [key]: nextChild },
      `子${childNo} ${stage}: ${type === "public" ? "公立" : type === "private" ? "私立" : "スキップ"}`,
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-(--border)">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium">
            ADV入力
            {mode === "append" && <Badge tone="info">追記</Badge>}
          </span>
          <span className="text-[10px] opacity-40 tabular-nums">
            {age}歳 / {endAge}歳
          </span>
        </div>
        <div className="mt-1 h-1 rounded bg-(--grid)">
          <div
            className="h-1 rounded bg-(--terra) transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] opacity-40 mt-1">
          <span>総資産 {currentRow ? `${fmt(Math.round(currentRow.totalAssets))}万円` : "—"}</span>
          <span>
            現金 {currentRow ? `${fmt(Math.round(currentRow.balances["現金"] ?? 0))}万円` : "—"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <p className="text-[11px] opacity-40">{age}歳の選択</p>

        {due?.decision.kind === "housing" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">住まいをどうしますか？</p>
            {mode === "append" ? (
              <ChoiceButton
                label="住まいを変更しない"
                detail="既存の住居費・住宅ローンをそのまま使います"
                onClick={() =>
                  apply({ ...flags, housing: undefined, housingAsked: true }, "住まいを変更しない")
                }
              />
            ) : (
              <ChoiceButton
                label={`賃貸を続ける（${fmt(profile.rentMonthly)}万円/月）`}
                detail="更新料や引っ越しは考慮しません"
                onClick={() => apply({ ...flags, housing: rentHousing }, "賃貸を選択")}
              />
            )}
            {BUY_PRESETS.map((preset) => (
              <ChoiceButton
                key={preset.price}
                label={preset.label}
                detail={`1年後に購入・35年・${MORTGAGE_RATE}%・固定資産税${fmt(Math.round(preset.price * 0.004))}万円/年`}
                onClick={() =>
                  apply(
                    {
                      ...flags,
                      housing: buyHousing(preset.price, preset.downPaymentRate),
                    },
                    `住宅を購入（${preset.label}）`,
                  )
                }
              />
            ))}
          </div>
        )}

        {due?.decision.kind === "child1" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">子どもはどうしますか？</p>
            <ChoiceButton
              label="子どもなし"
              onClick={() => apply({ ...flags, child1Asked: true }, "子どもなし")}
            />
            <ChoiceButton
              label="1人"
              detail={`${startAge + 1}歳で誕生`}
              onClick={() =>
                apply(
                  {
                    ...flags,
                    child1Asked: true,
                    child1: childPlan(startAge + 1),
                  },
                  "子ども1人",
                )
              }
            />
            <ChoiceButton
              label="2人（3歳差）"
              detail={`${startAge + 1}歳と${startAge + 4}歳で誕生`}
              onClick={() =>
                apply(
                  {
                    ...flags,
                    child1Asked: true,
                    child1: childPlan(startAge + 1),
                    child2Asked: true,
                    child2: childPlan(startAge + 4),
                  },
                  "子ども2人（3歳差）",
                )
              }
            />
          </div>
        )}

        {due?.decision.kind === "child2" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">2人目はどうしますか？</p>
            <ChoiceButton
              label="2人目を持つ"
              detail={`${(flags.child1?.birthAge ?? startAge) + 3}歳で誕生`}
              onClick={() =>
                apply(
                  {
                    ...flags,
                    child2Asked: true,
                    child2: childPlan((flags.child1?.birthAge ?? startAge) + 3),
                  },
                  "子ども2人目",
                )
              }
            />
            <ChoiceButton
              label="2人目は持たない"
              onClick={() => apply({ ...flags, child2Asked: true }, "子どもは1人")}
            />
          </div>
        )}

        {schoolDecision && (
          <div className="space-y-2">
            <p className="text-xs font-medium">
              子{schoolDecision.child}の{schoolDecision.stage}は？
            </p>
            <p className="text-[10px] opacity-35">
              公立 {fmt(SCHOOL_PRESETS[schoolDecision.stage].public)}万円/年 ・ 私立{" "}
              {fmt(SCHOOL_PRESETS[schoolDecision.stage].private)}万円/年
            </p>
            <ChoiceButton
              label="公立"
              detail={`${fmt(schoolCost(schoolDecision.stage, "public"))}万円/年`}
              onClick={() => updateChild(schoolDecision.child, "public", schoolDecision.stage)}
            />
            <ChoiceButton
              label="私立"
              detail={`${fmt(schoolCost(schoolDecision.stage, "private"))}万円/年`}
              onClick={() => updateChild(schoolDecision.child, "private", schoolDecision.stage)}
            />
            <ChoiceButton
              label="スキップ（費用を入れない）"
              onClick={() => updateChild(schoolDecision.child, "skip", schoolDecision.stage)}
            />
          </div>
        )}

        {due?.decision.kind === "investment" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">投資はどうしますか？</p>
            {INVESTMENT_PRESETS.map((preset) => (
              <ChoiceButton
                key={preset.monthly}
                label={preset.label}
                detail={preset.monthly > 0 ? "NISA・年3%で運用" : "現金のまま"}
                onClick={() =>
                  apply(
                    {
                      ...flags,
                      investmentAsked: true,
                      investmentMonthly: preset.monthly,
                      investmentStartAge: age,
                    },
                    preset.monthly > 0 ? `NISA ${preset.monthly}万円/月` : "投資なし",
                  )
                }
              />
            ))}
          </div>
        )}

        {due?.decision.kind === "car" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">車はどうしますか？</p>
            <ChoiceButton
              label="車を持たない"
              onClick={() => apply({ ...flags, carAsked: true }, "車なし")}
            />
            <ChoiceButton
              label="10年ごとに買い替える"
              detail="購入300万円・維持24万円/年（10年ごと）"
              onClick={() =>
                apply(
                  { ...flags, carAsked: true, car: { startAge: age, mode: "buy" } },
                  "車を購入（10年ごとに買い替え）",
                )
              }
            />
            <ChoiceButton
              label="今の車を維持する"
              detail="維持費24万円/年"
              onClick={() =>
                apply(
                  {
                    ...flags,
                    carAsked: true,
                    car: { startAge: age, mode: "maintain" },
                  },
                  "車を維持",
                )
              }
            />
          </div>
        )}

        {due?.decision.kind === "risk" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">病気・介護の費用を入れますか？</p>
            <p className="text-[10px] opacity-35 leading-relaxed">
              確率ではなく、起きた場合の費用をプランに計上します。目安:
              がん生涯罹患リスク約2人に1人、介護は平均4年7ヶ月・月9万円。
            </p>
            <ChoiceButton
              label="入れない"
              onClick={() => apply({ ...flags, riskAsked: true }, "リスク費用なし")}
            />
            <ChoiceButton
              label="大病（自己負担100万円）"
              detail="60歳で一度計上"
              onClick={() =>
                apply(
                  {
                    ...flags,
                    riskAsked: true,
                    risk: { illness: true, care: false },
                  },
                  "大病リスク（-100万円）",
                )
              }
            />
            <ChoiceButton
              label="介護（80歳から5年）"
              detail="一時47万円＋月9万円×5年"
              onClick={() =>
                apply(
                  {
                    ...flags,
                    riskAsked: true,
                    risk: { illness: false, care: true },
                  },
                  "介護リスク（80歳から5年）",
                )
              }
            />
            <ChoiceButton
              label="両方入れる"
              onClick={() =>
                apply(
                  {
                    ...flags,
                    riskAsked: true,
                    risk: { illness: true, care: true },
                  },
                  "大病・介護リスク",
                )
              }
            />
          </div>
        )}

        {due?.decision.kind === "retirement" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">いつまで働きますか？</p>
            {RETIREMENT_OPTIONS.filter((option) => option >= startAge).map((option) => (
              <ChoiceButton
                key={option}
                label={`${option}歳で退職`}
                detail={option < 65 ? "65歳より前に収入が終わります" : undefined}
                onClick={() => apply({ ...flags, retirementAge: option }, `${option}歳で退職`)}
              />
            ))}
          </div>
        )}

        {!due && (
          <div className="space-y-2">
            <p className="text-xs font-medium">この年は特に大きなイベントはありません</p>
            <div className="grid grid-cols-2 gap-1">
              <Button
                variant="secondary"
                size="sm"
                className="h-auto whitespace-normal"
                onClick={() =>
                  apply(
                    {
                      ...flags,
                      oneOffs: [...flags.oneOffs, { age, name: "車", amount: -300 }],
                    },
                    "車を購入（-300万円）",
                  )
                }
              >
                車を買う（-300万）
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-auto whitespace-normal"
                onClick={() =>
                  apply(
                    {
                      ...flags,
                      oneOffs: [...flags.oneOffs, { age, name: "旅行", amount: -100 }],
                    },
                    "旅行（-100万円）",
                  )
                }
              >
                旅行（-100万）
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-auto whitespace-normal"
                onClick={() =>
                  apply(
                    {
                      ...flags,
                      oneOffs: [...flags.oneOffs, { age, name: "臨時収入", amount: 100 }],
                    },
                    "臨時収入（+100万円）",
                  )
                }
              >
                臨時収入（+100万）
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-auto whitespace-normal"
                onClick={() => advance(false)}
              >
                何もしない
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-2 border-t border-(--border) flex items-center gap-2">
        <Button variant="secondary" size="sm" disabled={history.length === 0} onClick={undo}>
          戻る
        </Button>
        {!due && (
          <>
            <Button variant="secondary" size="sm" className="ml-auto" onClick={() => advance(true)}>
              次の決断まで
            </Button>
            <Button variant="secondary" size="sm" onClick={() => advance(false)}>
              次へ
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
