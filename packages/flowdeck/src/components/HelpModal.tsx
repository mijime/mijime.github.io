import { X } from "lucide-react";
import type { TeamRules } from "../engine/types";

export function HelpModal({ rules, onClose }: { rules: TeamRules; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center">
      <div className="flow-slide max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-sm border border-(--border) bg-(--paper) shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-(--border) bg-(--toolbar-bg) px-4 py-3">
          <div>
            <h2 className="serif text-lg font-semibold">Flowdeck の遊び方</h2>
            <p className="text-[10px] text-(--mid)">1人＋チームメイト3〜5人 / 共有チームボード</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded-sm border border-(--border) p-1 text-(--mid) hover:border-(--terra) hover:text-(--terra)"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4 text-[11px] leading-relaxed">
          <section>
            <h3 className="serif text-[13px] font-semibold">目的</h3>
            <p className="text-(--mid)">
              miとjimeを売るSaaS企業の四半期。設定した日数で企業価値を最大化します。最終評価は
              「企業価値 − 技術的負債 × 2 − 期限切れ罰則」。企業価値は
              <strong className="text-(--ink)">デッキに残っているタスクカードの合計</strong>、
              技術的負債は
              <strong className="text-(--ink)">デッキに残っている負債カードの枚数</strong>
              です。 投資家評価は {rules.starOne} / {rules.starTwo} / {rules.starThree}
              、技術的負債が {rules.debtLimit} に達すると失敗です。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">1日の流れ</h3>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-(--mid)">
              <li>全員が手札5枚・1日3アクションでスタート</li>
              <li>1アクションずつ順番に行動。あなた → メンバー → あなた …と回る</li>
              <li>BacklogからタスクをReadyへ引き取る（Pull） / カードをタスクに置く</li>
              <li>アクションを使い切ると手番終了。パスすると残りを放棄し、その日はもう動けない</li>
              <li>全員の手番が終わったら日末。SLAトークンと期限切れを処理して次の日へ</li>
              <li>
                インシデントは期限切れ時に罰則。全員負債、担当者負債、スコア減、手札破棄、翌日アクション減、納期トークン追加など
              </li>
            </ol>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">レーン</h3>
            <p className="text-(--mid)">
              Backlog → Ready（設計）→ In Progress（開発）→ Review（テスト）→ Done。
              レーンごとの上限はありません。Ready/In Progress/Review の合計をWIPとして表示し、
              抱えすぎるとリードタイムが伸びることを観察できます。
              要件を満たすと次へ進み、テストまで終えると獲得です。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">カード</h3>
            <p className="text-(--mid)">
              設計・開発・テストのカードを必要なレーンに置きます。獲得したタスクカードは
              <strong className="text-(--ink)">そのまま報酬カード</strong>
              として獲得者のデッキに入ります。 報酬は
              <strong className="text-(--ink)">貢献ポイント最多</strong>
              の人へ。同点はカード枚数、 さらに同点なら最後にカードを置いた人です。
              タスク報酬カードにはスコアが付き、デッキに残っている間だけ企業価値に数えます。
              廃棄するとスコアも消えます。高スコアタスクは設計lv1などの弱いカード、
              CI/CD・リファクタ・ドキュメントなどの改善タスクは強いカード（lv5）になります。
              タスク山札が尽きたら、完了・期限切れのタスク捨て札をシャッフルして山札に戻します。
              インシデントタスクは赤いINC表示。期限切れになると、カードに書かれた罰則が発動します。
              要件トークンは現在フェーズの要求を、納期トークンは納期を1つ軽くします。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">チームメイト</h3>
            <p className="text-(--mid)">
              メンバーは
              <strong className="text-(--ink)">仕上げ↔着手・得点↔整理・納期↔長期</strong>
              の3つの符号付きの重みで動きます。名前・アイコン・性格は開始時にランダムで決まり、人数だけ選べます。
              固定アンカーはなく、メンバーごとに連続的に違う重みを持ちます。
              リザルトでは各員の設計/開発/テストのプレイ枚数とデッキ構成を確認できます。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">miトークン</h3>
            <p className="text-(--mid)">
              タスク報酬の約10%には <strong className="text-(--ink)">miトークン+1</strong> が付く。
              個人トークンで、自分の手番中ならアクションを消費せず、任意のレーンにレベル1作業として置ける。
              トークンを使うと少ないカードでタスクを進められるが、不確実性の処理では作業ピースとして数える。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">カード効果</h3>
            <p className="text-(--mid)">
              一部の投資タスク報酬には効果が付きます。
              <strong className="text-(--ink)">ドロー</strong>は山札から引き、
              <strong className="text-(--ink)">アクション</strong>は追加行動、
              <strong className="text-(--ink)">貢献</strong>は実効レベル+1、
              <strong className="text-(--ink)">負債除去</strong>
              はデッキと技術的負債を1つ減らします。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">テストと不確実性</h3>
            <p className="text-(--mid)">
              テストはテストカード専用。テスト要件を満たすと獲得できます。 獲得時に不確実カードを{" "}
              <strong className="text-(--ink)">作業ピース数</strong>{" "}
              から計算して引き、要求（設計/開発/テスト）が増えます。カード枚数が多いほど、またmiトークンを使うほど、不確実性が上がります。テストの超過分だけ要求αを軽減できます。
              軽減後も届かない場合は、獲得者が負債カード1枚を受け取ります（タスクは獲得）。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">代用</h3>
            <p className="text-(--mid)">
              設計と開発は互いに<b>lv1として代用</b>できます。テストはテストカード専用です。
              共有ボードなので、メンバーのタスクにも人間のカードを置けます。
              初期カードはlv2以上なので、手札が偏っても代用で動けます。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">納期とデッキ</h3>
            <p className="text-(--mid)">
              ラウンド終了時に全タスクへ納期トークンが1個置かれ、納期に達するとトラッシュ。
              タスクに載っていたカードは持ち主の捨て札へ戻ります。
              手札のカードは、1アクションを使って1枚廃棄できます。デッキから完全に除去され、
              タスク報酬カードならスコアが消え、負債カードなら技術的負債が1減ります。
              メンバーはタスク報酬カードを自分からは捨てません。
            </p>
          </section>

          <section>
            <h3 className="serif text-[13px] font-semibold">操作</h3>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-(--mid)">
              <li>手札のカードをクリックして選択</li>
              <li>光っているタスクをクリックして配置</li>
              <li>
                miトークンを持っていると、タスクカード右上にロボットのマークが出る。押すとそのレーンに
                レベル1作業を置く（アクション消費なし）
              </li>
              <li>共有ボードなので、チームメイトのタスクにもカードを置ける</li>
              <li>「パス」で残りアクションを放棄。全員の手番が終わると日末</li>
              <li>アクションが0になると、その日の手番は自動で終了</li>
            </ul>
          </section>

          <section className="flow-inset rounded-sm p-2 text-[10px] text-(--mid)">
            ヒント: 高スコアタスクは即金ですがデッキが重くなります。序盤にCI/CD・リファクタ・
            ドキュメントでデッキを強くし、終盤に高スコアを狙うのが基本です。
          </section>
        </div>
      </div>
    </div>
  );
}
