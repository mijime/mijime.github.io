import type { Dispatch } from "react";
import { Flag, RefreshCw, RotateCcw, ScrollText, Star } from "lucide-react";
import type { Action, GameState, PlayerOutcome } from "../engine/types";
import { CARD_LABEL, CARD_STYLE, CardTypeIcon, LANE_LABEL, PlayerIcon, traitSummary } from "./ui";
import { LOG_TONE, groupLogByDay } from "./LogPanel";
import { newSeed } from "../store";

interface Props {
  state: GameState;
  dispatch: Dispatch<Action>;
}

function workPoints(player: PlayerOutcome): number {
  return (
    player.contributed.design.points +
    player.contributed.dev.points +
    player.contributed.test.points
  );
}

function workCards(player: PlayerOutcome): number {
  return (
    player.contributed.design.cards + player.contributed.dev.cards + player.contributed.test.cards
  );
}

export function ResultScreen({ state, dispatch }: Props) {
  const outcome = state.outcome;
  if (!outcome) return null;

  const human = outcome.perPlayer.find((player) => player.isHuman);
  const aiPlayers = outcome.perPlayer.filter((player) => !player.isHuman);
  const humanWork = human ? workPoints(human) : 0;
  const teamWork = outcome.perPlayer.reduce((sum, player) => sum + workPoints(player), 0);
  const aiWork = teamWork - humanWork;
  const aiAverage = aiPlayers.length > 0 ? aiWork / aiPlayers.length : 0;
  const share = teamWork > 0 ? humanWork / teamWork : 0;
  const ratio = aiAverage > 0 ? humanWork / aiAverage : 0;
  const rank = human
    ? outcome.perPlayer.filter((player) => workPoints(player) > humanWork).length + 1
    : 0;

  return (
    <div className="flow-root">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="text-center">
          <p className="flex items-center justify-center gap-1 text-[9px] tracking-[0.3em] text-(--mid)">
            <Flag size={10} /> BOARD REVIEW
          </p>
          <h1 className="serif mt-1 text-2xl font-semibold">{state.totalDays}日間の四半期終了</h1>
          <p className="text-[10px] text-(--mid)">シード {state.seed}</p>

          <div className="mt-3 flex items-center justify-center gap-1 text-(--terra)">
            {Array.from({ length: 3 }, (_, index) => (
              <Star
                key={index}
                size={30}
                className={index < outcome.stars ? "fill-current" : "text-(--border)"}
              />
            ))}
          </div>
          <p className="serif mt-1 text-5xl font-semibold leading-none">
            {outcome.finalScore}
            <span className="ml-1 text-sm font-normal text-(--mid)">pt</span>
          </p>
          <p className="mt-1 text-[10px] text-(--mid)">
            {outcome.failed
              ? `失敗: 負債が上限（${state.rules.debtLimit}）に達したか、スコアが星1未満です`
              : outcome.stars === 3
                ? "最高評価！ チームの流れとデッキが噛み合いました。"
                : `次の星まであと ${
                    (outcome.stars === 0
                      ? state.rules.starOne
                      : outcome.stars === 1
                        ? state.rules.starTwo
                        : state.rules.starThree) - outcome.finalScore
                  } pt`}
          </p>
        </header>

        {human && (
          <section className="mt-4 rounded-sm border border-(--terra)/40 bg-(--terra)/5 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h2 className="serif text-[13px] font-semibold">あなたの貢献</h2>
              <span className="text-[8px] text-(--mid)">
                チーム内 {rank}位 / {outcome.perPlayer.length}人
              </span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[10px]">
              <span>
                作業 <b className="text-(--ink)">{humanWork}pt</b>
              </span>
              <span>
                プレイ <b className="text-(--ink)">{workCards(human)}枚</b>
              </span>
              <span>
                獲得 <b className="text-(--ink)">{human.completed}件</b>
              </span>
              <span>
                報酬 <b className="text-(--ink)">{human.score}pt</b>
              </span>
            </div>
            <p className="mt-1 text-[9px] text-(--mid)">
              チームの作業の <b className="text-(--ink)">{Math.round(share * 100)}%</b>、AI平均の{" "}
              <b className="text-(--ink)">{ratio.toFixed(2)}倍</b>
            </p>
            <p className="mt-0.5 text-[8px] text-(--mid)">
              作業 = 置いたカードの実効レベル合計＋LLMトークン
            </p>
          </section>
        )}

        <div className="mt-5 grid gap-2">
          <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
            <h2 className="serif text-[13px] font-semibold">企業価値の内訳</h2>
            <ul className="mt-1.5 space-y-1 text-[10px]">
              <li className="flex items-baseline justify-between gap-2">
                <span className="text-(--mid)">企業価値</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  +{outcome.teamScore}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-2">
                <span className="text-(--mid)">技術的負債 {outcome.teamDebt} × 2</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{outcome.teamDebt * 2}
                </span>
              </li>
              {outcome.scorePenalty > 0 && (
                <li className="flex items-baseline justify-between gap-2">
                  <span className="text-(--mid)">期限切れ罰則</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{outcome.scorePenalty}
                  </span>
                </li>
              )}
              <li className="flex items-baseline justify-between gap-2 border-t border-(--border) pt-1 font-semibold">
                <span>最終評価</span>
                <span>{outcome.finalScore}</span>
              </li>
            </ul>
            <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-(--mid)">
              <span>完了 {outcome.completed}件</span>
              <span>平均リードタイム {outcome.avgLeadTime.toFixed(1)}日</span>
              <span>期限切れ {outcome.expired}件</span>
              <span>テスト切れ {outcome.testExpired}件</span>
              <span>平均WIP {outcome.avgWip.toFixed(1)}</span>
              <span>
                ボトルネック {outcome.bottleneck ? LANE_LABEL[outcome.bottleneck] : "なし"}
              </span>
            </div>
            <p className="mt-2 text-[9px] text-(--mid)">
              投資家評価の閾値: {state.rules.starOne} / {state.rules.starTwo} /{" "}
              {state.rules.starThree}
            </p>
          </section>
          <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <h2 className="serif text-[13px] font-semibold">チームの成果</h2>
              <span className="text-[8px] text-(--mid)">
                プレイ枚数 / ポイントと、現在のデッキ構成
              </span>
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {outcome.perPlayer.map((player) => (
                <article
                  key={player.id}
                  className={`rounded-sm border bg-(--paper) px-2 py-1.5 ${
                    player.isHuman
                      ? "border-(--terra)/60 ring-1 ring-(--terra)/25"
                      : "border-(--border)"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                      <PlayerIcon player={player} size={11} className="text-(--mid)" />
                      {player.name}
                    </span>
                    <span className="rounded-sm border border-(--border) px-1 text-[7px] text-(--mid)">
                      {player.isHuman ? "自由" : traitSummary(player.weights)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] text-(--mid)">
                    <span>
                      獲得 <b className="text-(--ink)">{player.completed}</b>
                    </span>
                    <span>
                      点 <b className="text-(--ink)">{player.score}</b>
                    </span>
                    <span>WIP {player.avgWip.toFixed(1)}</span>
                    <span>弱い札 {player.lowCards}</span>
                  </div>

                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(["design", "dev", "test"] as const).map((type) => (
                      <div
                        key={type}
                        className={`rounded-sm border px-1 py-0.5 ${CARD_STYLE[type]}`}
                        title={`${player.contributed[type].cards}枚 / ${player.contributed[type].points}pt`}
                      >
                        <span className="flex items-center gap-0.5 text-[7px] opacity-70">
                          <CardTypeIcon type={type} size={7} /> {CARD_LABEL[type]}
                        </span>
                        <span className="block text-[10px] font-medium">
                          {player.contributed[type].cards}枚
                        </span>
                        <span className="block text-[7px] opacity-70">
                          {player.contributed[type].points}pt
                        </span>
                      </div>
                    ))}
                  </div>

                  <p className="mt-1 text-[7.5px] text-(--mid)">
                    デッキ: 設計 {player.deck.design} / 開発 {player.deck.dev} / テスト{" "}
                    {player.deck.test}
                    {player.deck.debt > 0 && (
                      <span className="text-red-600"> / 負債 {player.deck.debt}</span>
                    )}
                  </p>
                </article>
              ))}
            </div>
            <p className="mt-1 text-[8px] text-(--mid)">
              プレイはゲーム中に置いたカード、デッキは手札＋山札＋捨て札。弱い札はlv1以下の報酬カード。
            </p>
          </section>{" "}
        </div>

        <section className="mt-2 rounded-sm border border-(--border) bg-(--paper) p-3">
          <h2 className="serif text-[13px] font-semibold">ボードミーティング</h2>
          <ul className="mt-1 space-y-0.5 text-[10px] text-(--mid)">
            {outcome.tips.map((tip) => (
              <li key={tip}>・{tip}</li>
            ))}
          </ul>
        </section>

        <section className="mt-2 rounded-sm border border-(--border) bg-(--paper) p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="serif flex items-center gap-1 text-[13px] font-semibold">
              <ScrollText size={12} /> ログ
            </h2>
            <span className="text-[8px] text-(--mid)">{state.log.length}件</span>
          </div>
          <div className="mt-1.5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {groupLogByDay(state.log).map((group) => (
              <div key={group.day}>
                <div className="sticky top-0 flex items-center gap-2 bg-(--paper) py-0.5 text-[9px] font-semibold text-(--ink)">
                  <span className="h-px flex-1 bg-(--border)" />
                  Day {group.day}
                  <span className="h-px flex-1 bg-(--border)" />
                </div>
                <ul className="mt-0.5 space-y-0.5">
                  {group.entries.map((entry, index) => (
                    <li
                      key={`${entry.day}-${index}-${entry.message}`}
                      className={`text-[9px] leading-snug ${LOG_TONE[entry.kind]}`}
                    >
                      {entry.message}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {state.log.length === 0 && (
              <p className="text-[9px] text-(--mid)">まだログはありません。</p>
            )}
          </div>
        </section>

        <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[9px] text-(--mid)">
            同じシードなら同じ展開になります（{state.seed}）
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "RESTART", seed: state.seed })}
              className="inline-flex items-center gap-1 rounded-sm border border-(--border) bg-(--paper) px-2 py-1 text-[10px] text-(--mid) transition-colors hover:border-(--terra) hover:text-(--terra)"
            >
              <RefreshCw size={11} /> 同じシードで再挑戦
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: "RESTART", seed: newSeed() })}
              className="inline-flex items-center gap-1 rounded-sm bg-(--terra) px-3 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
            >
              <RotateCcw size={12} /> もう一度（新しいシード）
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
