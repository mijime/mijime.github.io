---
Tags: ["development", "react"]
CreatedAt: "2017-04-09T22:40:10+09:00"
IsDraft: false
Title: "ReactでMarkdownEditorを作ったかんそう"
---

オフラインで動作する Markdown エディタを React で作った際の技術選定メモ。

リポジトリ: https://github.com/mijime/markdown-editor

## 採用したもの

### Rehype / Remark

- https://github.com/wooorm/rehype
- https://github.com/wooorm/remark

HTML や Markdown を AST に変換するライブラリ。

`marked` は文字列で HTML を返すため `dangerouslySetInnerHTML` を使わざるを得ない。Rehype/Remark で AST に変換してから React コンポーネントにするアプローチなら避けられる。

`remark-react` ではなく `markdown -> html -> react` の流れにしたのは、highlight 系ライブラリとの統合がしやすく、絵文字対応も簡単だったため。

単純な表示用途なら `marked` の方が軽量なので用途次第。

### Prism.js

- http://prismjs.com/

`highlight.js` は minify 時に一部言語で問題が発生したため代替として採用。プロセッサが分離されているので rehype にそのまま流せる。プラッガブルで軽量。

### Preact

- https://preactjs.com/

`ReactDOM + React` が 500+ KB に対し、`Preact + Preact-compat` は約 35 KB。React-Redux はそのまま動作した。Jest や StyleGuidist が React を要求するため、webpack のビルド時のみ差し替える運用にした。

### milligram

- https://milligram.github.io/

Markdown プレビューの CSS として採用。github.css より軽量でシンプルな表示に向いている。UI が複雑になる場合は Material 系の方が良い。

## 見送ったもの

- highlight.js — minify 時に一部言語のコードが壊れる問題のため不採用
- CodeMirror — バンドルサイズが大きいため不採用

## 気づき

- `React.setState` を使わず pure component で構成しようとしたが、コンポーネント内で完結する非同期描画は state の方が切り出しやすかった
- Flow は `commonjs` スタイルを読み取れない点と、他ライブラリの `*.flow` ファイルに反応する点が問題だった
