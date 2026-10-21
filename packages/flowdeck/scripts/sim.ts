import process from "node:process";
import { playBotRound } from "../src/engine/reducer";
import { createGame } from "../src/engine/setup";
import type { GameState } from "../src/engine/types";
import { DEBT_SCORE_PENALTY, TOTAL_DAYS, teamRulesFor } from "../src/engine/types";

interface Options {
  runs: number;
  seed: number | null;
  days: number;
  players: number;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const runs = Number(get("runs") ?? "300");
  const seed = get("seed");
  const days = Number(get("days") ?? String(TOTAL_DAYS));
  const playerCount = Number(get("players") ?? "5");
  return {
    runs: Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 300,
    seed: seed !== undefined && Number.isFinite(Number(seed)) ? Number(seed) : null,
    days: Number.isFinite(days) && days > 0 ? Math.floor(days) : TOTAL_DAYS,
    players:
      Number.isFinite(playerCount) && playerCount >= 4 && playerCount <= 6
        ? Math.floor(playerCount)
        : 5,
  };
}

function playOnce(seed: number, days: number, playerCount: number): GameState {
  const state = createGame(seed, days, playerCount - 1);
  let guard = 0;
  while (state.phase !== "over" && guard < days + 5) {
    playBotRound(state);
    guard += 1;
  }
  return state;
}

function percentile(sorted: number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function printDistribution(label: string, values: number[]): void {
  const sorted = values.toSorted((a, b) => a - b);
  console.log(
    `  ${label}: min=${sorted[0]} p10=${percentile(sorted, 0.1)} p25=${percentile(sorted, 0.25)} median=${percentile(sorted, 0.5)} p75=${percentile(sorted, 0.75)} p90=${percentile(sorted, 0.9)} max=${sorted.at(-1)} avg=${average(values).toFixed(1)}`,
  );
}

function starCounts(
  scores: number[],
  thresholds: { one: number; two: number; three: number },
  debtLimit: number,
  debts: number[],
): string {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < scores.length; i += 1) {
    const score = scores[i] ?? 0;
    const debt = debts[i] ?? 0;
    const stars =
      debt >= debtLimit || score < thresholds.one
        ? 0
        : score >= thresholds.three
          ? 3
          : score >= thresholds.two
            ? 2
            : 1;
    counts[stars] = (counts[stars] ?? 0) + 1;
  }
  return `0=${counts[0]} 1=${counts[1]} 2=${counts[2]} 3=${counts[3]}`;
}

function showSeed(seed: number, days: number, options: Options): void {
  const state = playOnce(seed, days, options.players);
  const outcome = state.outcome;
  console.log(`\nseed=${seed} days=${days}`);
  console.log(
    JSON.stringify(
      {
        outcome,
        teamScore: state.teamScore,
        teamDebt: state.teamDebt,
        finalScore: state.teamScore - state.teamDebt * DEBT_SCORE_PENALTY,
        players: state.players.map((player) => ({
          name: player.name,
          weights: player.weights,
          completed: player.completed,
          score: player.score,
          contributed: player.contributed,
          trashed: state.log.filter(
            (entry) =>
              entry.message.startsWith(`${player.name}:`) && entry.message.includes("を廃棄"),
          ).length,
          hand: player.hand.map((card) => `${card.type}${card.level}`),
          deck: player.deck.length,
          discard: player.discard.length,
        })),
        done: state.tasks
          .filter((task) => task.lane === "done")
          .map((task) => ({ title: task.title, owner: task.ownerId, day: task.acquiredDay })),
        expired: state.tasks
          .filter((task) => task.lane === "trash")
          .map((task) => ({ title: task.title, lane: task.expiredLane })),
      },
      null,
      2,
    ),
  );
}

function summarize(options: Options): void {
  const scores: number[] = [];
  const teamScores: number[] = [];
  const debts: number[] = [];
  const completed: number[] = [];
  const avgWips: number[] = [];
  const leadTimes: number[] = [];
  const expired: number[] = [];
  const testExpired: number[] = [];
  const lowCards: number[] = [];
  const rules = teamRulesFor(options.players, options.days);
  const debtLimit = rules.debtLimit;
  const perPlayer = new Map<
    string,
    {
      completed: number[];
      score: number[];
      wip: number[];
      low: number[];
      design: number[];
      dev: number[];
      test: number[];
      deckDesign: number[];
      deckDev: number[];
      deckTest: number[];
    }
  >();

  for (let seed = 1; seed <= options.runs; seed += 1) {
    const state = playOnce(seed, options.days, options.players);
    const outcome = state.outcome;
    if (!outcome) continue;
    scores.push(outcome.finalScore);
    teamScores.push(state.teamScore);
    debts.push(state.teamDebt);
    completed.push(outcome.completed);
    const teamWips = state.metrics.map((snapshot) => snapshot.wip);
    avgWips.push(teamWips.length > 0 ? average(teamWips) : 0);
    leadTimes.push(outcome.avgLeadTime);
    expired.push(outcome.expired);
    testExpired.push(outcome.testExpired);
    lowCards.push(outcome.perPlayer.reduce((sum, player) => sum + player.lowCards, 0));
    for (const player of outcome.perPlayer) {
      const entry = perPlayer.get(player.name) ?? {
        completed: [],
        score: [],
        wip: [],
        low: [],
        design: [],
        dev: [],
        test: [],
        deckDesign: [],
        deckDev: [],
        deckTest: [],
      };
      entry.completed.push(player.completed);
      entry.score.push(player.score);
      entry.wip.push(player.avgWip);
      entry.low.push(player.lowCards);
      entry.design.push(player.contributed.design.cards);
      entry.dev.push(player.contributed.dev.cards);
      entry.test.push(player.contributed.test.cards);
      entry.deckDesign.push(player.deck.design);
      entry.deckDev.push(player.deck.dev);
      entry.deckTest.push(player.deck.test);
      perPlayer.set(player.name, entry);
    }
  }

  console.log(`\n[weights] runs=${scores.length} days=${options.days} players=${options.players}`);
  printDistribution("final score", scores);
  printDistribution("team score", teamScores);
  printDistribution("debt", debts);
  printDistribution("completed", completed);
  printDistribution("avg WIP (team)", avgWips);
  printDistribution("avg lead time", leadTimes);
  console.log(
    `  expired tasks avg=${average(expired).toFixed(2)} / test expired avg=${average(testExpired).toFixed(2)} / low cards avg=${average(lowCards).toFixed(2)}`,
  );
  console.log(
    `  debt>=${debtLimit}: ${debts.filter((d) => d >= debtLimit).length} / max=${Math.max(...debts)}`,
  );
  console.log("  stars by thresholds:");
  console.log(
    `    ${rules.starOne}/${rules.starTwo}/${rules.starThree} (debt<${debtLimit}): ${starCounts(scores, { one: rules.starOne, two: rules.starTwo, three: rules.starThree }, debtLimit, debts)}`,
  );
  console.log("  per player:");
  for (const [name, entry] of perPlayer) {
    console.log(
      `    ${name}: completed=${average(entry.completed).toFixed(1)} score=${average(entry.score).toFixed(1)} play(設/開/テ)=${average(entry.design).toFixed(1)}/${average(entry.dev).toFixed(1)}/${average(entry.test).toFixed(1)} deck(設/開/テ)=${average(entry.deckDesign).toFixed(1)}/${average(entry.deckDev).toFixed(1)}/${average(entry.deckTest).toFixed(1)} avgWIP=${average(entry.wip).toFixed(1)} lowCards=${average(entry.low).toFixed(1)}`,
    );
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (process.argv.includes("--help")) {
    console.log(`Flowdeck balance simulation

Usage:
  pnpm --filter @mijime/flowdeck sim
  pnpm --filter @mijime/flowdeck sim -- --runs 1000
  pnpm --filter @mijime/flowdeck sim -- --seed 42
  pnpm --filter @mijime/flowdeck sim -- --days 10

Options:
  --runs <n>   number of seeds (default: 300)
  --seed <n>   run one seed and print details
  --days <n>   project length (default: 10)
  --players <n>  4 | 5 | 6 (default: 5)
  --help       show this help

AI:
  名前・アイコン・性格は開始時にランダム。
  focus / greed / urgency の3つの符号付きの重みでプレイ・Pull・廃棄を比較する。`);
    return;
  }

  if (options.seed !== null) {
    showSeed(options.seed, options.days, options);
    return;
  }

  console.log("Flowdeck balance simulation");
  console.log(`  days=${options.days} runs=${options.runs} players=${options.players}`);
  summarize(options);
}

main();
