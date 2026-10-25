import { useState } from "react";
import { Button, IconButton, Input, Modal, Select } from "@mijime/theme/ui";
import { X } from "lucide-react";
import type { AssetOp, Event } from "../types";
import { fmt } from "../utils";
import { OP_COLORS } from "../constants";

function FormActions({
  onClose,
  onSave,
  saveDisabled,
}: {
  onClose: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <div className="flex gap-2 justify-end pt-2">
      <Button variant="secondary" size="sm" onClick={onClose}>
        キャンセル
      </Button>
      <Button variant="primary" size="sm" disabled={saveDisabled} onClick={onSave}>
        保存
      </Button>
    </div>
  );
}

/**
 * Rough annual fixed asset tax (万円/年).
 *
 * The real tax is 1.4% of the assessed value, not the purchase price, and is
 * reduced for residential land. 0.4% of the purchase price is a common
 * effective rate, so use it only as the initial estimate.
 */
export function estimateAnnualPropertyTax(propertyPrice: number): number {
  return Math.round(propertyPrice * 0.004);
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
  const factor = (1 + r) ** years;
  const annual = (principal * r * (1 + r) ** (years - 1)) / (factor - 1);
  return {
    monthly: Math.round(annual / 12),
    annual: Math.round(annual),
    total: Math.round(annual * years),
  };
}

type Pattern = "simple" | "mortgage" | "initial" | "invest" | "child";

const PATTERNS: { id: Pattern; label: string; desc: string }[] = [
  { id: "simple", label: "シンプル", desc: "自由にイベントを定義" },
  { id: "mortgage", label: "住宅ローン", desc: "借入・返済・金利を自動生成" },
  { id: "initial", label: "初期設定", desc: "初期現金・年収・生活費・住居費" },
  { id: "invest", label: "投資", desc: "積立＋運用を自動生成" },
  { id: "child", label: "子供", desc: "教育費をライフステージ別に生成" },
];

const PATTERN_FORM: Record<
  Pattern,
  React.ComponentType<{
    currentAge: number;
    onSave: (events: Event[]) => void;
    onClose: () => void;
  }>
> = {
  simple: SimpleForm,
  mortgage: MortgageForm,
  initial: InitialForm,
  invest: InvestForm,
  child: ChildForm,
};

export function AddEventModal({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [pattern, setPattern] = useState<Pattern | null>(null);
  const selected = pattern ? PATTERNS.find((p) => p.id === pattern) : null;
  const FormComponent = pattern ? PATTERN_FORM[pattern] : null;

  return (
    <Modal open onClose={onClose} title={selected ? selected.label : "イベント追加"} size="sm">
      {selected && (
        <Button variant="ghost" size="sm" className="mb-3" onClick={() => setPattern(null)}>
          ← 戻る
        </Button>
      )}
      <p className="text-[10px] opacity-30 mb-3">金額の単位: 万円</p>
      {selected && FormComponent ? (
        <FormComponent currentAge={currentAge} onSave={onSave} onClose={onClose} />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {PATTERNS.map((patternOption) => (
            <Button
              key={patternOption.id}
              variant="secondary"
              className="h-auto w-full flex-col items-start gap-1 whitespace-normal p-3 text-left"
              onClick={() => setPattern(patternOption.id)}
            >
              <span className="text-xs font-medium">{patternOption.label}</span>
              <span className="text-[10px] opacity-40">{patternOption.desc}</span>
            </Button>
          ))}
        </div>
      )}
    </Modal>
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
    startAge: currentAge,
    endAge: null,
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
      <FormActions onClose={onClose} onSave={() => onSave([event])} />
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
  const [startAge, setStartAge] = useState(currentAge);
  const [yearMode, setYearMode] = useState<"offset" | "age">("offset");
  const [annualPropertyTax, setAnnualPropertyTax] = useState(0);
  const [taxEdited, setTaxEdited] = useState(false);

  const toDisplay = (v: number) => (yearMode === "age" ? v : v - currentAge);
  const fromDisplay = (v: number) => (yearMode === "age" ? v : v + currentAge);

  const loanAmount = Math.max(0, propertyPrice - downPayment);
  const result = calcMortgage(loanAmount, interestRate, years);
  const estimatedTax = estimateAnnualPropertyTax(propertyPrice);
  const propertyTax = taxEdited ? annualPropertyTax : estimatedTax;

  const handleSave = () => {
    if (propertyPrice <= 0) return;
    const multiplier = 1 + interestRate / 100;
    const annualPayment = result === null ? 0 : result.annual;
    const events: Event[] = [
      {
        name: "住宅(取得)",
        group: "住宅ローン",
        startAge,
        endAge: startAge,
        ops: [{ asset: "住宅", op: "+" as const, value: propertyPrice }],
      },
    ];
    if (downPayment > 0) {
      events.push({
        name: "住居費(頭金)",
        group: "住宅ローン",
        startAge,
        endAge: startAge,
        ops: [{ asset: "現金", op: "-" as const, value: downPayment }],
      });
    }
    if (loanAmount > 0) {
      events.push(
        {
          name: "住居費(実行)",
          group: "住宅ローン",
          startAge,
          endAge: startAge,
          ops: [{ asset: "借入", op: "-" as const, value: loanAmount }],
        },
        {
          name: "住居費(返済)",
          group: "住宅ローン",
          startAge,
          endAge: startAge + years - 1,
          ops: [
            { asset: "現金", op: "-" as const, value: annualPayment },
            { asset: "借入", op: "+" as const, value: annualPayment },
          ],
        },
        {
          name: "借入金利",
          group: "住宅ローン",
          startAge,
          endAge: startAge + years - 1,
          ops: [{ asset: "借入", op: "*" as const, value: multiplier }],
        },
      );
    }
    if (propertyTax > 0) {
      events.push({
        name: "税金(固定資産税)",
        group: "住宅ローン",
        startAge,
        endAge: null,
        ops: [{ asset: "現金", op: "-" as const, value: propertyTax }],
      });
    }
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">物件価格</label>
        <Input
          aria-label="物件価格（万円）"
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={propertyPrice || ""}
          onChange={(e) => setPropertyPrice(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円</span>
      </div>

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">頭金</label>
        <Input
          aria-label="頭金（万円）"
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={downPayment || ""}
          onChange={(e) => setDownPayment(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円</span>
      </div>

      {propertyPrice > 0 && (
        <div className="flex justify-between text-[11px] px-1">
          <span className="opacity-40">借入額</span>
          <span className="tabular-nums">
            {loanAmount > 0 ? (
              `${fmt(loanAmount)}万円`
            ) : (
              <span className="text-red-400">頭金が物件価格を超えています</span>
            )}
          </span>
        </div>
      )}

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">金利</label>
        <Input
          aria-label="金利（%）"
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
        <Input
          aria-label="返済年数"
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={years}
          onChange={(e) => setYears(Number(e.target.value) || 1)}
        />
        <span className="text-[11px] opacity-30">年</span>
      </div>

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">開始</label>
        <Select
          className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
          value={yearMode}
          onChange={(e) => setYearMode(e.target.value as "offset" | "age")}
        >
          <option value="offset">年数</option>
          <option value="age">年齢</option>
        </Select>
        <Input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={toDisplay(startAge)}
          onChange={(e) => setStartAge(fromDisplay(Number(e.target.value) || 0))}
        />
      </div>

      {result !== null && loanAmount > 0 && (
        <div className="border-t border-(--border) pt-2 space-y-1">
          <div className="flex justify-between text-[11px]">
            <span className="opacity-40">月々の返済額</span>
            <span className="tabular-nums font-medium">{fmt(result.monthly)}万円/月</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="opacity-40">年間返済額</span>
            <span className="tabular-nums font-medium">{fmt(result.annual)}万円/年</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="opacity-40">総返済額</span>
            <span className="tabular-nums">{fmt(result.total)}万円</span>
          </div>
        </div>
      )}

      <div className="flex gap-1.5 items-center">
        <label htmlFor="saiflow-property-tax" className="text-[11px] opacity-40 shrink-0 w-14">
          固定資産税
        </label>
        <Input
          id="saiflow-property-tax"
          aria-label="固定資産税（年額）"
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={propertyTax || ""}
          onChange={(e) => {
            setTaxEdited(true);
            setAnnualPropertyTax(Number(e.target.value));
          }}
        />
        <span className="text-[11px] opacity-30">万円/年</span>
        {taxEdited ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0 text-[10px]"
            onClick={() => setTaxEdited(false)}
          >
            目安に戻す
          </Button>
        ) : (
          <span className="text-[10px] opacity-30">物件価格の0.4%で仮置き</span>
        )}
      </div>
      <p className="text-[10px] opacity-25 leading-relaxed pl-[3.75rem]">
        実際の税額は固定資産税評価額と土地の軽減措置で変わります。不明なら「目安」のままでOKです。
      </p>

      <FormActions onClose={onClose} onSave={handleSave} saveDisabled={propertyPrice <= 0} />
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
  const display = mode === "age" ? value : value - currentAge;
  return (
    <div className="flex gap-1 items-center">
      <Select
        className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
        value={mode}
        onChange={(e) => setMode(e.target.value as "offset" | "age")}
      >
        <option value="offset">年数</option>
        <option value="age">年齢</option>
      </Select>
      <Input
        type="number"
        className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
        value={display}
        onChange={(e) =>
          onChange(mode === "age" ? Number(e.target.value) : Number(e.target.value) + currentAge)
        }
      />
    </div>
  );
}

function InitialForm({
  currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [initialCash, setInitialCash] = useState(0);
  const [annualIncome, setAnnualIncome] = useState(0);
  const [livingMonthly, setLivingMonthly] = useState(0);
  const [housingMonthly, setHousingMonthly] = useState(0);

  const retirementAge = 65;

  const handleSave = () => {
    const events: Event[] = [];
    if (initialCash > 0) {
      events.push({
        name: "貯金",
        group: "初期設定",
        startAge: currentAge,
        endAge: currentAge,
        ops: [{ asset: "現金", op: "+" as const, value: initialCash }],
      });
    }
    if (annualIncome > 0) {
      const incomeEndAge = retirementAge > currentAge ? retirementAge : null;
      events.push({
        name: "年収",
        group: "初期設定",
        startAge: currentAge,
        endAge: incomeEndAge,
        ops: [{ asset: "現金", op: "+" as const, value: annualIncome }],
      });
    }
    if (livingMonthly > 0) {
      events.push({
        name: "生活費",
        group: "初期設定",
        startAge: currentAge,
        endAge: null,
        ops: [{ asset: "現金", op: "-" as const, value: livingMonthly * 12 }],
      });
    }
    if (housingMonthly > 0) {
      events.push({
        name: "住居費",
        group: "初期設定",
        startAge: currentAge,
        endAge: null,
        ops: [{ asset: "現金", op: "-" as const, value: housingMonthly * 12 }],
      });
    }
    if (events.length === 0) return;
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">初期現金</label>
        <Input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={initialCash || ""}
          onChange={(e) => setInitialCash(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">年収</label>
        <Input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={annualIncome || ""}
          onChange={(e) => setAnnualIncome(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円/年</span>
        <span className="text-[10px] opacity-25">〜65歳</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">生活費</label>
        <Input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={livingMonthly || ""}
          onChange={(e) => setLivingMonthly(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円/月</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">住居費</label>
        <Input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={housingMonthly || ""}
          onChange={(e) => setHousingMonthly(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円/月</span>
      </div>
      <FormActions
        onClose={onClose}
        onSave={handleSave}
        saveDisabled={
          initialCash <= 0 && annualIncome <= 0 && livingMonthly <= 0 && housingMonthly <= 0
        }
      />
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
  const [startAge, setStartAge] = useState(currentAge);
  const [endAge, setEndAge] = useState<number | null>(currentAge + 20);
  const [withdrawMonthly, setWithdrawMonthly] = useState(0);
  const [withdrawStartAge, setWithdrawStartAge] = useState(currentAge + 30);

  const annualAmount = monthlyAmount * 12;
  const annualWithdraw = withdrawMonthly * 12;
  const multiplier = 1 + annualReturn / 100;

  const handleSave = () => {
    if (!name.trim() || monthlyAmount <= 0) return;
    const events: Event[] = [
      {
        name: `${name}(積立)`,
        group: `投資(${name})`,
        startAge,
        endAge,
        ops: [
          { asset: "現金", op: "-" as const, value: annualAmount },
          { asset: name, op: "+" as const, value: annualAmount },
        ],
      },
      {
        name: `${name}(運用)`,
        group: `投資(${name})`,
        startAge,
        endAge: null,
        ops: [{ asset: name, op: "*" as const, value: multiplier }],
      },
    ];
    if (withdrawMonthly > 0) {
      events.push({
        name: `${name}(切り崩し)`,
        group: `投資(${name})`,
        startAge: withdrawStartAge,
        endAge: null,
        ops: [
          { asset: "現金", op: "+" as const, value: annualWithdraw },
          { asset: name, op: "-" as const, value: annualWithdraw },
        ],
      });
    }
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">名称</label>
        <Input
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="NISA"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">月額積立</label>
        <Input
          type="number"
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={monthlyAmount || ""}
          onChange={(e) => setMonthlyAmount(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円/月</span>
      </div>
      <div className="flex justify-between text-[11px] px-1">
        <span className="opacity-40">年間積立額</span>
        <span className="tabular-nums">{fmt(annualAmount)}万円/年</span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">年利</label>
        <Input
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
        <YearInput value={startAge} onChange={setStartAge} currentAge={currentAge} />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14" />
        <span className="text-[11px] opacity-30">終了</span>
        <YearInput value={endAge ?? 0} onChange={(v) => setEndAge(v)} currentAge={currentAge} />
        <Button
          variant="ghost"
          size="sm"
          className="h-auto px-1 py-0 text-[10px]"
          onClick={() => setEndAge(null)}
        >
          指定なし
        </Button>
      </div>
      <div className="border-t border-(--border) pt-3 space-y-3">
        <p className="text-[11px] opacity-40">切り崩し</p>
        <div className="flex gap-1.5 items-center">
          <label className="text-[11px] opacity-40 shrink-0 w-14">月額</label>
          <Input
            type="number"
            className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
            value={withdrawMonthly || ""}
            onChange={(e) => setWithdrawMonthly(Number(e.target.value))}
          />
        </div>
        <div className="flex justify-between text-[11px] px-1">
          <span className="opacity-40">年間受取額</span>
          <span className="tabular-nums">{fmt(annualWithdraw)}万円/年</span>
        </div>
        <div className="flex gap-1.5 items-center">
          <label className="text-[11px] opacity-40 shrink-0 w-14">開始</label>
          <YearInput
            value={withdrawStartAge}
            onChange={setWithdrawStartAge}
            currentAge={currentAge}
          />
        </div>
      </div>
      <FormActions
        onClose={onClose}
        onSave={handleSave}
        saveDisabled={!name.trim() || monthlyAmount <= 0}
      />
    </div>
  );
}

type SchoolType = "public" | "private" | null;

// 文部科学省「令和5年度 子供の学習費調査」の学習費総額（万円/年）。
// 大学は同調査の対象外のため概算。
const SCHOOL_PRESETS: Record<string, { period: string; public: number; private: number }> = {
  幼稚園: { period: "3年", public: 17, private: 31 },
  小学校: { period: "6年", public: 35, private: 167 },
  中学校: { period: "3年", public: 54, private: 144 },
  高校: { period: "3年", public: 51, private: 106 },
  大学: { period: "4年", public: 60, private: 120 },
};

function ChildForm({
  currentAge: _currentAge,
  onSave,
  onClose,
}: {
  currentAge: number;
  onSave: (events: Event[]) => void;
  onClose: () => void;
}) {
  const [childName, setChildName] = useState("子");
  const [birthAge, setBirthAge] = useState(_currentAge + 2);
  const [yearMode, setYearMode] = useState<"offset" | "age">("offset");
  const [schools, setSchools] = useState<Record<string, SchoolType>>({
    幼稚園: null,
    小学校: null,
    中学校: null,
    高校: null,
    大学: null,
  });
  const [livingMonthly, setLivingMonthly] = useState(0);

  const handleSave = () => {
    if (!childName.trim()) return;
    const events: Event[] = [];
    const add = (label: string, start: number, end: number | null, cost: number) => {
      if (cost > 0) {
        const yrStart = birthAge + start;
        const yrEnd = end === null ? null : birthAge + end;
        if (yrEnd !== null && yrEnd < 0) return;
        events.push({
          name: `教育費(${childName} ${label})`,
          group: `子供(${childName})`,
          startAge: Math.max(0, yrStart),
          endAge: yrEnd,
          ops: [{ asset: "現金", op: "-" as const, value: cost }],
        });
      }
    };
    if (livingMonthly > 0) {
      const livingEnd = birthAge + 17;
      if (livingEnd >= 0) {
        events.push({
          name: `生活費(${childName})`,
          group: `子供(${childName})`,
          startAge: Math.max(0, birthAge),
          endAge: livingEnd,
          ops: [{ asset: "現金", op: "-" as const, value: livingMonthly * 12 }],
        });
      }
    }
    const offsets: [string, number, number | null][] = [
      ["幼稚園", 3, 5],
      ["小学校", 6, 11],
      ["中学校", 12, 14],
      ["高校", 15, 17],
      ["大学", 18, 21],
    ];
    for (const [stage, start, end] of offsets) {
      const type = schools[stage];
      if (type) {
        const cost = SCHOOL_PRESETS[stage][type];
        add(stage, start, end, cost);
      }
    }
    if (events.length === 0) return;
    onSave(events);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">名前</label>
        <Input
          className="flex-1 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="子1"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
        />
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">誕生</label>
        <Select
          className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
          value={yearMode}
          onChange={(e) => {
            setYearMode(e.target.value as "offset" | "age");
          }}
        >
          <option value="offset">年数</option>
          <option value="age">年齢</option>
        </Select>
        <Input
          type="number"
          className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={yearMode === "age" ? birthAge : birthAge - _currentAge}
          onChange={(e) => {
            const v = Number(e.target.value) || 0;
            setBirthAge(yearMode === "age" ? v : v + _currentAge);
          }}
        />
        <span className="text-[11px] opacity-30">
          {yearMode === "age" ? "歳" : birthAge >= _currentAge ? "年後" : "年前"}
        </span>
      </div>
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0 w-14">生活費</label>
        <Input
          type="number"
          className="w-20 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={livingMonthly || ""}
          onChange={(e) => setLivingMonthly(Number(e.target.value))}
        />
        <span className="text-[11px] opacity-30">万円/月</span>
        <span className="text-[10px] opacity-25">〜18歳</span>
      </div>
      <div className="border-t border-(--border) pt-2 space-y-2">
        {(["幼稚園", "小学校", "中学校", "高校", "大学"] as const).map((stage) => {
          const type = schools[stage];
          const preset = SCHOOL_PRESETS[stage];
          return (
            <div key={stage} className="flex items-center gap-1">
              <span className="text-[11px] opacity-40 shrink-0 w-14">{stage}</span>
              <div className="flex overflow-hidden rounded border border-(--border)">
                <Button
                  variant={type === "public" ? "primary" : "ghost"}
                  size="sm"
                  className="rounded-none border-0 px-2 py-0.5 text-[10px]"
                  onClick={() =>
                    setSchools((s) => ({ ...s, [stage]: s[stage] === "public" ? null : "public" }))
                  }
                >
                  公立
                </Button>
                <Button
                  variant={type === "private" ? "primary" : "ghost"}
                  size="sm"
                  className="rounded-none border-0 px-2 py-0.5 text-[10px]"
                  onClick={() =>
                    setSchools((s) => ({
                      ...s,
                      [stage]: s[stage] === "private" ? null : "private",
                    }))
                  }
                >
                  私立
                </Button>
              </div>
              {type && (
                <span className="text-[10px] opacity-30 ml-1 tabular-nums">
                  {preset[type]}万/年（{preset.period}）
                </span>
              )}
            </div>
          );
        })}
      </div>
      <FormActions onClose={onClose} onSave={handleSave} saveDisabled={!childName.trim()} />
    </div>
  );
}

export function EventForm({
  event,
  onChange,
  onDelete,
  currentAge,
  hideDelete,
  defaultYearMode,
}: {
  event: Event;
  onChange: (e: Event) => void;
  onDelete: () => void;
  currentAge: number;
  hideDelete?: boolean;
  defaultYearMode?: "offset" | "age";
}) {
  const [yearMode, setYearMode] = useState<"offset" | "age">(defaultYearMode ?? "offset");

  const toDisplay = (v: number) => (yearMode === "age" ? v : v - currentAge);
  const fromDisplay = (v: number) => (yearMode === "age" ? v : v + currentAge);

  return (
    <div className="px-3 pb-3 space-y-2">
      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0">名称</label>
        <Input
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="イベント名"
          value={event.name}
          onChange={(e) => onChange({ ...event, name: e.target.value })}
        />
      </div>

      <div className="flex gap-1.5 items-center">
        <label className="text-[11px] opacity-40 shrink-0">グループ</label>
        <Input
          className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
          placeholder="(なし)"
          value={event.group ?? ""}
          onChange={(e) => onChange({ ...event, group: e.target.value || undefined })}
        />
      </div>

      <div className="flex gap-1 items-center">
        <label className="text-[11px] opacity-40 shrink-0">期間</label>
        <Select
          className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-1 py-0.5 outline-none cursor-pointer"
          value={yearMode}
          onChange={(e) => setYearMode(e.target.value as "offset" | "age")}
        >
          <option value="offset">年数</option>
          <option value="age">年齢</option>
        </Select>
        <Input
          type="number"
          className="w-14 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          value={toDisplay(event.startAge)}
          onChange={(e) =>
            onChange({ ...event, startAge: fromDisplay(Number(e.target.value) || 0) })
          }
        />
        <span className="text-[11px] opacity-30">→</span>
        <Input
          type="number"
          className="w-14 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
          placeholder={yearMode === "age" ? "年齢" : "終了"}
          value={event.endAge === null ? "" : toDisplay(event.endAge)}
          onChange={(e) => {
            const v = e.target.value;
            onChange({
              ...event,
              endAge: v === "" ? null : fromDisplay(Number(v) || 0),
            });
          }}
        />
        {event.endAge !== null && event.endAge < event.startAge && (
          <span className="text-[10px] text-red-400">終了 &lt; 開始</span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] opacity-40">操作</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-1 py-0"
            onClick={() =>
              onChange({ ...event, ops: [...event.ops, { asset: "", op: "+", value: 0 }] })
            }
          >
            + 追加
          </Button>
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
        <Button variant="danger" size="sm" onClick={onDelete}>
          イベントを削除
        </Button>
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
      <Input
        className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded outline-none focus:border-(--terra)"
        placeholder="資産名"
        value={op.asset}
        onChange={(e) => onChange({ ...op, asset: e.target.value })}
      />
      <Select
        className={`w-9 px-0.5 py-1 text-xs rounded border border-(--border) outline-none cursor-pointer tabular-nums ${OP_COLORS[op.op]}`}
        value={op.op}
        onChange={(e) => onChange({ ...op, op: e.target.value as "+" | "-" | "*" })}
      >
        <option value="+">+</option>
        <option value="-">−</option>
        <option value="*">×</option>
      </Select>
      <Input
        type="number"
        className="w-16 px-1.5 py-0.5 text-xs bg-(--paper) text-(--ink) border border-(--border) rounded tabular-nums outline-none focus:border-(--terra)"
        placeholder={unit === "month" ? "月額(万円)" : "年額(万円)"}
        value={displayValue || ""}
        onChange={(e) => onChange({ ...op, value: saveValue(Number(e.target.value)) })}
      />
      <Select
        className="text-[11px] bg-(--paper) text-(--ink) border border-(--border) rounded px-0.5 py-0.5 outline-none cursor-pointer tabular-nums"
        value={unit}
        onChange={(e) => setUnit(e.target.value as "year" | "month")}
      >
        <option value="year">年</option>
        <option value="month">月</option>
      </Select>
      <IconButton label="操作を削除" size="icon-sm" variant="ghost" onClick={onDelete}>
        <X size={12} />
      </IconButton>
    </div>
  );
}
