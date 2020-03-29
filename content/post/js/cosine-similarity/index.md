---
Date: '2016-05-28T21:12:36+09:00'
Draft: false
Title: '関連記事を探す'
Tags: ['Development', 'JavaScript']
---

他のブログを参考にすると関連記事というのを最後に表示しているらしい。

まだ記事の数は少ないけど、ある程度近い記事を探すことができるようにする。

### 類似度の取得

"MeCab" + "類似" でググったら、コサイン類似度なるものがあるとのこと。

- [コサイン類似度](http://www.cse.kyoto-su.ac.jp/~g0846020/keywords/cosinSimilarity.html)
- [TF-IDF Cos 類似度推定法](http://qiita.com/nmbakfm/items/6bb91b89571dd68fcea6)

このブログは js + hugo で書いているので、
[kuromoji](https://www.npmjs.com/package/kuromoji) のラッパー
[kuromojin](https://www.npmjs.com/package/kuromojin) を使って形態素解析する。

### コード解説

[コード全体](https://github.com/mijime/mijime.github.io/blob/content/source/js/similarity/index.js)

テキストを分解して、 単語と出現回数を記録する。

```javascript
async function parseVector(text) {
  const tokens = await tokenize(text)
  return tokens.reduce((acc, next) => {
    if (!isTargetToken(next)) {
      return acc
    }

    if (acc[next.surface_form]) {
      acc[next.surface_form]++
    } else {
      acc[next.surface_form] = 1
    }

    return acc
  }, {})
}
```

出現回数を数えるのは名詞で 3 文字以上の単語のみ。

```javascript
function isTargetToken(token) {
  return (
    token.pos === '名詞' &&
    token.surface_form.length >= 3 &&
    (token.basic_form !== '*' || token.surface_form.match(/^[\wA-Z]+$/))
  )
}
```

あとは計算しておしまい。

```javascript
function cosineSimilarity(curr, next) {
  const currKeys = Object.keys(curr)
  const nextKeys = Object.keys(next)
  const keys = currKeys
    .concat(nextKeys)
    .filter((v, i, self) => self.indexOf(v) === i)

  const baseScore = keys
    .map(k => (curr[k] || 0) * (next[k] || 0))
    .reduce((acc, c) => acc + c, 0)

  const currScore = keys
    .map(k => (curr[k] ? Math.pow(curr[k], 2) : 0))
    .reduce((acc, c) => acc + c, 0)

  const nextScore = keys
    .map(k => (next[k] ? Math.pow(next[k], 2) : 0))
    .reduce((acc, c) => acc + c, 0)

  const score = baseScore
    ? baseScore / (Math.sqrt(currScore) * Math.sqrt(nextScore))
    : 0
  const words = keys.filter(k => curr[k] && next[k])
  return { score, words }
}
```

### 実行結果

うーん、全然関係ない単語でしか一致しない、、、その通りではあるんだけど

```
babel-node source/js/similarity "content/posts/js/cosine-similarity.md" "content"

25.26%  content\posts\2016-05-23\github-cli.md  com, https, mijime, github
0%      content\posts\2016-05-26\border-implement.md
0%      content\posts\2016-05-26\ci-is-difficult.md
0%      content\posts\blog\first-blogged.md
0%      content\posts\hugo\code-mermaid.md
20.9%   content\posts\hugo\hugo-deploy.md       branch, content
100%    content\posts\js\cosine-similarity.md   100, 2016, 89571, MeCab, コサイン
9.93%   content\posts\blog\blog-of-policy.md    branch, posts, slides
1.98%   content\posts\hugo\hugo-pagination.md   html, pagination
3.52%   content\slides\2016-05-27\my-first-slide.md     html
```
