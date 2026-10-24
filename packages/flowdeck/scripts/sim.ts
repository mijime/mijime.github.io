import process from "node:process";
import { playBotRound } from "../src/engine/reducer";
import { createGame } from "../src/engine/setup";
import type { ScoredAction } from "../src/engine/ai";
import { resolveRules, RULE_SETS, type RuleSet } from "../src/engine/rules";
import type { GameState, PersonalityWeights, TaskCard } from "../src/engine/types";
import { TOTAL_DAYS } from "../src/engine/rules/balance";
import { RISK_BY_ID } from "../src/data/risks";

interface Options {
  runs: number;
  seed: number | null;
  days: number;
  players: number;
  strategies: boolean;
  tasks: boolean;
  ai: boolean;
  risks: boolean;
  ruleset: string;
}

interface Strategy {
  name: string;
  weights: PersonalityWeights;
}

const STRATEGIES: Strategy[] = [
  { name: "neutral", weights: { focus: 0, greed: 0, urgency: 0 } },
  { name: "finish", weights: { focus: 1, greed: 0, urgency: 0 } },
  { name: "tidy", weights: { focus: 0, greed: -1, urgency: 0 } },
  { name: "deadline", weights: { focus: 0, greed: 0, urgency: 1 } },
  { name: "finish+tidy", weights: { focus: 1, greed: -1, urgency: 0 } },
  { name: "finish+deadline", weights: { focus: 1, greed: 0, urgency: 1 } },
  { name: "finish+tidy+deadline", weights: { focus: 1, greed: -1, urgency: 1 } },
  { name: "moderate", weights: { focus: 0.5, greed: -0.5, urgency: 0.5 } },
  { name: "score", weights: { focus: 0, greed: 1, urgency: 0 } },
  { name: "score+deadline", weights: { focus: 0, greed: 1, urgency: 1 } },
  { name: "start", weights: { focus: -1, greed: 0, urgency: 0 } },
  { name: "long", weights: { focus: 0, greed: 0, urgency: -1 } },
];

function parseArgs(argv: string[]): Options {
  const get = (name: string): string | undefined => {
    const index = argv.indexOf(`--${name}`);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const runs = Number(get("runs") ?? "300");
  const seed = get("seed");
  const days = Number(get("days") ?? String(TOTAL_DAYS));
  const playerCount = Number(get("players") ?? "5");
  const ruleset = get("ruleset") ?? "base";
  return {
    runs: Number.isFinite(runs) && runs > 0 ? Math.floor(runs) : 300,
    seed: seed !== undefined && Number.isFinite(Number(seed)) ? Number(seed) : null,
    days: Number.isFinite(days) && days > 0 ? Math.floor(days) : TOTAL_DAYS,
    players:
      Number.isFinite(playerCount) && playerCount >= 4 && playerCount <= 6
        ? Math.floor(playerCount)
        : 5,
    strategies: argv.includes("--strategies"),
    tasks: argv.includes("--tasks"),
    ai: argv.includes("--ai"),
    risks: argv.includes("--risks"),
    ruleset,
  };
}

function playOnce(
  seed: number,
  days: number,
  playerCount: number,
  rules: RuleSet,
  weights?: PersonalityWeights,
  onDecision?: (decision: ScoredAction) => void,
): GameState {
  const state = createGame(seed, days, playerCount - 1, rules);
  if (weights) {
    for (const player of state.players) player.weights = { ...weights };
  }
  let guard = 0;
  while (state.phase !== "over" && guard < days + 5) {
    playBotRound(state, onDecision, rules);
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

function median(values: number[]): number {
  return percentile(
    values.toSorted((a, b) => a - b),
    0.5,
  );
}

function printDistribution(label: string, values: number[]): void {
  const sorted = values.toSorted((a, b) => a - b);
  console.log(
    `  ${label}: min=${sorted[0]} p10=${percentile(sorted, 0.1)} p25=${percentile(sorted, 0.25)} median=${percentile(sorted, 0.5)} p75=${percentile(sorted, 0.75)} p90=${percentile(sorted, 0.9)} p95=${percentile(sorted, 0.95)} max=${sorted.at(-1)} avg=${average(values).toFixed(1)}`,
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
  const state = playOnce(seed, days, options.players, resolveRules(options.ruleset));
  const outcome = state.outcome;
  console.log(`\nseed=${seed} days=${days}`);
  console.log(
    JSON.stringify(
      {
        outcome,
        teamScore: state.teamScore,
        teamDebt: state.teamDebt,
        scorePenalty: state.scorePenalty,
        finalScore:
          state.teamScore -
          state.teamDebt * resolveRules(options.ruleset).balance.debtScorePenalty -
          state.scorePenalty,
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
  const cardStats = new Map<
    string,
    { n: number; req: number; score: number; level: number; value: number }
  >();
  const tipRuns = new Map<string, number>();
  let tipTotal = 0;
  const rules = resolveRules(options.ruleset).balance.teamRules(options.players, options.days);
  const debtLimit = rules.debtLimit;
  const perPlayer = new Map<
    string,
    {
      completed: number[];
      score: number[];
      wip: number[];
      design: number[];
      dev: number[];
      test: number[];
      deckDesign: number[];
      deckDev: number[];
      deckTest: number[];
    }
  >();

  for (let seed = 1; seed <= options.runs; seed += 1) {
    const state = playOnce(seed, options.days, options.players, resolveRules(options.ruleset));
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

    const seenTips = new Set<string>();
    for (const tip of outcome.tips) {
      tipTotal += 1;
      const category = tipCategory(tip);
      if (seenTips.has(category)) continue;
      seenTips.add(category);
      tipRuns.set(category, (tipRuns.get(category) ?? 0) + 1);
    }

    for (const def of state.taskDefs) {
      const category = taskClass(def);
      const entry = cardStats.get(category) ?? {
        n: 0,
        req: 0,
        score: 0,
        level: 0,
        value: 0,
      };
      entry.n += 1;
      entry.req += def.requirements.design + def.requirements.dev + def.requirements.test;
      entry.score += def.score;
      entry.level += def.reward.level;
      entry.value += def.score + def.reward.level + (def.reward.effect ? 1 : 0);
      cardStats.set(category, entry);
    }

    for (const player of outcome.perPlayer) {
      const entry = perPlayer.get(player.name) ?? {
        completed: [],
        score: [],
        wip: [],
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
      entry.design.push(player.contributed.design.cards);
      entry.dev.push(player.contributed.dev.cards);
      entry.test.push(player.contributed.test.cards);
      entry.deckDesign.push(player.deck.design);
      entry.deckDev.push(player.deck.dev);
      entry.deckTest.push(player.deck.test);
      perPlayer.set(player.name, entry);
    }
  }

  console.log(
    `\n[weights] runs=${scores.length} days=${options.days} players=${options.players} ruleset=${options.ruleset}`,
  );
  printDistribution("final score", scores);
  printDistribution("team score", teamScores);
  printDistribution("debt", debts);
  printDistribution("completed", completed);
  printDistribution("avg WIP (team)", avgWips);
  printDistribution("avg lead time", leadTimes);
  console.log(
    `  expired tasks avg=${average(expired).toFixed(2)} / test expired avg=${average(testExpired).toFixed(2)}`,
  );
  console.log(
    `  debt>=${debtLimit}: ${debts.filter((d) => d >= debtLimit).length} / max=${Math.max(...debts)}`,
  );
  console.log("  stars by thresholds:");
  console.log(
    `    ${rules.starOne}/${rules.starTwo}/${rules.starThree} (debt<${debtLimit}): ${starCounts(scores, { one: rules.starOne, two: rules.starTwo, three: rules.starThree }, debtLimit, debts)}`,
  );

  const sortedScores = scores.toSorted((a, b) => a - b);
  const sortedDebts = debts.toSorted((a, b) => a - b);
  console.log(
    `  recommended: stars ${percentile(sortedScores, 0.25)}/${percentile(sortedScores, 0.75)}/${percentile(sortedScores, 0.9)} / debtLimit ${percentile(sortedDebts, 0.95)} (current ${rules.starOne}/${rules.starTwo}/${rules.starThree} / ${rules.debtLimit})`,
  );

  console.log("  generated card stats (value = score + reward.level + effect bonus):");
  for (const category of ["standard", "high-score", "effect", "incident"]) {
    const entry = cardStats.get(category);
    if (!entry || entry.n === 0) continue;
    console.log(
      `    ${category.padEnd(10)} n=${(entry.n / Math.max(1, scores.length)).toFixed(1)}/run req=${(entry.req / entry.n).toFixed(1)} score=${(entry.score / entry.n).toFixed(2)} lv=${(entry.level / entry.n).toFixed(2)} value/req=${(entry.value / entry.req).toFixed(3)}`,
    );
  }

  console.log("  board meeting (runs with tip):");
  const tipEntries = [...tipRuns.entries()].toSorted((a, b) => b[1] - a[1]);
  console.log(
    `    avg tips=${(tipTotal / Math.max(1, scores.length)).toFixed(2)} / ${tipEntries
      .map(
        ([category, count]) =>
          `${category}=${((count / Math.max(1, scores.length)) * 100).toFixed(1)}%`,
      )
      .join(" / ")}`,
  );

  console.log("  per player:");
  for (const [name, entry] of perPlayer) {
    console.log(
      `    ${name}: completed=${average(entry.completed).toFixed(1)} score=${average(entry.score).toFixed(1)} play(設/開/テ)=${average(entry.design).toFixed(1)}/${average(entry.dev).toFixed(1)}/${average(entry.test).toFixed(1)} deck(設/開/テ)=${average(entry.deckDesign).toFixed(1)}/${average(entry.deckDev).toFixed(1)}/${average(entry.deckTest).toFixed(1)} avgWIP=${average(entry.wip).toFixed(1)}`,
    );
  }
}

function summarizeStrategies(options: Options): void {
  const rules = resolveRules(options.ruleset).balance.teamRules(options.players, options.days);
  const rows = STRATEGIES.map((strategy) => {
    const scores: number[] = [];
    const debts: number[] = [];
    let star3 = 0;
    let completed = 0;
    let expired = 0;
    for (let seed = 1; seed <= options.runs; seed += 1) {
      const state = playOnce(
        seed,
        options.days,
        options.players,
        resolveRules(options.ruleset),
        strategy.weights,
      );
      const outcome = state.outcome;
      if (!outcome) continue;
      scores.push(outcome.finalScore);
      debts.push(state.teamDebt);
      if (outcome.stars === 3) star3 += 1;
      completed += outcome.completed;
      expired += outcome.expired;
    }
    return {
      name: strategy.name,
      median: median(scores),
      star3,
      debt: median(debts),
      completed: completed / Math.max(1, scores.length),
      expired: expired / Math.max(1, scores.length),
    };
  });

  console.log(
    `\n[strategies] runs=${options.runs} days=${options.days} players=${options.players} thresholds=${rules.starOne}/${rules.starTwo}/${rules.starThree}`,
  );
  for (const row of rows.toSorted((a, b) => b.median - a.median)) {
    console.log(
      `  ${row.name.padEnd(24)} median=${String(row.median).padStart(3)} star3=${String(row.star3).padStart(3)}/${options.runs} debt=${row.debt} done=${row.completed.toFixed(1)} exp=${row.expired.toFixed(1)}`,
    );
  }
}

function taskClass(task: {
  kind?: TaskCard["kind"];
  reward: TaskCard["reward"];
  score: number;
}): string {
  if (task.kind === "incident") return "incident";
  if (task.reward.effect) return "effect";
  if (task.score >= 4) return "high-score";
  return "standard";
}

function tipCategory(tip: string): string {
  if (tip.startsWith("3つ星")) return "praise";
  if (tip.startsWith("負債上限")) return "debt-limit";
  if (tip.startsWith("星1まであと")) return "score-fail";
  if (tip.startsWith("Reviewでの期限切れ")) return "test-expiry";
  if (tip.startsWith("平均WIP")) return "high-wip";
  if (tip.startsWith("期限切れ")) return "expiry-rate";
  if (tip.startsWith("負債")) return "debt-pressure";
  if (tip.startsWith("Reviewがボトルネック")) return "bottleneck";
  return "summary";
}

function summarizeTasks(options: Options): void {
  const classDone = new Map<string, number>();
  const classExpired = new Map<string, number>();
  const scoreDone = new Map<number, number>();
  const scoreExpired = new Map<number, number>();
  const rewardDone = new Map<number, number>();
  const rewardExpired = new Map<number, number>();
  const poolScore: number[] = [];
  const poolRequirement: number[] = [];
  const poolReward: number[] = [];

  for (let seed = 1; seed <= options.runs; seed += 1) {
    const state = playOnce(seed, options.days, options.players, resolveRules(options.ruleset));
    const defs = state.taskDefs;
    poolScore.push(defs.reduce((sum, task) => sum + task.score, 0));
    poolRequirement.push(
      defs.reduce((sum, task) => {
        const req = task.requirements;
        return sum + req.design + req.dev + req.test;
      }, 0),
    );
    poolReward.push(average(defs.map((task) => task.reward.level)));

    for (const task of state.tasks) {
      if (task.lane !== "done" && task.lane !== "trash") continue;
      const key = taskClass(task);
      const classMap = task.lane === "done" ? classDone : classExpired;
      classMap.set(key, (classMap.get(key) ?? 0) + 1);
      const scoreMap = task.lane === "done" ? scoreDone : scoreExpired;
      scoreMap.set(task.score, (scoreMap.get(task.score) ?? 0) + 1);
      const rewardMap = task.lane === "done" ? rewardDone : rewardExpired;
      rewardMap.set(task.reward.level, (rewardMap.get(task.reward.level) ?? 0) + 1);
    }
  }

  console.log(
    `\n[tasks] runs=${options.runs} days=${options.days} players=${options.players} ruleset=${options.ruleset}`,
  );
  console.log(
    `  generated pool score: min=${Math.min(...poolScore)} median=${median(poolScore)} max=${Math.max(...poolScore)}`,
  );
  console.log(
    `  generated requirement: min=${Math.min(...poolRequirement)} median=${median(poolRequirement)} max=${Math.max(...poolRequirement)}`,
  );
  console.log(
    `  generated avg reward: min=${Math.min(...poolReward).toFixed(2)} median=${median(poolReward).toFixed(2)} max=${Math.max(...poolReward).toFixed(2)}`,
  );
  console.log("  completion by class:");
  for (const key of ["standard", "high-score", "effect", "incident"]) {
    const done = classDone.get(key) ?? 0;
    const exp = classExpired.get(key) ?? 0;
    console.log(
      `    ${key.padEnd(10)} done=${done} exp=${exp} rate=${(done / Math.max(1, done + exp)).toFixed(2)}`,
    );
  }
  console.log("  completion by score:");
  for (const score of [...new Set([...scoreDone.keys(), ...scoreExpired.keys()])].toSorted(
    (a, b) => a - b,
  )) {
    const done = scoreDone.get(score) ?? 0;
    const exp = scoreExpired.get(score) ?? 0;
    console.log(
      `    score${String(score).padStart(2)} done=${done} exp=${exp} rate=${(done / Math.max(1, done + exp)).toFixed(2)}`,
    );
  }
  console.log("  completion by reward level:");
  for (const level of [...new Set([...rewardDone.keys(), ...rewardExpired.keys()])].toSorted(
    (a, b) => a - b,
  )) {
    const done = rewardDone.get(level) ?? 0;
    const exp = rewardExpired.get(level) ?? 0;
    console.log(
      `    lv${level} done=${done} exp=${exp} rate=${(done / Math.max(1, done + exp)).toFixed(2)}`,
    );
  }
}

function summarizeAi(options: Options): void {
  const kinds = new Map<string, number>();
  const playTypes = new Map<string, number>();
  const scoreTotals = new Map<string, number>();
  let support = 0;
  let own = 0;
  let substitute = 0;
  let totalActions = 0;

  for (let seed = 1; seed <= options.runs; seed += 1) {
    playOnce(
      seed,
      options.days,
      options.players,
      resolveRules(options.ruleset),
      undefined,
      (decision) => {
        totalActions += 1;
        const kind = decision.action.kind;
        kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
        scoreTotals.set(kind, (scoreTotals.get(kind) ?? 0) + decision.score);
        if (decision.action.kind === "play") {
          playTypes.set(decision.action.type, (playTypes.get(decision.action.type) ?? 0) + 1);
          if (decision.action.support) support += 1;
          else own += 1;
          if (decision.action.card.type !== decision.action.type) substitute += 1;
        }
      },
    );
  }

  const runs = Math.max(1, options.runs);
  const per = (value: number): string => (value / runs).toFixed(1);
  const playCount = kinds.get("play") ?? 0;
  const playTotal = Math.max(1, playCount);

  console.log(
    `\n[ai] runs=${options.runs} days=${options.days} players=${options.players} ruleset=${options.ruleset}`,
  );
  console.log(
    `  actions/game: play=${per(playCount)} pull=${per(kinds.get("pull") ?? 0)} trash=${per(kinds.get("trash") ?? 0)} total=${per(totalActions)}`,
  );
  console.log(
    `  play lanes: design=${per(playTypes.get("design") ?? 0)} dev=${per(playTypes.get("dev") ?? 0)} test=${per(playTypes.get("test") ?? 0)}`,
  );
  console.log(
    `  support=${((support / playTotal) * 100).toFixed(1)}% / own=${((own / playTotal) * 100).toFixed(1)}% / substitute=${substitute} (${((substitute / playTotal) * 100).toFixed(2)}%)`,
  );
  console.log(
    `  avg chosen score: play=${((scoreTotals.get("play") ?? 0) / Math.max(1, playCount)).toFixed(1)} pull=${((scoreTotals.get("pull") ?? 0) / Math.max(1, kinds.get("pull") ?? 0)).toFixed(1)} trash=${((scoreTotals.get("trash") ?? 0) / Math.max(1, kinds.get("trash") ?? 0)).toFixed(1)}`,
  );
  console.log("  note: greedy 1-step heuristic. Not a lookahead/optimal solver.");
}

function summarizeRisks(options: Options): void {
  const totals = new Map<
    string,
    { title: string; drawn: number; absorbed: number; unmet: number; debt: number }
  >();
  let riskDebt = 0;
  let teamDebt = 0;

  for (let seed = 1; seed <= options.runs; seed += 1) {
    const state = playOnce(seed, options.days, options.players, resolveRules(options.ruleset));
    for (const [id, stat] of Object.entries(state.riskStats)) {
      const title = RISK_BY_ID[id]?.title ?? id;
      const entry = totals.get(title) ?? { title, drawn: 0, absorbed: 0, unmet: 0, debt: 0 };
      entry.drawn += stat.drawn;
      entry.absorbed += stat.absorbed;
      entry.unmet += stat.unmet;
      entry.debt += stat.debt;
      totals.set(title, entry);
    }
    riskDebt += Object.values(state.riskStats).reduce((sum, stat) => sum + stat.debt, 0);
    teamDebt += state.teamDebt;
  }

  const runs = Math.max(1, options.runs);
  console.log(
    `\n[risks] runs=${options.runs} days=${options.days} players=${options.players} ruleset=${options.ruleset}`,
  );
  console.log(
    `  risk debt/game=${(riskDebt / runs).toFixed(2)} / final team debt/game=${(teamDebt / runs).toFixed(2)}`,
  );

  const rows = [...totals.values()]
    .map((stat) => ({
      title: stat.title,
      drawn: stat.drawn,
      absorbed: stat.absorbed,
      unmet: stat.unmet,
      debt: stat.debt,
      rate: stat.drawn > 0 ? stat.debt / stat.drawn : 0,
    }))
    .toSorted((a, b) => b.debt - a.debt || b.drawn - a.drawn);

  for (const row of rows) {
    console.log(
      `  ${row.title.padEnd(14)} draw=${(row.drawn / runs).toFixed(1)}/game absorbed=${(row.absorbed / runs).toFixed(1)} unmet=${(row.unmet / runs).toFixed(1)} debt=${(row.debt / runs).toFixed(2)}/game debt/draw=${row.rate.toFixed(2)} share=${riskDebt > 0 ? ((row.debt / riskDebt) * 100).toFixed(1) : "0.0"}%`,
    );
  }
}

function printHelp(): void {
  console.log(`Flowdeck balance simulation

Usage:
  pnpm --filter @mijime/flowdeck sim
  pnpm --filter @mijime/flowdeck sim -- --runs 1000
  pnpm --filter @mijime/flowdeck sim -- --seed 42
  pnpm --filter @mijime/flowdeck sim -- --days 20
  pnpm --filter @mijime/flowdeck sim -- --strategies
  pnpm --filter @mijime/flowdeck sim -- --tasks
  pnpm --filter @mijime/flowdeck sim -- --ai
  pnpm --filter @mijime/flowdeck sim -- --risks

Options:
  --runs <n>       number of seeds (default: 300)
  --seed <n>       run one seed and print details
  --days <n>       project length (default: 10)
  --players <n>    4 | 5 | 6 (default: 5)
  --ruleset <id>   rule set to use (${Object.keys(RULE_SETS).join(", ")}; default: base)
  --strategies     compare fixed focus/greed/urgency policies
  --tasks          task pool and completion/expiry breakdown
  --ai             AI action mix and chosen-score averages
  --risks          risk-card draw/absorb/debt distribution
  --help           show this help

Team:
  名前・アイコン・性格・タスク名は開始時にランダム。
  focus / greed / urgency の3つの符号付きの重みでプレイ・Pull・廃棄を比較する。`);
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  if (options.seed !== null) {
    showSeed(options.seed, options.days, options);
    return;
  }

  if (options.strategies || options.tasks || options.ai || options.risks) {
    if (options.strategies) summarizeStrategies(options);
    if (options.tasks) summarizeTasks(options);
    if (options.ai) summarizeAi(options);
    if (options.risks) summarizeRisks(options);
    return;
  }

  console.log("Flowdeck balance simulation");
  console.log(`  days=${options.days} runs=${options.runs} players=${options.players}`);
  summarize(options);
}

main();
