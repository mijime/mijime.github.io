import { Star } from "lucide-react";
import { Button } from "@mijime/theme/ui";
import { benchmarkFor } from "../data/benchmark";
import { relicDescription, relicName } from "../data/relics";
import type { PlayerOutcome } from "../engine/types";
import type { SharedResult } from "../share";
import { SummaryPanel } from "./result/SummaryPanel";
import { PlayerArchetypeBadge } from "./result/PlayerArchetypeBadge";
import { CARD_LABEL, PlayerIcon } from "./ui";

function workPoints(player: PlayerOutcome): number {
  return (
    player.contributed.design.points +
    player.contributed.dev.points +
    player.contributed.test.points
  );
}

export function SharedResultScreen({ result }: { result: SharedResult }) {
  const { summary } = result;
  const benchmark = benchmarkFor(
    summary.players.length || 4,
    result.totalDays,
    result.generationSwing,
    result.aiProfile,
  );

  function openFlowdeck() {
    const url = new URL(window.location.href);
    url.searchParams.delete("r");
    window.location.href = url.toString();
  }

  return (
    <div className="flow-root">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <header className="text-center">
          <p className="text-[9px] uppercase tracking-widest text-(--mid)">共有されたリザルト</p>
          <h1 className="serif mt-1 text-2xl font-semibold">
            {result.totalDays}日間のプロジェクト
          </h1>
          <p className="text-[10px] text-(--mid)">シード {result.seed} / 標準チームメイト</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-(--accent)">
            {Array.from({ length: 3 }, (_, index) => (
              <Star
                key={index}
                size={30}
                className={index < summary.score.stars ? "fill-current" : "text-(--border)"}
              />
            ))}
          </div>
          <p className="serif mt-1 text-5xl font-semibold leading-none">
            {summary.score.finalScore}
            <span className="ml-1 text-sm font-normal text-(--mid)">pt</span>
          </p>
        </header>

        <section className="mt-4 rounded-sm border border-(--border) bg-(--paper) p-3">
          <h2 className="serif text-[13px] font-semibold">チームの成果</h2>
          {(result.relics ?? []).length > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-[8px] text-(--accent)">
              レリック:
              {(result.relics ?? []).map((id) => (
                <span
                  key={id}
                  className="rounded-sm border border-(--accent)/40 bg-(--accent)/10 px-1 py-0.5"
                  title={relicDescription(id)}
                >
                  {relicName(id)}
                </span>
              ))}
            </p>
          )}
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {summary.players.map((player) => (
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
                  <PlayerArchetypeBadge id={player.archetypeId} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[8px] text-(--mid)">
                  <span>
                    作業 <b className="text-(--ink)">{workPoints(player)}pt</b>
                  </span>
                  <span>
                    完了 <b className="text-(--ink)">{player.completed}</b>
                  </span>
                  <span>
                    点 <b className="text-(--ink)">{player.score}</b>
                  </span>
                  {((player.actionsGained ?? 0) > 0 || (player.cardsDrawn ?? 0) > 0) && (
                    <span className="text-(--accent)">
                      追加AP <b>+{player.actionsGained ?? 0}</b> / ドロー{" "}
                      <b>{player.cardsDrawn ?? 0}</b>
                    </span>
                  )}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {(["design", "dev", "test"] as const).map((type) => (
                    <div
                      key={type}
                      className="rounded-sm border border-(--border) px-1 py-0.5 text-[7px] text-(--mid)"
                    >
                      {CARD_LABEL[type]} {player.contributed[type].cards}枚
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <SummaryPanel summary={summary} benchmark={benchmark} />

        <section className="mt-2 rounded-sm border border-(--border) bg-(--paper) p-3">
          <h2 className="serif text-[13px] font-semibold">ボードミーティング</h2>
          <ul className="mt-1 space-y-0.5 text-[10px] text-(--mid)">
            {summary.tips.map((tip) => (
              <li key={tip}>・{tip}</li>
            ))}
          </ul>
        </section>

        <footer className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={openFlowdeck} className="px-3 py-1.5">
            flowdeck を開く
          </Button>
        </footer>
      </div>
    </div>
  );
}
