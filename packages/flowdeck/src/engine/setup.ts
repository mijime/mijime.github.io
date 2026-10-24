import { TEAMMATES } from "../data/teammates";
import { INITIAL_DECK_SPECS, makeCard } from "../data/cards";
import { generateTaskDefs } from "../data/generateTasks";
import { RISK_DEFS } from "../data/risks";
import { emptyGameAnalytics, emptyPlayerAnalytics } from "./analytics/state";
import { startRound } from "./core";
import { makeSnapshot } from "./metrics";
import { pushLog } from "./log";
import { randInt, randomSeed, shuffle } from "./rng";
import { refillOpen } from "./tasks";
import { BASE_RULES, type RuleSet } from "./rules";
import { normalizeGenerationSwing } from "./rules/generation";
import type { GameState, PersonalityWeights, PlayerState } from "./types";
import { TOTAL_DAYS } from "./rules/balance";
import { HUMAN_ID } from "./types";

export function createGame(
  seed: number = randomSeed(),
  totalDays = TOTAL_DAYS,
  aiCount = 4,
  ruleSet: RuleSet = BASE_RULES,
  generationSwing?: number,
): GameState {
  const safeCount = Math.max(3, Math.min(5, aiCount));
  const teamRules = ruleSet.balance.teamRules(safeCount + 1, totalDays);
  const swing = normalizeGenerationSwing(generationSwing ?? ruleSet.generation.swing);
  const state: GameState = {
    version: 27,
    seed,
    rngState: seed >>> 0,
    day: 1,
    totalDays,
    generationSwing: swing,
    phase: "human",
    activePlayerIndex: 0,
    humanId: HUMAN_ID,
    players: [],
    tasks: [],
    taskDefs: [],
    taskDeck: [],
    taskDiscard: [],
    riskDeck: [],
    riskDiscard: [],
    riskStats: {},
    analytics: emptyGameAnalytics(),
    teamScore: 0,
    teamDebt: 0,
    scorePenalty: 0,
    nextCardId: 1,
    nextTaskId: 1,
    log: [],
    metrics: [],
    outcome: null,
    lastAcquisition: null,
    rules: teamRules,
  };

  const characters = shuffle(state, TEAMMATES).slice(0, safeCount);
  const randomWeight = () => Math.round((randInt(state, 2001) / 1000 - 1) * 100) / 100;
  const randomWeights = (): PersonalityWeights => ({
    focus: randomWeight(),
    greed: randomWeight(),
    urgency: randomWeight(),
  });
  const specs = [
    {
      id: HUMAN_ID,
      name: "あなた",
      isHuman: true,
      weights: { focus: 0, greed: 0, urgency: 0 },
    },
    ...characters.map((character) => ({
      id: character.id,
      name: character.name,
      isHuman: false,
      weights: randomWeights(),
    })),
  ];
  let cardId = 1;
  for (const spec of specs) {
    const built = INITIAL_DECK_SPECS.map((card) => makeCard(cardId++, card.type, card.level));
    const deck = shuffle(state, built);
    const player: PlayerState = {
      id: spec.id,
      name: spec.name,
      isHuman: spec.isHuman,
      weights: spec.weights,
      contributed: {
        design: { cards: 0, points: 0 },
        dev: { cards: 0, points: 0 },
        test: { cards: 0, points: 0 },
      },
      deck,
      hand: [],
      discard: [],
      actionsLeft: ruleSet.balance.actionsPerTurn,
      tokens: ruleSet.balance.startingTokens > 0 ? { mi: ruleSet.balance.startingTokens } : {},
      shields: 0,
      actionPenalty: 0,
      completed: 0,
      score: 0,
    };
    state.players.push(player);
    state.analytics.players[player.id] = emptyPlayerAnalytics();
  }
  state.nextCardId = cardId;

  state.taskDefs = generateTaskDefs(state, { ...ruleSet.generation, swing });
  state.taskDeck = shuffle(
    state,
    state.taskDefs.map((task) => task.id),
  );
  state.riskDeck = shuffle(
    state,
    RISK_DEFS.map((card) => card.id),
  );

  refillOpen(state);
  startRound(state, ruleSet);
  state.metrics.push(makeSnapshot(state));
  pushLog(state, `プロジェクト開始: ${totalDays}日間 / ${specs.length}人協力`, "good");

  return state;
}
