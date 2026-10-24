import type { GameState, Outcome, PlayerOutcome } from "./types";
import { BASE_RULES, type RuleSet } from "./rules";
import { activeTasks, ACTIVE_LANES } from "./rules/lanes";
import { summarizeTip, type OutcomeFacts } from "./rules/tips";

export function computeOutcome(state: GameState, rules: RuleSet = BASE_RULES): Outcome {
  const finalScore =
    state.teamScore - state.teamDebt * rules.balance.debtScorePenalty - state.scorePenalty;
  const failed = state.teamDebt >= state.rules.debtLimit || finalScore < state.rules.starOne;
  const stars = failed
    ? 0
    : finalScore >= state.rules.starThree
      ? 3
      : finalScore >= state.rules.starTwo
        ? 2
        : 1;

  const completed = state.tasks.filter((task) => task.lane === "done");
  const expiredTasks = state.tasks.filter((task) => task.lane === "trash");
  const testExpired = expiredTasks.filter((task) => task.expiredLane === "test").length;

  const perPlayer: PlayerOutcome[] = state.players.map((player) => {
    const wipValues = state.metrics
      .map((snapshot) => snapshot.perPlayer.find((p) => p.id === player.id)?.wip)
      .filter((value): value is number => value !== undefined);
    const avgWip =
      wipValues.length > 0
        ? wipValues.reduce((sum, value) => sum + value, 0) / wipValues.length
        : 0;
    const allCards = [...player.hand, ...player.deck, ...player.discard];
    const deck = { design: 0, dev: 0, test: 0, debt: 0 };
    for (const card of allCards) deck[card.type] += 1;
    return {
      id: player.id,
      name: player.name,
      isHuman: player.isHuman,
      weights: { ...player.weights },
      completed: player.completed,
      score: player.score,
      avgWip,
      contributed: {
        design: { ...player.contributed.design },
        dev: { ...player.contributed.dev },
        test: { ...player.contributed.test },
      },
      deck,
    };
  });

  const leadTimes = completed
    .filter((task) => task.acquiredDay !== null)
    .map((task) => Math.max(1, (task.acquiredDay ?? state.day) - task.revealedDay + 1));
  const avgLeadTime =
    leadTimes.length > 0 ? leadTimes.reduce((sum, value) => sum + value, 0) / leadTimes.length : 0;

  const teamWipValues = state.metrics.map((snapshot) => snapshot.wip);
  const avgWip =
    teamWipValues.length > 0
      ? teamWipValues.reduce((sum, value) => sum + value, 0) / teamWipValues.length
      : activeTasks(state).length;
  const activeByLane = ACTIVE_LANES.map((lane) => ({
    lane,
    count: state.tasks.filter((task) => task.lane === lane).length,
  })).toSorted((a, b) => b.count - a.count);
  const bottleneck = activeByLane[0]?.count ? activeByLane[0].lane : null;

  const debtPressure = state.teamDebt / Math.max(1, state.rules.debtLimit);
  const expiryRate = expiredTasks.length / Math.max(1, completed.length);
  const nextStar =
    stars === 0 ? state.rules.starOne : stars === 1 ? state.rules.starTwo : state.rules.starThree;
  const facts: OutcomeFacts = {
    state,
    finalScore,
    stars,
    completed: completed.length,
    expired: expiredTasks.length,
    testExpired,
    avgWip,
    bottleneck,
    nextStar,
    expiryRate,
    debtPressure,
  };
  const tips = rules.tips.filter((tip) => tip.when(facts)).map((tip) => tip.text(facts));
  if (tips.length === 0) tips.push(summarizeTip(facts));

  return {
    finalScore,
    stars,
    teamScore: state.teamScore,
    teamDebt: state.teamDebt,
    scorePenalty: state.scorePenalty,
    completed: completed.length,
    failed,
    perPlayer,
    avgLeadTime,
    avgWip,
    bottleneck,
    expired: expiredTasks.length,
    testExpired,
    tips: tips.slice(0, 3),
  };
}
