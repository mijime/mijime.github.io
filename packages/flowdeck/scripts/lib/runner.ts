import type { ScoredAction } from "../../src/engine/ai";
import type { BotOptions } from "../../src/engine/ai/types";
import { botOptionsForProfile, DEFAULT_AI_PROFILE } from "../../src/engine/ai/profiles";
import { playBotRound } from "../../src/engine/sim/run";
import { createGame } from "../../src/engine/setup";
import type { RuleSet } from "../../src/engine/rules";
import type { GameState, PersonalityWeights, AiProfile } from "../../src/engine/types";

export interface WeightsConfig {
  all?: PersonalityWeights;
  human?: PersonalityWeights;
  ai?: PersonalityWeights;
}

export interface RunConfig {
  seed: number;
  days: number;
  playerCount: number;
  rules: RuleSet;
  generationSwing?: number;
  aiProfile?: AiProfile;
  weights?: WeightsConfig;
  bot?: BotOptions;
  collectDecisions?: boolean;
}

export interface DecisionTrace {
  day: number;
  playerId: string;
  playerName: string;
  kind: "play" | "pull" | "trash";
  score: number;
  phase?: "design" | "dev" | "test";
  support?: boolean;
  substitute?: boolean;
}

export interface RunResult {
  seed: number;
  days: number;
  playerCount: number;
  scenario: string;
  state: GameState;
  decisions: DecisionTrace[];
}

export function applyWeights(config: RunConfig, state: GameState): void {
  const weights = config.weights;
  if (!weights) return;
  for (const player of state.players) {
    const selected = player.isHuman ? (weights.human ?? weights.all) : (weights.ai ?? weights.all);
    if (selected) player.weights = { ...selected };
  }
}

export function runGame(config: RunConfig): RunResult {
  const state = createGame(
    config.seed,
    config.days,
    config.playerCount - 1,
    config.rules,
    config.generationSwing,
    config.aiProfile,
  );
  applyWeights(config, state);
  const decisions: DecisionTrace[] = [];
  let guard = 0;
  while (state.phase !== "over" && guard < config.days + 5) {
    playBotRound(
      state,
      config.collectDecisions
        ? (decision: ScoredAction) => {
            const action = decision.action;
            const active = state.players[state.activePlayerIndex];
            decisions.push({
              day: state.day,
              playerId: active?.id ?? "",
              playerName: active?.name ?? "",
              kind: action.kind,
              score: decision.score,
              phase: action.kind === "play" ? action.type : undefined,
              support: action.kind === "play" ? action.support : undefined,
              substitute: action.kind === "play" ? action.card.type !== action.type : undefined,
            });
          }
        : undefined,
      config.rules,
      config.bot ?? botOptionsForProfile(config.aiProfile ?? DEFAULT_AI_PROFILE),
    );
    guard += 1;
  }
  return {
    seed: config.seed,
    days: config.days,
    playerCount: config.playerCount,
    scenario: config.rules.id,
    state,
    decisions,
  };
}

export interface SeedRange {
  from: number;
  to: number;
}

export function seedsInRange(range: SeedRange): number[] {
  const seeds: number[] = [];
  for (let seed = range.from; seed <= range.to; seed += 1) seeds.push(seed);
  return seeds;
}

export function runSeeds(
  base: Omit<RunConfig, "seed">,
  seeds: number[],
  onProgress?: (done: number, total: number) => void,
): RunResult[] {
  return seeds.map((seed, index) => {
    const result = runGame({ ...base, seed });
    if (onProgress && (index + 1) % Math.max(1, Math.ceil(seeds.length / 10)) === 0) {
      onProgress(index + 1, seeds.length);
    }
    return result;
  });
}
