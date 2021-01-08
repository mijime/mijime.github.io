---
Tags: ['Development', 'React']
CreatedAt: '2017-04-09T22:40:10+09:00'
Draft: false
Title: 'ReactでMarkdownEditorを作ったかんそう'
---

## 作ったもの

https://github.com/mijime/markdown-editor

ダウンロードすればオフラインでも使えるマークダウンエディタを作りたかった

---

## 使ってよかったもの

## Rehype, Remark

- https://github.com/wooorm/rehype
- https://github.com/wooorm/remark

HTML や Markdown を AST に変換してくれる。

Marked が String を既にがっちゃんこ状態で投げてくるので
dangerouslySetInnerHTML を使わざるえない影響が出てくる。

そういうときは上の Rehype, Remark で AST に変換してから React コンポーネントにするアプローチが良さげ。

react-markdown ていうのもあったけど commonmark に準拠してるらしく、テーブルの変換ができなかったので諦めた。
あと commonmark が割と容量食ってたのもある。

remark-react を使わなかったのは highlight 系のライブラリをかます必要があったのと
markdown -> html -> react の流れのほうが拡張しやすく感じた。
絵文字対応もさくっといけたし。

なんかやるとき、もしくはデンジャラスなコードを強要されたときはまた使ってみたい。

ただ、 marked の方が軽量ではあったので、1 回きりの表示なら marked のほうが断然良さそう。

## Prism.js

- http://prismjs.com/

highlight.js を Minify すると中身が飛びでて辛いときに使ったやつ。

プロセッサも分かれてるのでそのまま rehype に流せた。

プラッガブルでなかなかに軽量なので、おすすめしていきたい。

## Preact

- https://preactjs.com/

React がでかすぎたので使って見た。

webpack-bundle-size-anlyzer をつかってサイズを比較した。

ReactDOM + React が 500+kb なのに対し、 Preact + Preact-compat が 35kb 前後？良い。

React-Redux は普通に使えたので、 問題はなかった。 React-helmet とか React-router 周りはまだ試していない。
ただ、Preact-helmet や Preact-router とかあるし、なんだかんだでまた使えそう。

dio.js とかも同様も簡単に乗り換えられるか試したけど、 Preact-compat はだいぶ頑張っているのが分かっただけだった。

Jest や StyleGuidist なんかが React を強要するので、 Webpack でビルド時のみ差し替える運用にした。

## milligram

- https://milligram.github.io/

マークダウンプレビューとしては綺麗に表示できるので、
みんな Github.css から乗り換えるべきだと思う。軽量ですし。

ただ、シンプルなコンポーネントしかないので
UI が複雑になってきたなら Material なんちゃら系の方が良さそう、とは思う

---

## 見送ったもの

## highlight.js

みんな言語絞って使ってるくさい。最初、何度圧縮してもクソでかくて不思議だった。
言語によっては圧縮時に飛び出る。 と思ったけど browserify 使った時は問題なさそう。. だった？

使うのやめた。

## CodeMirror

重量がなかなかあったので、採用を見送った。 vim mode 試したかった。

もっと軽量なエディタがあれば選択肢に入れたかったので、あとで探す。

---

## React.setState

React の setState は使わずに pure component だけで構成したかったので。

非同期に描画してコンポーネント内だけで完結するなら、 state を使って書いた方が切り出しやすかった。

## Flow

今回は頑張って Flowtype に立ち向かってみた。 Flow-jsdoc で JSDoc と同期をとりつつ、みたいなことを実現したかったが、
type 周りが対応してなかったので結局 flow-comment をちりばめながら書くはめになった。

あと、flow さんって commonjs スタイル読み取ってくれないのが一番のショックだった。
その他にも、他のライブラリの \*.flow にビンビン反応していくのもちょいちょい辛い。
