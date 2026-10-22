import { randInt } from "../engine/rng";
import type { GameState, TaskDef, TaskKind } from "../engine/types";
import { TASK_DEFS } from "./tasks";

const SUBJECTS = [
  "検索",
  "決済",
  "会員登録",
  "カート",
  "レビュー",
  "レコメンド",
  "配送",
  "多言語",
  "アクセシビリティ",
  "購入履歴",
  "ダッシュボード",
  "クーポン",
  "ゲスト購入",
  "パスワード",
  "通知",
  "ポイント",
  "サブスクリプション",
  "在庫",
  "返品",
  "自動テスト",
  "リファクタリング",
  "設計",
  "CI",
  "ドキュメント",
  "監視",
  "セキュリティ",
  "レート制限",
  "バックアップ",
  "データ移行",
  "API",
  "行動分析",
  "モバイル",
  "オフライン",
  "キャッシュ",
  "ログ",
  "可観測性",
  "継続率",
  "料金",
  "サポート",
  "リリース",
  "オンボーディング",
  "チェックアウト",
  "プロフィール",
  "ほしいものリスト",
  "検索フィルタ",
  "通知設定",
  "不正検知",
  "データ同期",
  "認証",
  "本番環境",
  "問い合わせ",
];

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

const INCIDENT_SUBJECTS = [
  "本番環境",
  "API",
  "認証",
  "決済",
  "データ",
  "通知",
  "検索",
  "在庫",
  "問い合わせ",
  "リリース",
  "バックアップ",
  "監視",
];

const INCIDENT_SUFFIXES = ["障害", "停止", "漏えい", "不整合", "遅延", "急増"];

export const HIGH_SCORE_BONUS = 2;

function generateName(state: GameState, kind: TaskKind, used: Set<string>): string {
  const subjects = kind === "incident" ? INCIDENT_SUBJECTS : SUBJECTS;
  const suffixes = kind === "incident" ? INCIDENT_SUFFIXES : NOUN_SUFFIXES;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const subject = subjects[randInt(state, subjects.length)] ?? subjects[0]!;
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

  return defs;
}
