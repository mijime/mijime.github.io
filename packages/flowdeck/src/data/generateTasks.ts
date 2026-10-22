import { randInt, shuffle } from "../engine/rng";
import type { GameState, TaskDef, TaskKind } from "../engine/types";
import { TASK_DEFS } from "./tasks";

const JIME_SUBJECTS = [
  "jime",
  "jime応答",
  "jime推論",
  "jime品質",
  "jime安全性",
  "jime評価",
  "jime配信",
  "jimeコスト",
  "jime速度",
  "jime API",
  "jimeストリーミング",
  "jimeオンデバイス",
  "jimeガードレール",
  "jimeマルチテナント",
  "jime利用分析",
  "jime課金",
  "jimeプロンプト",
  "jimeコンテキスト",
];

const MI_SUBJECTS = [
  "mi",
  "miコードレビュー",
  "miリポジトリ理解",
  "miテスト生成",
  "miパッチ生成",
  "miエージェント",
  "mi権限",
  "miワークフロー",
  "mi評価",
];

const SAAS_SUBJECTS = [
  "課金",
  "SSO",
  "オンボーディング",
  "解約導線",
  "SLA",
  "サポート",
  "請求",
  "管理画面",
  "APIキー",
  "監査ログ",
  "エンタープライズ",
  "顧客データ",
  "契約",
];

const INCIDENT_JIME_SUBJECTS = [
  "jime",
  "jime API",
  "jime推論",
  "jimeモデル",
  "jime配信",
  "jime品質",
  "jime評価",
  "jimeガードレール",
];

const INCIDENT_MI_SUBJECTS = [
  "mi",
  "miエージェント",
  "miコードレビュー",
  "miテスト生成",
  "miワークフロー",
];

const INCIDENT_SAAS_SUBJECTS = [
  "顧客データ",
  "課金",
  "SSO",
  "GPU",
  "プロンプト",
  "監査ログ",
  "請求",
];

function pick<T>(state: GameState, pool: T[]): T {
  return pool[randInt(state, pool.length)] ?? pool[0]!;
}

function pickNormalSubject(state: GameState): string {
  const roll = randInt(state, 100);
  if (roll < 60) return pick(state, JIME_SUBJECTS);
  if (roll < 85) return pick(state, MI_SUBJECTS);
  return pick(state, SAAS_SUBJECTS);
}

function pickIncidentSubject(state: GameState): string {
  const roll = randInt(state, 100);
  if (roll < 65) return pick(state, INCIDENT_JIME_SUBJECTS);
  if (roll < 85) return pick(state, INCIDENT_MI_SUBJECTS);
  return pick(state, INCIDENT_SAAS_SUBJECTS);
}

const NOUN_SUFFIXES = [
  "改善",
  "見直し",
  "整備",
  "強化",
  "統合",
  "対応",
  "刷新",
  "再構築",
  "自動化",
];

const INCIDENT_SUFFIXES = ["障害", "停止", "漏えい", "不整合", "遅延", "急増", "不足", "過負荷"];

export const HIGH_SCORE_BONUS = 2;

function generateName(state: GameState, kind: TaskKind, used: Set<string>): string {
  const suffixes = kind === "incident" ? INCIDENT_SUFFIXES : NOUN_SUFFIXES;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const subject = kind === "incident" ? pickIncidentSubject(state) : pickNormalSubject(state);
    const suffix = suffixes[randInt(state, suffixes.length)] ?? suffixes[0]!;
    const name =
      kind === "incident"
        ? `${subject}${suffix}`
        : randInt(state, 2) === 0
          ? `${subject}の${suffix}`
          : `${subject}${suffix}`;
    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }
  return `タスク${used.size + 1}`;
}

/**
 * 固定テンプレートを種に、名前・要求・スコア/報酬のバランスを毎ゲーム生成する。
 * アーキタイプ（通常/投資/インシデント）はテンプレート側で担保する。
 */
export function generateTaskDefs(state: GameState): TaskDef[] {
  const usedNames = new Set<string>();
  const defs: TaskDef[] = [];

  for (const template of TASK_DEFS) {
    const kind = template.kind ?? "normal";
    const requirements = { ...template.requirements };
    const phases = ["design", "dev", "test"] as const;
    const phase = phases[randInt(state, phases.length)] ?? "design";
    const delta = randInt(state, 3) - 1;
    const minimum = kind === "incident" ? 1 : 2;
    requirements[phase] = Math.max(minimum, requirements[phase] + delta);

    let score = template.score;
    let rewardLevel = template.reward.level;
    if (kind === "normal" && score > 0) {
      const roll = randInt(state, 5);
      if (roll === 0 && rewardLevel > 1) {
        score = Math.min(5, score + 1);
        rewardLevel -= 1;
      } else if (roll === 1 && score > 0 && rewardLevel < 5) {
        score -= 1;
        rewardLevel += 1;
      }
    }

    if (kind === "normal" && score >= 4) {
      score += HIGH_SCORE_BONUS;
    }

    defs.push({
      ...template,
      title: generateName(state, kind, usedNames),
      requirements,
      score,
      reward: { ...template.reward, level: rewardLevel },
      penalty: template.penalty ? { ...template.penalty } : undefined,
    });
  }

  const tokenCount = Math.round(defs.length * 0.1);
  const eligible = defs.filter(
    (task) => task.kind !== "incident" && task.score > 0 && !task.reward.effect,
  );
  for (const task of shuffle(state, eligible).slice(0, tokenCount)) {
    task.reward.effect = { kind: "token", token: "mi", amount: 1 };
  }

  return defs;
}
