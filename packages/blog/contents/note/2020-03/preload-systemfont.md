---
Title: 'webフォントを読み込んでいる間にシステムフォントを表示する'
IsDraft: false
CreatedAt: '2020-03-29T07:55:11.608Z'
---

Web フォントの読み込み完了まで何も表示されない（FOIT）を避けるには、`@font-face` に `font-display: swap` を指定する。これによりフォント読み込み中はシステムフォントで表示し、読み込み完了後に切り替わる。

<!--more-->

```css
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
}
```

参考: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/font-display
