---
CreatedAt: '2016-05-28T21:12:36+09:00'
IsDraft: false
Title: '関連記事を探す'
Tags: ['Development', 'JavaScript']
---

ブログの関連記事機能を JavaScript + Hugo で実装した際のメモ。kuromoji で形態素解析し、コサイン類似度で類似記事を探す。

## 実装方針

- [kuromojin](https://www.npmjs.com/package/kuromojin)（[kuromoji](https://www.npmjs.com/package/kuromoji) のラッパー）で形態素解析
- 名詞かつ3文字以上の単語のみを対象に単語ベクトルを生成
- コサイン類似度で記事間の類似度を計算

参考:
- [コサイン類似度](http://www.cse.kyoto-su.ac.jp/~g0846020/keywords/cosinSimilarity.html)
- [TF-IDF Cos 類似度推定法](http://qiita.com/nmbakfm/items/6bb91b89571dd68fcea6)

## コード

テキストを単語ベクトルに変換する:

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

function isTargetToken(token) {
  return (
    token.pos === '名詞' &&
    token.surface_form.length >= 3 &&
    (token.basic_form !== '*' || token.surface_form.match(/^[\wA-Z]+$/))
  )
}
```

コサイン類似度の計算:

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

## 結果

URL や一般的な単語（`com`, `https`, `github`）での一致が多く、記事の内容的な類似度にはなりにくい。TF-IDF で重み付けするか、対象語を絞り込む必要がある。
