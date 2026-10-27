import { describe, it, expect } from "vitest";
import { createEngine, dispatch, startGame } from "../src/engine/engine.ts";
import { legalActions, decideAction } from "../src/engine/ai.ts";
import { scoreAction } from "../src/engine/ai-scoring.ts";
import { controllers } from "../src/engine/scoring.ts";
import { cap as capHelper } from "../src/engine/helpers.ts";
import type { Engine, FactionKey } from "../src/types.ts";

const SEL = ["A", "B", "C", "D", "E", "F", "G"];
const POOL = ["honoo", "rashinban", "shokan", "seiyaku", "monsho", "izumi"];
const FULL_TILES = [
  "tile.dispatchAny",
  "tile.promote",
  "tile.acquire",
  "tile.cohabit",
  "tile.deepen",
  "tile.dispatchAp",
];

function choose(e: Engine, pi: number, allowNew: boolean): ReturnType<typeof decideAction> {
  let best = { type: "pass" } as ReturnType<typeof decideAction>;
  let bestScore = 0;
  const allActions = legalActions(e, pi);
  const filtered = allowNew ? allActions : allActions.filter((a) => a.type !== "upgrade");
  for (const a of filtered) {
    const s = scoreAction(e, pi, a);
    if (s > bestScore) {
      best = a;
      bestScore = s;
    }
  }
  return best;
}

function runGame(
  factions: FactionKey[],
  seed: number,
  allowNew: boolean,
): {
  majorityChanges: number;
  upgradeCount: number;
  actionCounts: Record<string, number>;
  winnerVP: number;
  vpGap: number;
  totalActions: number;
  openSeatsLate: number;
  recallCount: number;
} {
  const e = createEngine();
  startGame(e, factions.length - 1, SEL, seed, POOL, FULL_TILES, factions);

  const snapshots: Record<string, number | null> = {};
  let majorityChanges = 0;
  let upgradeCount = 0;
  let lastRound = 0;
  const actionCounts: Record<string, number> = {
    pass: 0,
    dispatch: 0,
    promote: 0,
    acquire: 0,
    deepen: 0,
    upgrade: 0,
  };
  let totalActions = 0;
  let openSeatsSamples = 0;
  let totalOpenSeats = 0;
  let recallCount = 0;

  let guard = 0;
  while (!e.over && guard++ < 5000) {
    if (e.pending?.kind === "action") {
      const action = choose(e, e.pending.pi, allowNew);
      totalActions++;
      const actionType = action.type;
      if (actionType in actionCounts) {
        actionCounts[actionType]++;
      }
      if (action.type === "upgrade") upgradeCount++;
      dispatch(e, { type: "chooseAction", action });
    } else if (e.pending?.kind === "pickCountry") {
      dispatch(e, { type: "pickCountry", key: null });
    } else {
      dispatch(e, { type: "tick" });
    }

    if (e.S.round !== lastRound && e.S.round >= 4) {
      for (const key of SEL) {
        const bc = e.S.board.find((b) => b.key === key);
        if (!bc) continue;
        const { first } = controllers(bc);
        const sole = first.length === 1 ? first[0] : null;
        const prevSole = snapshots[key];
        if (prevSole !== undefined && prevSole !== sole) {
          majorityChanges++;
        }
        snapshots[key] = sole;
      }
      let roundOpenSeats = 0;
      for (const key of SEL) {
        const bc = e.S.board.find((b) => b.key === key);
        if (!bc) continue;
        const cap = capHelper(e.S, key);
        roundOpenSeats += Math.max(0, cap - bc.pawns.length);
      }
      totalOpenSeats += roundOpenSeats;
      openSeatsSamples++;
      lastRound = e.S.round;
    }
  }

  for (const key of SEL) {
    const bc = e.S.board.find((b) => b.key === key);
    if (!bc) continue;
    const { first } = controllers(bc);
    const sole = first.length === 1 ? first[0] : null;
    const prevSole = snapshots[key];
    if (prevSole !== undefined && prevSole !== sole) {
      majorityChanges++;
    }
    snapshots[key] = sole;
  }

  expect(e.over).toBe(true);

  recallCount = e.log.filter((l) => l.key === "log.recall").length;

  // Extract winner VP and gap
  const finalResults = e.finalResults || [];
  const sorted = [...finalResults].toSorted((a, b) => b.total - a.total);
  const winnerVP = sorted[0]?.total ?? 0;
  const loserVP = sorted[sorted.length - 1]?.total ?? 0;
  const vpGap = winnerVP - loserVP;

  const openSeatsLate = openSeatsSamples > 0 ? totalOpenSeats / openSeatsSamples : 0;

  return {
    majorityChanges,
    upgradeCount,
    actionCounts,
    winnerVP,
    vpGap,
    totalActions,
    openSeatsLate,
    recallCount,
  };
}

describe("board-dynamism", () => {
  it("measures majority changes with and without new actions", () => {
    const conditions: Array<{ name: string; factions: FactionKey[] }> = [
      { name: "4-player", factions: ["senkyoshi", "shisai", "junkyosha", "kenja"] },
      { name: "3-player", factions: ["kaitakusha", "shinpika", "senkyoshi"] },
    ];

    for (const cond of conditions) {
      console.log(`\n=== ${cond.name} ===`);
      const baselineResults = [];
      const newResults = [];

      for (let seed = 0; seed < 5; seed++) {
        const base = runGame(cond.factions, seed, false);
        baselineResults.push(base);
        console.log(`  Baseline seed ${seed}: ${base.majorityChanges} majority changes`);
      }

      for (let seed = 0; seed < 5; seed++) {
        const newData = runGame(cond.factions, seed, true);
        newResults.push(newData);
        console.log(
          `  New seed ${seed}: ${newData.majorityChanges} majority changes, upgrade: ${newData.upgradeCount}`,
        );
      }

      // Aggregate metrics for baseline
      const baseActionCounts = {
        pass: 0,
        dispatch: 0,
        promote: 0,
        acquire: 0,
        deepen: 0,
        upgrade: 0,
      };
      let baseTotalChanges = 0;
      let baseTotalVP = 0;
      let baseTotalGap = 0;
      let baseTotalActions = 0;
      let baseTotalOpenSeats = 0;
      let baseTotalRecalls = 0;
      for (const r of baselineResults) {
        baseTotalChanges += r.majorityChanges;
        baseTotalVP += r.winnerVP;
        baseTotalGap += r.vpGap;
        baseTotalActions += r.totalActions;
        baseTotalOpenSeats += r.openSeatsLate;
        baseTotalRecalls += r.recallCount;
        for (const [type, count] of Object.entries(r.actionCounts)) {
          baseActionCounts[type as keyof typeof baseActionCounts] += count;
        }
      }
      const baseAvgChanges = (baseTotalChanges / baselineResults.length).toFixed(1);
      const baseAvgVP = (baseTotalVP / baselineResults.length).toFixed(1);
      const baseAvgGap = (baseTotalGap / baselineResults.length).toFixed(1);
      const baseAvgActions = (baseTotalActions / baselineResults.length).toFixed(1);
      const baseAvgOpenSeats = (baseTotalOpenSeats / baselineResults.length).toFixed(1);
      const baseAvgRecalls = (baseTotalRecalls / baselineResults.length).toFixed(1);

      // Aggregate metrics for with-upgrade
      const newActionCounts = {
        pass: 0,
        dispatch: 0,
        promote: 0,
        acquire: 0,
        deepen: 0,
        upgrade: 0,
      };
      let newTotalChanges = 0;
      let newTotalVP = 0;
      let newTotalGap = 0;
      let newTotalActions = 0;
      let newTotalOpenSeats = 0;
      let newTotalRecalls = 0;
      for (const r of newResults) {
        newTotalChanges += r.majorityChanges;
        newTotalVP += r.winnerVP;
        newTotalGap += r.vpGap;
        newTotalActions += r.totalActions;
        newTotalOpenSeats += r.openSeatsLate;
        newTotalRecalls += r.recallCount;
        for (const [type, count] of Object.entries(r.actionCounts)) {
          newActionCounts[type as keyof typeof newActionCounts] += count;
        }
      }
      const newAvgChanges = (newTotalChanges / newResults.length).toFixed(1);
      const newAvgVP = (newTotalVP / newResults.length).toFixed(1);
      const newAvgGap = (newTotalGap / newResults.length).toFixed(1);
      const newAvgActions = (newTotalActions / newResults.length).toFixed(1);
      const newAvgOpenSeats = (newTotalOpenSeats / newResults.length).toFixed(1);
      const newAvgRecalls = (newTotalRecalls / newResults.length).toFixed(1);

      console.log(
        `  Baseline: actions/game ${baseAvgActions} | pass ${baseActionCounts.pass}, dispatch ${baseActionCounts.dispatch}, promote ${baseActionCounts.promote}, acquire ${baseActionCounts.acquire}, deepen ${baseActionCounts.deepen} | winnerVP ${baseAvgVP} gap ${baseAvgGap} | lateMajChanges ${baseAvgChanges}/game | openSeatsLate ${baseAvgOpenSeats} | recalls ${baseAvgRecalls}`,
      );
      console.log(
        `  With upgrade: actions/game ${newAvgActions} | pass ${newActionCounts.pass}, dispatch ${newActionCounts.dispatch}, promote ${newActionCounts.promote}, acquire ${newActionCounts.acquire}, deepen ${newActionCounts.deepen}, upgrade ${newActionCounts.upgrade} | winnerVP ${newAvgVP} gap ${newAvgGap} | lateMajChanges ${newAvgChanges}/game | openSeatsLate ${newAvgOpenSeats} | recalls ${newAvgRecalls}`,
      );
    }
  });
});
