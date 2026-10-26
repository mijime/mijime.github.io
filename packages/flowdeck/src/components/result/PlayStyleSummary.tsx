import type { PlayStyleSummary as StyleData } from "../../engine/analytics/result";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function PlayStyleSummary({ style }: { style: StyleData }) {
  const total = Math.max(1, style.actions.total);
  const rows = [
    { label: "プレイ", value: style.actions.play, color: "bg-(--tone-sky)/75" },
    { label: "Pull", value: style.actions.pull, color: "bg-(--tone-violet)/75" },
    { label: "廃棄", value: style.actions.trash, color: "bg-(--tone-amber)/75" },
    { label: "パス", value: style.actions.pass, color: "bg-(--mid)/50" },
  ];
  return (
    <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
      <h2 className="serif text-[13px] font-semibold">プレイ傾向</h2>
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-(--grid)">
        {rows.map((row) => (
          <span
            key={row.label}
            className={row.color}
            style={{ width: `${(row.value / total) * 100}%` }}
            title={`${row.label} ${row.value}`}
          />
        ))}
      </div>
      <div className="mt-1 grid grid-cols-4 gap-1 text-center text-[8px]">
        {rows.map((row) => (
          <div key={row.label}>
            <span className="block text-(--mid)">{row.label}</span>
            <span className="block font-semibold tabular-nums text-(--ink)">{row.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[8.5px] text-(--mid)">
        <span>
          設計/開発/テスト{" "}
          <b className="text-(--ink)">
            {style.playByPhase.design}/{style.playByPhase.dev}/{style.playByPhase.test}
          </b>
        </span>
        <span>
          支援プレイ <b className="text-(--ink)">{pct(style.supportRate)}</b>
        </span>
        <span>
          プレイ/手番 <b className="text-(--ink)">{style.playsPerTurn.toFixed(2)}</b>
        </span>
        <span>
          LLMトークン <b className="text-(--ink)">{style.tokensUsed}回</b>
        </span>
      </div>
    </section>
  );
}
