---
CreatedAt: "2026-04-30T00:00:00+09:00"
IsDraft: false
Title: "Next.js から Astro へのブログ移行"
Description: "長年 Next.js で運用していた個人ブログを Astro に移行した記録。ディレクトリ構成の変更・カスタム Integration・DuckDB 検索まで。"
Tags: ["astro", "nextjs", "blog", "migration"]
---

個人ブログを Next.js から Astro に移行した。

<!--more-->

## 背景

もともと Next.js (Pages Router) でブログを運用していたが、静的サイトとしての要件しかないのに SSR 向けのフレームワークを使う必要がなくなってきた。Astro はコンテンツ重視のサイトに特化しており、デフォルトで JS ゼロ出力・Island Architecture に対応しているため移行先として選んだ。

## 移行内容

### ディレクトリ構成の変更

旧構成では `contents/{yyyy}/{mm}/{slug}/index.md` というネストしたパスだった。Astro の Content Collections に合わせて `contents/{category}/{yyyy-mm}/{slug}.md` に変更した。

カテゴリは記事の性質に合わせて分類:

```
contents/
├── tech/      # 技術メモ
├── note/      # 短メモ
└── til/       # Today I Learned
```

### monorepo 構成

`packages/blog` にブログのロジック・コンポーネント・Astro ページを集約し、`apps/main` がそれを利用する構成にした。

```
packages/blog/   ← コンポーネント・Integration・ページ定義
apps/main/       ← エントリポイント。@mijime/blog を import
```

`blogIntegration()` を Astro Integration として実装し、`apps/main/astro.config.mjs` から呼ぶだけでルート・CSS が注入される。

```ts
// apps/main/astro.config.mjs
import { blogIntegration } from "@mijime/blog/integration";

export default defineConfig({
  integrations: [blogIntegration({ globalCss: "/src/styles/global.css" })],
});
```

### 全文検索に DuckDB WASM を使用

Astro ビルド時に `generateBlogParquet()` で記事を Parquet ファイルに変換して `public/` に配置する。検索ページでは DuckDB WASM を使ってブラウザ上で Parquet をクエリし、形態素解析 (lindera-js) でトークナイズした検索を実現している。

```ts
// build hook
"astro:build:start": async () => {
  await generateBlogParquet(join(process.cwd(), "public"));
},
```

サーバーサイド不要の静的サイトのままフルテキスト検索が動く。

### CI/CD

GitHub Actions で GitHub Pages へデプロイ。旧 Next.js 時代の Docker ファイル・複数 workflow を整理して単一の `deploy.yaml` にまとめた。

## まとめ

- Next.js Pages Router → Astro Content Collections
- `contents/` のパス構造をカテゴリベースに再整理
- monorepo で `packages/blog` を独立パッケージ化
- DuckDB WASM による静的全文検索
- ビルド・デプロイが単純化された

Astro の Island Architecture により必要な部分 (検索フォーム) だけ React を使い、それ以外は JS なしで配信できるのがよかった。
