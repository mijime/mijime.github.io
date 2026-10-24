# @mijime/flowdeck

1人＋チームメイト3〜5人の協力型デッキ構築カンバン。
舞台は、コーディングエージェント **mi** と軽量LLM **jime** を開発・販売するSaaS企業。全員がmiを使い、jimeのLLM事業で企業価値を伸ばす。ブラウザUIとヘッドレスシミュレータを実装している。

サイトでは `/apps/flowdeck/` で遊べる。

## 開発

```bash
pnpm --filter @mijime/flowdeck dev
pnpm --filter @mijime/flowdeck build
pnpm --filter @mijime/flowdeck test
pnpm --filter @mijime/flowdeck check
```

## シミュレーション

```bash
pnpm --filter @mijime/flowdeck sim
pnpm --filter @mijime/flowdeck sim -- --runs 1000
pnpm --filter @mijime/flowdeck sim -- --all
pnpm --filter @mijime/flowdeck sim -- --seed 42
pnpm --filter @mijime/flowdeck sim -- --trace 42
pnpm --filter @mijime/flowdeck sim -- --days 10
pnpm --filter @mijime/flowdeck sim -- --days 20
pnpm --filter @mijime/flowdeck sim -- --days 30
pnpm --filter @mijime/flowdeck sim -- --strategies
pnpm --filter @mijime/flowdeck sim -- --trends
pnpm --filter @mijime/flowdeck sim -- --correlations
pnpm --filter @mijime/flowdeck sim -- --insights
pnpm --filter @mijime/flowdeck sim -- --tasks
pnpm --filter @mijime/flowdeck sim -- --ai
pnpm --filter @mijime/flowdeck sim -- --risks
pnpm --filter @mijime/flowdeck sim -- --players 4
pnpm --filter @mijime/flowdeck sim -- --players 6
pnpm --filter @mijime/flowdeck sim -- --matrix days=10,20,30 players=4,5,6
pnpm --filter @mijime/flowdeck sim -- --scenarios base,substitution,no-tokens
pnpm --filter @mijime/flowdeck sim -- --sweep balance.startingTokens=0,1,2
pnpm --filter @mijime/flowdeck sim -- --compare base,substitution
pnpm --filter @mijime/flowdeck sim -- --weights focus=1,greed=-1,urgency=1
pnpm --filter @mijime/flowdeck sim -- --human-weights focus=0.5,greed=0,urgency=0.5
pnpm --filter @mijime/flowdeck sim -- --runs 1000 --format csv --out /tmp/flowdeck.csv
pnpm --filter @mijime/flowdeck sim -- --runs 1000 --format json --out /tmp/flowdeck.json
pnpm --filter @mijime/flowdeck sim -- --help
```

`--players` は `4` / `5` / `6`（デフォルト 5）、`--days` は `10` / `20` / `30`（デフォルト 10）。シミュレーション内の人間も同じ3軸モデルで動く。

### レポート

- `--all`: overview / trends / correlations / strategies / tasks / ai / risks / insights をまとめて表示
- `--trends`: 日ごとのスコア・負債・WIP・レーン滞留・完了数の平均
- `--correlations`: focus / greed / urgency と個人成績の相関、席順、人間 vs AI
- `--strategies`: 固定した性格方針どうしの比較。`random(roster)` がランダム編成の基準
- `--tasks`: タスク生成プール、アーキタイプ・スコア・報酬・効果別の完了率
- `--ai`: プレイ / Pull / 廃棄、支援率、代用率、トークン使用、選択スコア
- `--risks`: リスクカード別のドロー・吸収・未吸収・負債
- `--insights`: 星3率・失敗率・Review期限切れ・リスク発生源・性格相関から注目点を自動生成

overview にはプレイヤータイプの分布と「タイプ×星3率」、ボードミーティング指摘の星3率も表示する。どのタイプ・どの指摘が星3と相関するかをシミュレーションで確認できる。

### 条件を変えて比較する

- `--matrix days=10,20 players=4,5,6`: 日数×人数のマトリクス
- `--scenarios base,substitution,no-tokens`: プリセット比較
- `--sweep balance.startingTokens=0,1,2`: 1パラメータの感度分析
- `--compare base,substitution`: 2条件の平均差と bootstrap 95%信頼区間
- `--weights` / `--human-weights` / `--ai-weights`: 性格方針を固定

シナリオプリセット: `base` / `substitution` / `no-tokens` / `token-rich` / `fast` / `slow` / `long-hand` / `tight-debt` / `loose-debt` / `budget` / `value` / `stable` / `volatile`。

スイープできるキー: `actionsPerTurn` / `handSize` / `debtScorePenalty` / `startingTokens` / `allowSubstitution` / `openTasks` / `debtLimit` / `starOne` / `starTwo` / `starThree` / `generation` / `generationSwing`。

### タスクの得損（generationSwing）

要求量の揺らぎを `generationSwing` で注入できる。通常タスクは `1 ± generationSwing` 倍、効果・インシデントは半分の振幅。

| swing | 通常タスク | 効果/インシデント |
| ----: | ---------- | ----------------- |
|   0.0 | 1.00       | 1.00              |
|   0.1 | 0.9〜1.1   | 0.95〜1.05        |
|   0.2 | 0.8〜1.2   | 0.9〜1.1          |

`0.8〜1.2` の得損を入れたいときは `0.2` を指定する。既定値は `0.1`（現行バランス）。

```bash
pnpm --filter @mijime/flowdeck sim -- --scenarios stable,base,volatile --runs 1000
pnpm --filter @mijime/flowdeck sim -- --sweep generationSwing=0,0.1,0.2 --runs 1000
```

### 出力

- `--format text`: 人が読むレポート（デフォルト）
- `--format json`: メタ情報・スコア分布・星率・全ラン行
- `--format csv`: 1ラン1行
- `--out <path>`: JSON/CSVをファイルへ
- `--from` / `--to`: シード範囲
- `--progress`: 長時間のスイープで進捗表示

### ベンチマーク

ゲーム内リザルトの参考値は `src/data/benchmark.json` に保存している。再生成:

```bash
pnpm --filter @mijime/flowdeck benchmark
# 個別に実行する場合
pnpm --filter @mijime/flowdeck sim -- --benchmark --runs 1000 --out src/data/benchmark.json
```

4/5/6人 × 10/20/30日 × 得損（0 / 0.1 / 0.2）を全員ボットで1000シード実行し、スコア分位点・星率・失敗率・完了数・期限切れ・WIP・リードタイムを保存する。

## テスト

```bash
pnpm --filter @mijime/flowdeck test
pnpm --filter @mijime/flowdeck check
```

## ゲームの長さ

「新しいゲーム」で **10 / 20 / 30日**、チーム人数、**タスクの得損（安定 / 標準 / 波乱）** を選べる。メンバーの名前・アイコン・性格は開始時にランダムで決まる。

タスクの得損は `generationSwing`（0 / 0.1 / 0.2）。波乱にすると通常タスクの要求量が 0.8〜1.2 倍になり、得なタスクと損なタスクが混ざる。既定は標準（±10%）。

デフォルトは **5人（あなた＋メンバー4）**。編成画面でメンバー3〜5人（合計4〜6人）を選べる。レーン別・チーム全体のWIP上限はなし。WIPは「見える化」の指標として表示する。

| 日数 | Backlog | 負債上限 | 星              |
| ---: | ------: | -------: | --------------- |
|   10 |       4 |        6 | 26 / 36 / 40    |
|   20 |       4 |        7 | 64 / 78 / 85    |
|   30 |       4 |        8 | 104 / 124 / 131 |

目標はランダム編成の分布基準。1星が下位25%、2星が上位25%、3星が上位10%。

### リザルトのサマリー

ゲーム終了後は、従来の「あなたの貢献」「チームの成果」に加えて以下を表示する。

- スコア内訳（企業価値 / 技術的負債 / 期限切れ罰則）と次の星までの進捗
- 日次推移（企業価値・負債・WIPのスパークライン）
- 流れ（完了・期限切れ・Review切れ・リードタイム・平均WIP・ボトルネック・レーン別期限切れ）
- リスク（ドロー・吸収率・未吸収・発生負債・上位の発生源）
- プレイ傾向（プレイ/Pull/廃棄/パス、設計/開発/テスト、支援率、プレイ/手番、LLMトークン）
- プレイヤーごとの24タイプ判定（エース型 / サポーター型 / 整理屋型など）と「24タイプの見方」
- 全員ボットの参考値（`src/data/benchmark.json`）との比較

ボードミーティングは星に近づくための処方箋を優先して表示する。

- 次の星までの点差と、負債1枚・高スコア1件・スコア3何件分かの目安
- Review期限切れ、高スコア期限切れ、WIP過多、Pull過多など星を逃す原因
- チームの役割やサポート状況は、星の処方箋が4件未満のときの補足として表示

セーブは v27。v26 の localStorage / IndexedDB セーブは読み込み時に `analytics` と日次レーンデータを補って移行する。

5人・1000シードの結果:

| 日数 | 中央値 | 星3 |
| ---: | -----: | --: |
|   10 |     31 | 11% |
|   20 |     72 | 10% |
|   30 |    116 | 11% |

- 全員が手札5枚・1日3アクション。**1アクションずつ順番に回る**
- アクションが0になるとその日の手番終了。パスすると残りを放棄し、その日はもう動けない
- 全員の手番が終わったら日末。納期トークンと期限切れを処理して次の日へ
- タスクは **テーマと比率から毎ゲーム完全自動生成**。通常42＋効果24＋インシデント6の構成。名前・スコア・報酬・納期・効果・罰則を生成し、要求合計は **価値（スコア＋報酬＋効果＋罰則）から逆算** する
- 効果タスクの混入率は約33%。効果タスクには効果の強さに応じてスコア1または2を付与する
- 高スコアタスクはスコア6〜7
- 要求合計は `価値 / 目標効率` で決める。通常0.30、高スコア0.31、効果0.29、インシデント0.34
- 効果タスク24枚のうち6枚に **LLMトークン**（5枚+1、1枚+2）が付く
- テストカードはReview専用。印刷されたlvのまま使う（レーン依存の+1はしない）
- LLMトークンは個人資源。全員が開始時に1個持ち、手番中ならアクションを消費せず任意レーンにlv1作業として置ける
- リスクカードのドロー数は「作業ピース数（カード枚数 + LLMトークン数）÷ 要求合計」の比率で0〜3枚（1/2, 3/8, 1/3）
- 山札が尽きたら、完了・期限切れのタスク捨て札をシャッフルして戻す
- インシデントは期限切れ時に罰則（全員/担当者への負債、スコア減、手札破棄、翌日アクション減）
- リスクカードは16枚を使い回す（増やさない）
- リスクカードの内訳: 追加要件+1×6 / 追加要件+2×3 / 仕様変更×3 / 想定外の好機×2 / 問題なし×2
- 追加要件は同フェーズの余剰、仕様変更は任意フェーズの余剰で吸収する。追加要件は未吸収1枚につき、仕様変更は未吸収1単位につき技術的負債+1
- 直接負債を増やすカードは廃止。負債は「リスクを吸収できなかった結果」としてのみ発生する
- セーブは localStorage と IndexedDB の両方に保存。localStorage が使えない場合は IndexedDB から復元
- ログは最新500件まで保持
- 獲得したタスク報酬カードは**獲得者の捨て札**に入る
- **企業価値はデッキに残っているタスクカードの合計**、技術的負債はデッキの負債カード枚数
- タスク報酬カードを廃棄するとスコアが0になり、負債カードを廃棄すると負債が減る
- 手札のカードは1アクションで1枚廃棄できる（レトロによる自動除去はなし）

UIのチームメイトは **3〜5人**。名前・アイコン・性格は開始時にランダムで決まる。
性格は **focus / greed / urgency** の3つの符号付きの重みで動く。
報酬は貢献ポイント最多（同点は枚数→最後）の人へ。

## チームメイト

- チーム人数は3〜5人（合計4〜6人）
- 名前・アイコン・性格は開始時にランダム
- アンカーや固定パターンはなし。各メンバーが `-1..+1` の連続値を持つ
- `focus`: +で仕上げ（プレイ）、-で着手（Pull）
- `greed`: +で得点・報酬、-で整理・品質（テスト、低レベルカードの廃棄）
- 負債カードは全メンバーが片付ける（能力の下限）。低レベルカードの廃棄だけ性格に任せる
- `urgency`: +で納期優先、-で長期・余裕優先
- アイコンは絶対値が一番大きい軸から決まり、性格表示は上位2軸の向きを出す
- タスク報酬カードは自分からは捨てない
- 全員が同じ評価式でプレイ・Pull・廃棄を比較する
- インシデントは優先的に処理する
- タスク選択は「スコア＋報酬」を要求量で割った効率も見る

## カード効果

一部のタスク報酬には効果が付く。タスク名・要求・スコア/報酬はゲーム開始時にseedから生成される。jime関連のタスクが多め。

- `自動テスト整備` / `CI 整備` / `ログ基盤` / `可観測性` / `テスト自動化`: コンテキスト+1（ドロー）
- `リファクタリング` / `リリース自動化`: 並列実行+1（追加アクション）
- `ドキュメント整備`: 技術的負債-1
- `期限交渉` / `日程バッファ`: 納期+1トークン
- `自動化` / `ペアプロ` / `ペアテスト` / `LLMエージェント導入` / `プロンプト最適化`: LLMトークン+1
- `推論基盤の増強`: LLMトークン+2
- `負債返済` / `負債圧縮`: 技術的負債-2
- `リリース凍結` / `仕様凍結`: 納期+1
- `エラーバジェット` / `ロールバック訓練`: エラーバジェット+1
- `フルスタック化`: コンテキスト+1（ドロー）
- `クロスファンクショナル`: 並列実行+1（追加アクション）

メンバーは「タスクを進め切れるか」「効果が使えるか」を評価してカードを選ぶ。各レーンに合うカードを優先する。

## タスクのばらつき

- 報酬はすべてlv2以上。高スコアタスクは設計lv2などの弱いカードになる
- スコア3タスクの報酬はlv3に統一する
- Backlog を4枚にして選択肢を増やした
- 高難度タスクの報酬を一部引き上げ、割に合わないタスクを減らした
- 効果タスクは報酬が強いため、目標効率を低めにして要求を重くする
- それでも「高スコア・弱報酬」と「低スコア・強報酬」のリスクリターンは残している
- `generationSwing` で要求量の得損を注入できる（0〜0.2、既定0.1）。0.2で通常タスクが0.8〜1.2倍

## タスク生成シミュレーション

```bash
pnpm --filter @mijime/flowdeck tasks
pnpm --filter @mijime/flowdeck tasks -- --compare
pnpm --filter @mijime/flowdeck tasks -- --policy value --seed 42
pnpm --filter @mijime/flowdeck tasks -- --swing 0.2 --runs 200
pnpm --filter @mijime/flowdeck tasks -- --policy auto --runs 500 --format json --out /tmp/tasks.json
```

`--compare` は budget / value / auto の効率分布を並べる。効率は `価値 / 要求合計` で、`> 0.45` を「安すぎ」、`< 0.25` を「高すぎ」として数える。`--swing` は 0〜0.2（既定 0.1）。`--format json` は生成プールの要約とアーキタイプ別分布を返す。

ベースは `auto`。テンプレートを使わず、テーマと比率から72枚を完全生成する。

- テーマ: LLM 45% / Agent 20% / SaaS 20% / Platform 15%
- 内訳: 通常42 / 効果24 / インシデント6
- 名前・スコア・報酬・納期・効果・罰則を毎ゲーム生成
- 1ゲーム内の72枚は名前ユニーク。200ゲームで1,731種類のタイトルが出る（テンプレートは72種類固定）

## プレイヤータイプと星の傾向

リザルトでは各プレイヤーを24タイプ + バランス型で判定する。`sim` の overview は「タイプ×星3率」と「ボードミーティング指摘×星3率」を表示する。

5人10日・1000シードの一例:

- 星3率と相性が良い: スコアハンター型 18.8% / 集中職人型 15.0% / メンター型 13.1%
- 作業量が多いが星3率が低い: エース型 4.5%
- Review期限切れの指摘があるゲーム: 星3率 5.1%（全体 11.3%）
- 高スコア期限切れの指摘があるゲーム: 星3率 3.8%
- 廃棄の指摘があるゲーム: 星3率 15.6%

ボードミーティングは、次の星までの点差、負債1枚の価値、高スコア何件分か、Review/期限切れ/WIPのどの原因を直すかを優先して表示する。

## リスク分布

```bash
pnpm --filter @mijime/flowdeck sim -- --risks --runs 1000
```

リスクカードごとに「引かれた回数 / 吸収 / 未吸収 / 発生した負債」を集計する。`risk debt/game` はリスク由来で発生した負債、`final team debt/game` はゲーム終了時に残っている負債。

2026-10 時点の5人10日・1000シード:

- リスク由来の負債: 10.74/ゲーム
- 最終的な技術的負債: 3.10/ゲーム（途中で廃棄・除去される）
- 主な発生源: 追加要件+2（各1.4/ゲーム、未吸収率 78〜81%）、追加要件+1（各1.6〜1.7/ゲーム、未吸収率 45〜49%）
- 仕様変更+1は吸収されやすく、負債は0.53/ゲーム

## ルールセット

ルールは `src/engine/rules/` に集約している。

- `effects/`: カード効果。1効果 = 1プラグイン（`apply` / `aiValue` / `label` / `describe`）
- `penalties/`: 期限切れ罰則
- `risks/`: リスクカードの解決
- `generation.ts`: タスク生成ポリシーの型。実装は `data/autoGenerate.ts`
- `tips.ts`: ボードミーティングの指摘
- `balance.ts`: アクション数・手札・星閾値・リスクドロー比率
- `index.ts`: `BASE_RULES` と `RULE_SETS`

`createGame` / `reduce` / `playBotRound` は `RuleSet` を注入できる。現在のルールセットは `base` のみ。

- `base`: 完全自動生成・代用なし・開始トークン1個

```bash
pnpm --filter @mijime/flowdeck sim -- --runs 1000
```

詳細は `src/engine/rules/README.md`。
