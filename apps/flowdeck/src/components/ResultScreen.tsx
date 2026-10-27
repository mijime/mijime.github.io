import { useState, type Dispatch } from "react";
import { RefreshCw, RotateCcw, ScrollText, Share2, Star } from "lucide-react";
import { Button } from "@mijime/theme/ui";
import type { Action, GameState, PlayerOutcome } from "../engine/types";
import { buildResultSummary } from "../engine/analytics/result";
import { archetypeById } from "../engine/analytics/playerTypes";
import { benchmarkFor } from "../data/benchmark";
import { CARD_LABEL, CARD_STYLE, CardTypeBadge, PlayerIcon, traitSummary } from "./ui";
import { LOG_TONE, groupLogByDay } from "./LogPanel";
import { newSeed } from "../store";
import { buildShareUrl, buildSharedResult } from "../share";
import { SummaryPanel } from "./result/SummaryPanel";
import { PlayerArchetypeBadge } from "./result/PlayerArchetypeBadge";

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

function ContributionStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-(--border) bg-(--paper) px-1 py-1 text-center">
      <span className="block text-[7.5px] text-(--mid)">{label}</span>
      <span className="block text-[11px] font-semibold text-(--ink)">{value}</span>
    </div>
  );
}

export function ResultScreen({ state, dispatch }: Props) {
  const outcome = state.outcome;
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied" | "error">("idle");

  async function handleShare() {
    const shared = buildSharedResult(state);
    if (!shared) return;
    try {
      const url = await buildShareUrl(shared);
      if (navigator.share) {
        try {
          await navigator.share({ title: "flowdeck リザルト", url });
          setShareStatus("shared");
          return;
        } catch {
          // キャンセルされた場合はクリップボードにフォールバックする
        }
      }
      await navigator.clipboard.writeText(url);
      setShareStatus("copied");
    } catch {
      setShareStatus("error");
    }
  }

  if (!outcome) return null;

  const summary = buildResultSummary(state);
  const playerCount = state.players?.length ?? outcome.perPlayer.length;
  const benchmark = benchmarkFor(
    playerCount,
    state.totalDays,
    state.generationSwing ?? 0.1,
    state.aiProfile,
  );
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
          <h1 className="serif text-2xl font-semibold">{state.totalDays}日間のプロジェクト終了</h1>
          <p className="text-[10px] text-(--mid)">
            シード {state.seed} / {state.aiProfile === "strong" ? "有能" : "標準"}チームメイト
          </p>

          <div className="mt-3 flex items-center justify-center gap-1 text-(--accent)">
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
              ? `失敗: 負債上限 ${state.rules.debtLimit} / 星1未満`
              : outcome.stars === 3
                ? "最高評価"
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
          <section className="mt-4 rounded-sm border border-(--accent)/40 bg-(--accent)/5 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-1">
              <div className="flex items-center gap-1.5">
                <h2 className="serif text-[13px] font-semibold">あなたの貢献</h2>
                <PlayerArchetypeBadge id={human.archetypeId} />
              </div>
              <span className="text-[8px] text-(--mid)">
                チーム内 {rank}位 / {outcome.perPlayer.length}人
              </span>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              <ContributionStat label="作業" value={`${humanWork}pt`} />
              <ContributionStat label="プレイ" value={`${workCards(human)}枚`} />
              <ContributionStat label="完了" value={`${human.completed}件`} />
              <ContributionStat label="報酬" value={`${human.score}pt`} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0 text-[8px] text-(--mid)">チームの作業の</span>
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-(--grid)">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-(--accent)"
                  style={{ width: `${Math.round(share * 100)}%` }}
                />
              </span>
              <span className="text-[10px] font-semibold text-(--ink)">
                {Math.round(share * 100)}%
              </span>
              <span className="text-[9px] text-(--mid)">
                AI平均の <b className="text-(--ink)">{ratio.toFixed(2)}倍</b>
              </span>
            </div>
          </section>
        )}

        <SummaryPanel summary={summary} benchmark={benchmark} />

        <div className="mt-2 grid gap-2">
          <section className="rounded-sm border border-(--border) bg-(--paper) p-3">
            <h2 className="serif text-[13px] font-semibold">チームの成果</h2>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {outcome.perPlayer.map((player) => (
                <article
                  key={player.id}
                  className={`rounded-sm border bg-(--paper) px-2 py-1.5 ${
                    player.isHuman
                      ? "border-(--accent)/60 ring-1 ring-(--accent)/25"
                      : "border-(--border)"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium">
                      <PlayerIcon player={player} size={11} className="text-(--mid)" />
                      {player.name}
                    </span>
                    <span className="flex items-center gap-1">
                      <PlayerArchetypeBadge id={player.archetypeId} />
                      <span className="rounded-sm border border-(--border) px-1 text-[7px] text-(--mid)">
                        {player.isHuman ? "自由" : traitSummary(player.weights)}
                      </span>
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] text-(--mid)">
                    <span>
                      完了 <b className="text-(--ink)">{player.completed}</b>
                    </span>
                    <span>
                      点 <b className="text-(--ink)">{player.score}</b>
                    </span>
                    <span>WIP {player.avgWip.toFixed(1)}</span>
                  </div>
                  <p className="mt-0.5 text-[7px] text-(--mid)">
                    {archetypeById(player.archetypeId).description}
                  </p>

                  <div className="mt-1 grid grid-cols-3 gap-1">
                    {(["design", "dev", "test"] as const).map((type) => (
                      <div
                        key={type}
                        className={`rounded-sm border px-1 py-0.5 ${CARD_STYLE[type]}`}
                        title={`${player.contributed[type].cards}枚 / ${player.contributed[type].points}pt`}
                      >
                        <span className="flex items-center gap-0.5 text-[7px] opacity-70">
                          <CardTypeBadge type={type} size={7} /> {CARD_LABEL[type]}
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
                      <span className="text-(--danger)"> / 負債 {player.deck.debt}</span>
                    )}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-2 rounded-sm border border-(--border) bg-(--paper) p-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="serif text-[13px] font-semibold">ボードミーティング</h2>
            <span className="text-[8px] text-(--mid)">星に近づく順</span>
          </div>
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

        <footer className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              className="gap-1 px-2 py-1 text-(--mid)"
            >
              <Share2 size={11} />
              {shareStatus === "shared"
                ? "共有しました"
                : shareStatus === "copied"
                  ? "リンクをコピーしました"
                  : shareStatus === "error"
                    ? "共有できませんでした"
                    : "結果を共有"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => dispatch({ type: "RESTART", seed: state.seed })}
              className="gap-1 px-2 py-1 text-(--mid)"
            >
              <RefreshCw size={11} /> 同じシードで再挑戦
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => dispatch({ type: "RESTART", seed: newSeed() })}
              className="px-3 py-1.5"
            >
              <RotateCcw size={12} /> もう一度（新しいシード）
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
