import type { PlayerOutcome } from "../../engine/types";

function stat(label: string, value: string, accent = false) {
  return (
    <div className="rounded-sm border border-(--border) bg-(--grid)/30 px-2 py-1 text-center">
      <span className="block text-[7.5px] text-(--mid)">{label}</span>
      <span
        className={`block text-[12px] font-semibold tabular-nums ${
          accent ? "text-(--accent)" : "text-(--ink)"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

/** 効果カードでどれだけ手数を増やしたかを表示する。 */
export function EffectSummary({ players }: { players: PlayerOutcome[] }) {
  const human = players.find((player) => player.isHuman) ?? players[0];
  const team = players.reduce(
    (sum, player) => ({
      actions: sum.actions + (player.actionsGained ?? 0),
      drawn: sum.drawn + (player.cardsDrawn ?? 0),
      discarded: sum.discarded + (player.cardsDiscarded ?? 0),
      recovered: sum.recovered + (player.cardsRecovered ?? 0),
    }),
    { actions: 0, drawn: 0, discarded: 0, recovered: 0 },
  );

  return (
    <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="serif text-[13px] font-semibold">効果カード</h2>
        <span className="text-[8px] text-(--mid)">
          チーム 追加AP +{team.actions} / ドロー {team.drawn}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        {stat("あなた 追加AP", `+${human?.actionsGained ?? 0}`, true)}
        {stat("ドロー", `${human?.cardsDrawn ?? 0}枚`)}
        {stat("捨て", `${human?.cardsDiscarded ?? 0}枚`)}
        {stat("回収", `${human?.cardsRecovered ?? 0}枚`)}
      </div>

      <ul className="mt-2 space-y-0.5 text-[8.5px] text-(--mid)">
        <li className="flex justify-between gap-2">
          <span>チームの追加アクション</span>
          <b className="tabular-nums text-(--ink)">+{team.actions}</b>
        </li>
        <li className="flex justify-between gap-2">
          <span>チームのドロー</span>
          <b className="tabular-nums text-(--ink)">{team.drawn}枚</b>
        </li>
        <li className="flex justify-between gap-2">
          <span>循環・回収</span>
          <b className="tabular-nums text-(--ink)">
            {team.discarded}枚 / {team.recovered}枚
          </b>
        </li>
      </ul>

      <p className="mt-2 text-[7.5px] leading-relaxed text-(--mid)">
        アクション+1/+2とドローで手数を増やし、循環・回収で効果カードを引き込む。連鎖は専用ルールではなく、この循環から自然に生まれる。
      </p>
    </section>
  );
}
