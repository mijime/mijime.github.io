import type { GameState, Outcome, PlayerOutcome } from "./types";
import { DEBT_SCORE_PENALTY } from "./types";

export function computeOutcome(state: GameState): Outcome {
  const finalScore = state.teamScore - state.teamDebt * DEBT_SCORE_PENALTY - state.scorePenalty;
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
    const lowCards = allCards.filter((card) => card.type !== "debt" && card.level <= 1).length;
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
      lowCards,
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
      : state.tasks.filter(
          (task) => task.lane === "inbox" || task.lane === "wip" || task.lane === "test",
        ).length;
  const activeByLane = (["inbox", "wip", "test"] as const)
    .map((lane) => ({
      lane,
      count: state.tasks.filter((task) => task.lane === lane).length,
    }))
    .toSorted((a, b) => b.count - a.count);
  const bottleneck = activeByLane[0]?.count ? activeByLane[0].lane : null;

  const tips: string[] = [];
  if (state.teamDebt >= state.rules.debtLimit) {
    tips.push("チーム負債が上限に達しました。納期とテストを優先しましょう。");
  }
  if (testExpired > 0) {
    tips.push("テストで納期切れが発生。テストカードの投資か、仲間のテスト支援を増やしましょう。");
  }
  if (avgWip > 6) {
    tips.push("平均WIPが高めです。同時に抱えるタスクを減らすとリードタイムが縮みます。");
  }
  if (state.teamDebt >= 5) {
    tips.push("負債が多めです。1アクション廃棄で負債カードを整理しましょう。");
  }
  if (stars === 3) {
    tips.push("見事なフロー。チームの能力とWIPが噛み合っています。");
  }
  if (tips.length === 0) {
    tips.push("まずは完走。次はテスト投資とWIPの絞り込みを試しましょう。");
  }

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
