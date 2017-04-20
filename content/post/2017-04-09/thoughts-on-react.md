+++
Tags = ["Development","React"]

date = "2017-04-09T22:40:10+09:00"

draft = false

title = "ReactでMarkdownEditorを作ったかんそう"
+++

## 作ったもの

https://github.com/mijime/markdown-editor

ダウンロードすればオフラインでも使えるマークダウンエディタを作りたかった

---

## 使ってよかったもの

## Rehype, Remark

- https://github.com/wooorm/rehype
- https://github.com/wooorm/remark

HTMLやMarkdownをASTに変換してくれる。

MarkedがStringを既にがっちゃんこ状態で投げてくるので
dangerouslySetInnerHTMLを使わざるえない影響が出てくる。

そういうときは上のRehype, RemarkでASTに変換してからReactコンポーネントにするアプローチが良さげ。

react-markdownていうのもあったけどcommonmarkに準拠してるらしく、テーブルの変換ができなかったので諦めた。
あとcommonmarkが割と容量食ってたのもある。

remark-reactを使わなかったのはhighlight系のライブラリをかます必要があったのと
markdown -> html -> reactの流れのほうが拡張しやすく感じた。
絵文字対応もさくっといけたし。

なんかやるとき、もしくはデンジャラスなコードを強要されたときはまた使ってみたい。

ただ、 markedの方が軽量ではあったので、1回きりの表示ならmarkedのほうが断然良さそう。

## Prism.js

- http://prismjs.com/

highlight.jsをMinifyすると中身が飛びでて辛いときに使ったやつ。

プロセッサも分かれてるのでそのままrehypeに流せた。

プラッガブルでなかなかに軽量なので、おすすめしていきたい。

## Preact

- https://preactjs.com/

Reactがでかすぎたので使って見た。 webpack-bundle-size-anlyzerで見る限りだと
ReactDOM + Reactが500+kbなのに対し、 Preact + Preact-compatが35kb前後？　良い。

React-Reduxは普通に使えたので、 問題はなかった。  React-helmetとかReact-router周りはまだ試していない。
ただ、Preact-helmetやPreact-routerとかあるし、なんだかんだでまた使えそう。

dio.jsとかも同様も簡単に乗り換えれるか試したけど、 Preact-compatはだいぶ頑張っているのが分かっただけだった。

JestやStyleGuidistなんかがReactを強要するので、 Webpackでビルド時のみ差し替える運用にした。

## milligram

- https://milligram.github.io/

マークダウンプレビューとしては綺麗に表示できるので、
みんなGithub.cssから乗り換えるべきだと思う。軽量ですし。

ただ、シンプルなコンポーネントしかないので
UIが複雑になってきたならMaterialなんちゃら系の方が良さそう、とは思う

---

## 見送ったもの

## highlight.js

みんな言語絞って使ってるくさい。最初、何度圧縮してもクソでかくて不思議だった。
言語によっては圧縮時に飛び出る。 と思ったけどbrowserify使った時は問題なさそう。. だった？

使うのやめた。

## CodeMirror

重量がなかなかあったので、採用を見送った。 vim mode試したかった。

もっと軽量なエディタがあれば選択肢に入れたかったので、あとで探す。

---

## React.setState

ReactのsetStateは使わずにpure componentだけで構成したかったけど、
非同期に描画してコンポーネント内だけで完結するなら、 stateを使って書いた方が切り出しやすかった。

## Flow

今回は頑張ってFlowtypeに立ち向かってみた。 Flow-jsdocでJSDocと同期をとりつつ、みたいなことを実現したかったが、
type周りが対応してなかったので結局flow-commentをちりばめながら書くはめになった。

あと、flowさんってcommonjsスタイル読み取ってくれないのが一番のショックだった。
他のライブラリの *.flowにビンビン反応していくのもちょいちょい辛い。
