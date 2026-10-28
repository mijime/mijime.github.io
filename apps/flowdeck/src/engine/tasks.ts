import { TASK_BY_ID } from "../data/tasks";
import { RELIC_CAP } from "../data/relics";
import { RISK_BY_ID } from "../data/risks";
import { addDebt } from "./debt";
import { pushLog } from "./log";
import {
  chooseAiRelic,
  chooseAiRelicDiscard,
  grantRelic,
  relicChoicesFor,
  teamRelics,
} from "./relics";
import { playerById, recomputeTeamStats, taskContributions, taskSum } from "./metrics";
import { BASE_RULES, type RuleSet } from "./rules";
import { applyPenalty } from "./rules/penalties";
import { resolveRisk } from "./rules/risks";
import type { GameState, TaskCard } from "./types";
import { shuffle } from "./rng";

export function createTask(state: GameState, defId: string): TaskCard {
  const def = state.taskDefs.find((task) => task.id === defId) ?? TASK_BY_ID[defId];
  if (!def) throw new Error(`unknown task: ${defId}`);
  return {
    id: `t${state.nextTaskId++}`,
    defId: def.id,
    title: def.title,
    theme: def.theme,
    requirements: { ...def.requirements },
    score: def.score,
    deadline: def.deadline,
    tokens: 0,
    reward: def.reward ? { ...def.reward } : undefined,
    tokenWork: { design: 0, dev: 0, test: 0 },
    kind: def.kind ?? "normal",
    penalty: def.penalty ? { ...def.penalty } : undefined,
    lane: "open",
    ownerId: null,
    attached: [],
    revealedDay: state.day,
    acquiredDay: null,
    expiredLane: null,
  };
}

export function refillOpen(state: GameState): void {
  let open = state.tasks.filter((task) => task.lane === "open").length;
  while (open < state.rules.openTasks) {
    if (state.taskDeck.length === 0) {
      if (state.taskDiscard.length === 0) break;
      state.taskDeck = shuffle(state, state.taskDiscard);
      state.taskDiscard = [];
      pushLog(state, "タスクの捨て札を山札に戻してシャッフル", "info");
    }
    const defId = state.taskDeck.shift();
    if (!defId) break;
    const task = createTask(state, defId);
    state.tasks.push(task);
    if (task.kind === "relic") {
      pushLog(state, `レリックタスク出現: ${task.title}`, "bad");
    }
    open += 1;
  }
}

export function returnAttachedCards(state: GameState, task: TaskCard): void {
  for (const attached of task.attached) {
    const owner = state.players.find((player) => player.id === attached.ownerId);
    if (owner) owner.discard.push(attached.card);
  }
  task.attached = [];
}

function drawRiskDef(state: GameState): string | null {
  if (state.riskDeck.length === 0) {
    if (state.riskDiscard.length === 0) return null;
    state.riskDeck = shuffle(state, state.riskDiscard);
    state.riskDiscard = [];
  }
  const defId = state.riskDeck.shift();
  if (!defId) return null;
  state.riskDiscard.push(defId);
  return defId;
}

function recordRisk(
  state: GameState,
  id: string,
  outcome: { absorbed?: number; unmet?: number; debt?: number },
): void {
  state.riskStats ??= {};
  const stat = (state.riskStats[id] ??= { drawn: 0, absorbed: 0, unmet: 0, debt: 0 });
  stat.drawn += 1;
  stat.absorbed += outcome.absorbed ?? 0;
  stat.unmet += outcome.unmet ?? 0;
  stat.debt += outcome.debt ?? 0;
}

function acquireTask(state: GameState, task: TaskCard, rules: RuleSet): void {
  if (!task.ownerId) return;
  const puller = playerById(state, task.ownerId);
  const contributions = taskContributions(state, task);
  const recipient = contributions[0] ? playerById(state, contributions[0].playerId) : puller;
  const base = task.requirements;
  const designSum = taskSum(task, "design");
  const devSum = taskSum(task, "dev");
  const testSum = taskSum(task, "test");
  const pieces =
    task.attached.length + task.tokenWork.design + task.tokenWork.dev + task.tokenWork.test;
  // 要求合計に対する作業ピース数（カード＋LLMトークン）の比率で0〜3枚引く。
  const requirementTotal = base.design + base.dev + base.test;
  let draws = 0;
  if (requirementTotal > 0) {
    const threshold = rules.balance.riskDraws.find(
      (entry) => pieces * entry.denominator >= requirementTotal * entry.numerator,
    );
    draws = threshold?.draws ?? 0;
  }
  const added = { design: 0, dev: 0, test: 0 };
  const requirements: { id: string; phase: "design" | "dev" | "test"; amount: number }[] = [];
  const wildcardCards: { id: string; amount: number }[] = [];
  const riskReports: { title: string; description: string }[] = [];
  let riskTokens = 0;

  for (let i = 0; i < draws; i += 1) {
    const defId = drawRiskDef(state);
    if (!defId) break;
    const def = RISK_BY_ID[defId];
    if (!def) continue;
    riskReports.push({ title: def.title, description: def.description });
    const resolution = resolveRisk(rules.risks, def.effect);
    if (resolution.requirement) {
      const { phase, amount } = resolution.requirement;
      added[phase] += amount;
      requirements.push({ id: def.id, phase, amount });
    } else if (resolution.wildcard) {
      wildcardCards.push({ id: def.id, amount: resolution.wildcard });
    } else {
      if (resolution.token) riskTokens += resolution.token;
      recordRisk(state, def.id, { absorbed: 1 });
    }
    pushLog(state, `リスク: ${def.title}`, resolution.tone);
  }

  // 要求は合算せず、リスクカード1枚ごとに作業で賄えたか判定する。
  // ベース要件を超えた分（余剰作業）だけがリスクを吸収できる。
  const surplus = {
    design: Math.max(0, designSum - base.design),
    dev: Math.max(0, devSum - base.dev),
    test: Math.max(0, testSum - base.test),
  };
  let unmet = 0;
  for (const requirement of requirements) {
    if (surplus[requirement.phase] >= requirement.amount) {
      surplus[requirement.phase] -= requirement.amount;
      recordRisk(state, requirement.id, { absorbed: 1 });
    } else {
      unmet += 1;
      recordRisk(state, requirement.id, { unmet: 1, debt: 1 });
    }
  }
  // 仕様変更は任意フェーズの余剰で吸収する。大きい余剰から使う。
  for (const card of wildcardCards) {
    let unmetUnits = 0;
    for (let i = 0; i < card.amount; i += 1) {
      const phase = (["test", "dev", "design"] as const).reduce(
        (best, candidate) => (surplus[candidate] > surplus[best] ? candidate : best),
        "test",
      );
      if (surplus[phase] > 0) {
        surplus[phase] -= 1;
      } else {
        unmetUnits += 1;
      }
    }
    unmet += unmetUnits;
    recordRisk(state, card.id, unmetUnits === 0 ? { absorbed: 1 } : { unmet: 1, debt: unmetUnits });
  }

  if (riskTokens > 0) {
    recipient.tokens.mi = (recipient.tokens.mi ?? 0) + riskTokens;
    pushLog(state, `${recipient.name}: 想定外の好機でLLMトークン +${riskTokens}`, "good");
  }

  if (unmet > 0) {
    addDebt(state, recipient, unmet, "risk");
    pushLog(state, `リスク未吸収: ${task.title}（負債 +${unmet}）`, "bad");
  }

  const relicTask = task.kind === "relic";
  const relicChoices = relicTask ? relicChoicesFor(state) : [];
  const contributionText = contributions.length > 0 ? ` / 受取者: ${recipient.name}` : "";

  // モーダルは人間が受取者になった時だけ対象にする。AI の完了で上書きしない。
  // relicタスクは専用の選択モーダルを使う。
  if (recipient.isHuman && !relicTask) {
    state.lastAcquisition = {
      id: task.id,
      day: state.day,
      taskTitle: task.title,
      theme: task.theme,
      pullerId: puller.id,
      pullerName: puller.name,
      recipientId: recipient.id,
      recipientName: recipient.name,
      contributions,
      score: task.score,
      reward: task.reward ? { ...task.reward } : undefined,
      risks: riskReports,
      added: { ...added },
      unmet: unmet > 0,
      debt: unmet,
      teamDebt: state.teamDebt,
    };
  }

  task.lane = "done";
  task.acquiredDay = state.day;
  if (!relicTask) state.taskDiscard.push(task.defId);
  recipient.completed += 1;
  pushLog(
    state,
    relicTask
      ? `完了: ${task.title}（チームレリック報酬${contributionText}）`
      : `完了: ${task.title}（企業価値 +${task.score}${contributionText}）`,
    "good",
  );

  if (relicTask) {
    if (relicChoices.length === 0) {
      pushLog(state, "レリック候補がありません", "bad");
    } else if (recipient.isHuman) {
      state.pendingRelic = {
        taskTitle: task.title,
        playerId: recipient.id,
        options: relicChoices,
        currentRelics: [...teamRelics(state)],
        replace: teamRelics(state).length >= RELIC_CAP,
      };
      pushLog(state, `${recipient.name}: レリックを選択`, "good");
    } else {
      const pick = chooseAiRelic(relicChoices);
      if (pick) {
        const discard =
          teamRelics(state).length >= RELIC_CAP
            ? chooseAiRelicDiscard(teamRelics(state))
            : undefined;
        grantRelic(state, pick, discard);
      }
    }
  } else if (task.reward) {
    recipient.discard.push({
      id: state.nextCardId++,
      type: task.reward.type,
      level: task.reward.level,
      title: task.title,
      effect: task.reward.effect,
      score: task.score,
      theme: task.theme,
    });
    pushLog(
      state,
      `報酬カード: ${task.title}（${task.reward.type} lv${task.reward.level}）を捨て札へ`,
      "good",
    );
  }
  recomputeTeamStats(state);

  returnAttachedCards(state, task);
}

/** 要件を満たしたタスクを次のレーンへ進める */
export function advanceTasks(state: GameState, rules: RuleSet = BASE_RULES): void {
  let changed = true;
  let guard = 0;
  while (changed && guard < 50) {
    guard += 1;
    changed = false;
    for (const task of state.tasks) {
      if (!task.ownerId) continue;
      if (task.lane === "inbox") {
        if (taskSum(task, "design") < task.requirements.design) continue;
        task.lane = "wip";
        pushLog(state, `In Progress へ: ${task.title}`, "info");
        changed = true;
      } else if (task.lane === "wip") {
        if (taskSum(task, "dev") < task.requirements.dev) continue;
        if (task.requirements.test > 0) {
          task.lane = "test";
          pushLog(state, `Review へ: ${task.title}`, "info");
          changed = true;
        } else {
          acquireTask(state, task, rules);
          changed = true;
        }
      } else if (task.lane === "test") {
        if (taskSum(task, "test") < task.requirements.test) continue;
        acquireTask(state, task, rules);
        changed = true;
      }
    }
  }
}

export function canPull(state: GameState): boolean {
  return state.tasks.some((task) => task.lane === "open");
}

function applyExpiryPenalty(state: GameState, task: TaskCard, rules: RuleSet): void {
  if (!task.penalty) return;
  applyPenalty(rules.penalties, { state, task }, task.penalty);
}

export function expireTasks(state: GameState, rules: RuleSet = BASE_RULES): void {
  for (const task of state.tasks) {
    if (task.lane === "done" || task.lane === "trash") continue;
    task.tokens += 1;
    if (task.tokens < task.deadline) continue;

    const previous = task.lane;
    task.expiredLane = previous;
    task.lane = "trash";
    if (task.kind !== "relic") state.taskDiscard.push(task.defId);

    if (task.penalty) applyExpiryPenalty(state, task, rules);

    if (previous === "open") {
      pushLog(state, `期限切れ（Backlog）: ${task.title}`, "bad");
      continue;
    }

    returnAttachedCards(state, task);
    pushLog(state, `期限切れ: ${task.title}（カードは捨て札へ）`, "bad");
  }
  refillOpen(state);
}
